import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface ScrollArgs {
  sessionId: string;
  target?: 'top' | 'bottom' | 'element';
  selector?: string;
  x?: number;
  y?: number;
  smooth?: boolean;
}

export async function handleScroll(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { 
    sessionId, 
    target = 'bottom', 
    selector, 
    x, 
    y, 
    smooth = true 
  } = args as ScrollArgs;

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
    const result = await session.page.evaluate(
      ({ target, selector, x, y, smooth }): any => {
        const behavior = smooth ? 'smooth' : 'auto';

        if (target === 'top') {
          // @ts-ignore
          window.scrollTo({ top: 0, left: 0, behavior });
          return { scrolled: true, target: 'top' };
        } else if (target === 'bottom') {
          // @ts-ignore
          window.scrollTo({ 
            // @ts-ignore
            top: document.body.scrollHeight, 
            left: 0, 
            behavior 
          });
          return { scrolled: true, target: 'bottom' };
        } else if (target === 'element' && selector) {
          // @ts-ignore
          const element = document.querySelector(selector);
          if (!element) {
            return { error: 'Element not found', selector };
          }
          element.scrollIntoView({ behavior, block: 'center' });
          return { scrolled: true, target: 'element', selector };
        } else if (x !== undefined || y !== undefined) {
          // @ts-ignore
          window.scrollTo({ 
            // @ts-ignore
            top: y !== undefined ? y : window.scrollY, 
            // @ts-ignore
            left: x !== undefined ? x : window.scrollX, 
            behavior 
          });
          return { scrolled: true, target: 'position', x, y };
        }

        return { error: 'Invalid scroll parameters' };
      },
      { target, selector, x, y, smooth }
    );

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'SCROLL_FAILED',
              message: result.error,
              details: result,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    // Wait a bit for scroll to complete
    await session.page.waitForTimeout(smooth ? 500 : 100);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'SCROLL_FAILED',
            message: error.message || 'Failed to scroll',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
