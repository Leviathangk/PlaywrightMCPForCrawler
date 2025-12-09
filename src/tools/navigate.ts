import { SessionManager, ErrorResponse } from '../session-manager.js';
import { createNavigationFailedError } from '../errors.js';

/**
 * Handle navigate tool call
 */
export async function handleNavigate(sessionManager: SessionManager, args: any): Promise<any> {
  const { sessionId, url, waitUntil = 'load', timeout } = args;

  if (!sessionId || !url) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INVALID_PARAMETERS',
            message: 'sessionId and url are required',
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }

  // Validate session
  const validation = sessionManager.validateSession(sessionId);
  if (!validation.valid) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(validation.error),
        },
      ],
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
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }

  try {
    const options: any = { waitUntil };
    if (timeout) {
      options.timeout = timeout;
    }

    const response = await session.page.goto(url, options);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            title: await session.page.title(),
            url: session.page.url(),
            status: response?.status() || 0,
          }),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(createNavigationFailedError(sessionId, url, error.message)),
        },
      ],
      isError: true,
    };
  }
}
