import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface WaitForElementArgs {
  sessionId: string;
  selector: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

export async function handleWaitForElement(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, selector, timeout = 30000, state = 'visible' } = args as WaitForElementArgs;

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
    // Wait for element
    await session.page.waitForSelector(selector, {
      timeout,
      state,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            selector,
            message: `Element found: ${selector}`,
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
            errorCode: 'WAIT_FOR_ELEMENT_TIMEOUT',
            message: `Timeout waiting for element: ${selector}`,
            sessionId,
            timeout,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
