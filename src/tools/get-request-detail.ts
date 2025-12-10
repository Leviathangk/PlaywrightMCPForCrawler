import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetRequestDetailArgs {
  sessionId: string;
  requestId: string;
}

export async function handleGetRequestDetail(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, requestId } = args as GetRequestDetailArgs;

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
    const requests = session.networkCapture.getRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'REQUEST_NOT_FOUND',
              message: `Request not found: ${requestId}`,
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    // Generate curl command
    const curl = session.networkCapture.toCurl(request);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...request,
            curl,
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
            errorCode: 'GET_REQUEST_DETAIL_FAILED',
            message: error.message || 'Failed to get request detail',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
