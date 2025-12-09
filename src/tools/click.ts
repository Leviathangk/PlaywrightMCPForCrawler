import { SessionManager, ErrorResponse } from '../session-manager.js';
import { createElementNotFoundError, createElementNotClickableError } from '../errors.js';

/**
 * Handle click tool call
 */
export async function handleClick(sessionManager: SessionManager, args: any): Promise<any> {
  const { sessionId, selector, timeout, force, clickCount = 1 } = args;

  if (!sessionId || !selector) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INVALID_PARAMETERS',
            message: 'sessionId and selector are required',
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
    const options: any = { clickCount };
    if (timeout) {
      options.timeout = timeout;
    }
    if (force !== undefined) {
      options.force = force;
    }

    await session.page.click(selector, options);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Click successful',
          }),
        },
      ],
    };
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('not visible')) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(createElementNotFoundError(sessionId, selector)),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(createElementNotClickableError(sessionId, selector, error.message)),
        },
      ],
      isError: true,
    };
  }
}
