import { SessionManager, ErrorResponse } from './session-manager.js';
import {
  createNavigationFailedError,
  createElementNotFoundError,
  createElementNotClickableError,
  createElementNotEditableError,
} from './errors.js';

/**
 * Handle create_session tool call
 */
export async function handleCreateSession(sessionManager: SessionManager): Promise<any> {
  try {
    const result = await sessionManager.createSession();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: result.sessionId,
            expiresAt: result.expiresAt,
            message: 'Session created successfully',
          }),
        },
      ],
    };
  } catch (error: any) {
    if (error.errorCode) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(error as ErrorResponse),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}

/**
 * Handle close_session tool call
 */
export async function handleCloseSession(sessionManager: SessionManager, args: any): Promise<any> {
  const { sessionId } = args;

  if (!sessionId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INVALID_PARAMETERS',
            message: 'sessionId is required',
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }

  try {
    await sessionManager.closeSession(sessionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Session closed successfully',
          }),
        },
      ],
    };
  } catch (error: any) {
    if (error.errorCode) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(error as ErrorResponse),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}

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
    // Clear input if requested
    if (clear) {
      await session.page.fill(selector, '', { timeout });
    }

    // Type text
    const options: any = {};
    if (delay) {
      options.delay = delay;
    }
    if (timeout) {
      options.timeout = timeout;
    }

    await session.page.type(selector, text, options);

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
