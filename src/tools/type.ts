import { SessionManager, ErrorResponse } from '../session-manager.js';
import { createElementNotFoundError, createElementNotEditableError } from '../errors.js';

/**
 * Handle type tool call
 */
export async function handleType(sessionManager: SessionManager, args: any): Promise<any> {
  const { sessionId, selector, text, delay, timeout, clear = false } = args;

  if (!sessionId || !selector || text === undefined) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INVALID_PARAMETERS',
            message: 'sessionId, selector, and text are required',
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
    // Build options
    const options: any = {};
    if (timeout) {
      options.timeout = timeout;
    }

    // Clear input if requested
    if (clear) {
      await session.page.fill(selector, '', options);
    }

    // Type text using fill (recommended over deprecated type method)
    if (delay) {
      // If delay is specified, use pressSequentially for character-by-character typing
      await session.page.locator(selector).pressSequentially(text, { delay, timeout });
    } else {
      // Otherwise use fill for faster input
      await session.page.fill(selector, text, options);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Type successful',
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
          text: JSON.stringify(createElementNotEditableError(sessionId, selector)),
        },
      ],
      isError: true,
    };
  }
}
