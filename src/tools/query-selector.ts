import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface QuerySelectorArgs {
  sessionId: string;
  selector: string;
  multiple?: boolean;
  includeAttributes?: boolean;
}

export async function handleQuerySelector(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, selector, multiple = false, includeAttributes = true } = args as QuerySelectorArgs;

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
      ({ selector, multiple, includeAttributes }): any => {
        function isVisible(element: any): boolean {
          // @ts-ignore
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          );
        }

        function extractElementInfo(element: any): any {
          const rect = element.getBoundingClientRect();
          const info: any = {
            tag: element.tagName.toLowerCase(),
            text: (element.innerText || element.textContent || '').trim().substring(0, 200),
            visible: isVisible(element),
            position: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };

          if (includeAttributes) {
            const attrs: Record<string, string> = {};
            for (const attr of element.attributes) {
              attrs[attr.name] = attr.value;
            }
            if (Object.keys(attrs).length > 0) {
              info.attributes = attrs;
            }
          }

          return info;
        }

        try {
          if (multiple) {
            // @ts-ignore
            const elements = document.querySelectorAll(selector);
            const results = Array.from(elements).map(extractElementInfo);
            return {
              found: results.length > 0,
              count: results.length,
              elements: results,
            };
          } else {
            // @ts-ignore
            const element = document.querySelector(selector);
            if (!element) {
              return { found: false };
            }
            return {
              found: true,
              element: extractElementInfo(element),
            };
          }
        } catch (error: any) {
          return {
            error: 'Invalid selector',
            message: error.message,
          };
        }
      },
      { selector, multiple, includeAttributes }
    );

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'INVALID_SELECTOR',
              message: result.message || result.error,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

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
            errorCode: 'QUERY_SELECTOR_FAILED',
            message: error.message || 'Failed to query selector',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
