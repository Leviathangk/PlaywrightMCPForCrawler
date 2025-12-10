import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface FindElementByTextArgs {
  sessionId: string;
  text: string;
  exact?: boolean;
  elementType?: 'link' | 'button' | 'any';
}

export async function handleFindElementByText(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, text, exact = false, elementType = 'any' } = args as FindElementByTextArgs;

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
    // Find element by text
    const result = await session.page.evaluate(
      ({ searchText, exact, elementType }): any => {
        function isVisible(element: any): boolean {
          // @ts-ignore - browser context
          const style = window.getComputedStyle(element);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          );
        }

        function getSelector(element: any): string {
          if (element.id) {
            return `#${element.id}`;
          }

          const classes = Array.from(element.classList).filter((c: any) => c && !c.startsWith('_'));
          if (classes.length > 0) {
            return `.${classes.join('.')}`;
          }

          const tag = element.tagName.toLowerCase();
          const parent = element.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (el: any) => el.tagName.toLowerCase() === tag
            );
            const index = siblings.indexOf(element) + 1;
            return `${tag}:nth-child(${index})`;
          }

          return tag;
        }

        function matchesText(element: any, searchText: string, exact: boolean): boolean {
          const el = element;
          const text = el.innerText || el.textContent || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const title = el.getAttribute('title') || '';
          const placeholder = el.getAttribute('placeholder') || '';

          const allText = `${text} ${ariaLabel} ${title} ${placeholder}`.toLowerCase();
          const search = searchText.toLowerCase();

          return exact ? allText === search : allText.includes(search);
        }

        // Define selectors based on element type
        let selectors: string[];
        if (elementType === 'link') {
          selectors = ['a', '[role="link"]'];
        } else if (elementType === 'button') {
          selectors = ['button', '[role="button"]', 'input[type="button"]', 'input[type="submit"]'];
        } else {
          selectors = ['a', 'button', 'input', 'select', 'textarea', '[role="button"]', '[role="link"]', '[onclick]'];
        }

        // Search for matching elements
        const matches: any[] = [];
        for (const selector of selectors) {
          // @ts-ignore - browser context
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            if (matchesText(element, searchText, exact)) {
              const visible = isVisible(element);
              matches.push({
                selector: getSelector(element),
                text: element.innerText?.trim().substring(0, 100) || '',
                tag: element.tagName.toLowerCase(),
                visible,
                clickable: true,
              });
            }
          }
        }

        // Sort by visibility (visible first)
        matches.sort((a, b) => (b.visible ? 1 : 0) - (a.visible ? 1 : 0));

        return matches.length > 0 ? matches[0] : null;
      },
      { searchText: text, exact, elementType }
    );

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              found: false,
              message: `No element found with text: ${text}`,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            found: true,
            ...result,
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
            errorCode: 'FIND_ELEMENT_FAILED',
            message: error.message || 'Failed to find element',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
