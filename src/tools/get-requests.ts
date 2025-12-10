import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetRequestsArgs {
  sessionId: string;
  filter?: {
    method?: string;
    urlContains?: string;
    resourceType?: string;
    statusCode?: number;
  };
  limit?: number;
}

export async function handleGetRequests(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, filter, limit = 50 } = args as GetRequestsArgs;

  // Validate session
  const validation = sessionManager.validateSession(sessionId);
  if (!validation.valid) {
    return {
      content: [{ type: 'text', text: JSON.stringify(validation.error) }],
      isError: true,
    };
  }

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'SESSION_NOT_FOUND',
            message: `Session not found: ${sessionId}`,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }

  try {
    let requests = session.networkCapture.getRequests();

    // Apply filters
    if (filter) {
      requests = requests.filter(req => {
        if (filter.method && req.method !== filter.method) return false;
        if (filter.urlContains && !req.url.includes(filter.urlContains)) return false;
        if (filter.resourceType && req.resourceType !== filter.resourceType) return false;
        if (filter.statusCode && req.response?.status !== filter.statusCode) return false;
        return true;
      });
    }

    // Limit results
    const limitedRequests = requests.slice(-limit); // Get most recent

    // Format results
    const results = limitedRequests.map(req => ({
      id: req.id,
      timestamp: req.timestamp,
      url: req.url,
      method: req.method,
      resourceType: req.resourceType,
      status: req.response?.status,
      statusText: req.response?.statusText,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: requests.length,
            returned: results.length,
            requests: results,
          }),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'GET_REQUESTS_FAILED',
            message: error.message || 'Failed to get requests',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
