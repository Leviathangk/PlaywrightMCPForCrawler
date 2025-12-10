import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface SearchRequestsArgs {
  sessionId: string;
  keyword: string;
  searchIn?: ('url' | 'request' | 'response')[];
  isRegex?: boolean;
  limit?: number;
}

export async function handleSearchRequests(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, keyword, searchIn = ['url', 'response'], isRegex = false, limit = 10 } = args as SearchRequestsArgs;

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
    // Search requests
    const allMatches = session.networkCapture.searchRequests(keyword, searchIn, isRegex);
    const matches = allMatches.slice(0, limit);

    // Format results
    const results = matches.map(req => {
      // Find matched text snippet
      let matchedIn = '';
      let matchedText = '';

      if (searchIn.includes('url') && req.url.toLowerCase().includes(keyword.toLowerCase())) {
        matchedIn = 'url';
        matchedText = req.url;
      } else if (searchIn.includes('response') && req.response?.body) {
        matchedIn = 'response';
        // Extract snippet around match
        const body = req.response.body;
        const index = body.toLowerCase().indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(body.length, index + keyword.length + 50);
          matchedText = '...' + body.substring(start, end) + '...';
        }
      } else if (searchIn.includes('request') && req.request.postData) {
        matchedIn = 'request';
        const postData = req.request.postData;
        const index = postData.toLowerCase().indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const start = Math.max(0, index - 50);
          const end = Math.min(postData.length, index + keyword.length + 50);
          matchedText = '...' + postData.substring(start, end) + '...';
        }
      }

      return {
        id: req.id,
        url: req.url,
        method: req.method,
        resourceType: req.resourceType,
        matchedIn,
        matchedText,
        curl: session.networkCapture.toCurl(req),
        request: req.request,
        response: req.response,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: allMatches.length,
            returned: results.length,
            matches: results,
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
            errorCode: 'SEARCH_FAILED',
            message: error.message || 'Failed to search requests',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
