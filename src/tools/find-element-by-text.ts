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
          function isUnique(el: any, selector: string): boolean {
            try {
              // @ts-ignore - browser context
              const matches = document.querySelectorAll(selector);
              return matches.length === 1 && matches[0] === el;
            } catch {
              return false;
            }
          }

          function getNodeSelector(node: any): string {
            const tag = node.tagName.toLowerCase();
            const classes = Array.from(node.classList).filter((c: any) => c && !c.startsWith('_'));
            
            if (classes.length > 0) {
              const classSelector = `.${classes.join('.')}`;
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children).filter(
                  (el: any) => {
                    const elClasses = Array.from(el.classList).filter((c: any) => c && !c.startsWith('_'));
                    return elClasses.length > 0 && elClasses.join('.') === classes.join('.');
                  }
                );
                if (siblings.length === 1) {
                  return `${tag}${classSelector}`;
                } else {
                  const index = siblings.indexOf(node) + 1;
                  return `${tag}${classSelector}:nth-of-type(${index})`;
                }
              }
              return `${tag}${classSelector}`;
            } else {
              const parent = node.parentElement;
              if (parent) {
                const siblings = Array.from(parent.children);
                const index = siblings.indexOf(node) + 1;
                return `${tag}:nth-child(${index})`;
              }
              return tag;
            }
          }

          function buildPathFrom(ancestor: any, target: any, maxLevels: number = 5): string {
            const path: string[] = [];
            let current = target;
            let levels = 0;
            
            while (current && current !== ancestor && levels < maxLevels) {
              path.unshift(getNodeSelector(current));
              current = current.parentElement;
              levels++;
            }
            
            // Add ancestor selector
            if (ancestor.id) {
              path.unshift(`#${ancestor.id}`);
            } else if (ancestor.classList && ancestor.classList.length > 0) {
              const classes = Array.from(ancestor.classList).filter((c: any) => c && !c.startsWith('_'));
              if (classes.length > 0) {
                path.unshift(`${ancestor.tagName.toLowerCase()}.${classes.join('.')}`);
              }
            }
            
            return path.join(' > ');
          }

          // 1. If element has ID, return it directly
          if (element.id) {
            return `#${element.id}`;
          }

          // 2. Try using only classes if unique
          const classes = Array.from(element.classList).filter((c: any) => c && !c.startsWith('_'));
          if (classes.length > 0) {
            const tag = element.tagName.toLowerCase();
            const classSelector = `${tag}.${classes.join('.')}`;
            if (isUnique(element, classSelector)) {
              return classSelector;
            }
          }

          // 3. Find unique ancestor (max 10 levels up)
          let ancestor = element.parentElement;
          let depth = 0;
          const maxAncestorDepth = 10;
          
          while (ancestor && depth < maxAncestorDepth) {
            // If ancestor has ID, build path from here
            if (ancestor.id) {
              return buildPathFrom(ancestor, element);
            }
            
            // If ancestor has unique class combination
            const ancestorClasses = Array.from(ancestor.classList).filter((c: any) => c && !c.startsWith('_'));
            if (ancestorClasses.length > 0) {
              const ancestorTag = ancestor.tagName.toLowerCase();
              const ancestorSelector = `${ancestorTag}.${ancestorClasses.join('.')}`;
              if (isUnique(ancestor, ancestorSelector)) {
                return buildPathFrom(ancestor, element);
              }
            }
            
            ancestor = ancestor.parentElement;
            depth++;
          }

          // 4. Fallback: build path from body with max 5 levels
          // @ts-ignore - browser context
          return buildPathFrom(document.body, element, 5);
        }

        function getDirectText(element: any): string {
          // Get only direct text content (not from children)
          let text = '';
          for (const node of element.childNodes) {
            if (node.nodeType === 3) { // TEXT_NODE
              text += node.textContent?.trim() || '';
            }
          }
          return text;
        }

        function matchesText(element: any, searchText: string, exact: boolean): { matches: boolean; score: number } {
          const el = element;
          
          // Get different text sources
          const directText = getDirectText(el);
          const innerText = el.innerText || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const title = el.getAttribute('title') || '';
          const placeholder = el.getAttribute('placeholder') || '';

          const search = searchText.toLowerCase();
          
          // Score system: higher score = better match
          let score = 0;
          let matches = false;

          if (exact) {
            // Exact match
            if (directText.toLowerCase() === search) {
              matches = true;
              score = 100; // Best: direct text exact match
            } else if (innerText.toLowerCase().trim() === search) {
              matches = true;
              score = 90; // Good: innerText exact match
            } else if (ariaLabel.toLowerCase() === search || title.toLowerCase() === search || placeholder.toLowerCase() === search) {
              matches = true;
              score = 80; // OK: attribute exact match
            }
          } else {
            // Contains match
            if (directText.toLowerCase().includes(search)) {
              matches = true;
              score = 100; // Best: direct text contains
            } else if (innerText.toLowerCase().includes(search)) {
              matches = true;
              score = 90; // Good: innerText contains
            } else if (ariaLabel.toLowerCase().includes(search) || title.toLowerCase().includes(search) || placeholder.toLowerCase().includes(search)) {
              matches = true;
              score = 80; // OK: attribute contains
            }
          }

          return { matches, score };
        }

        function getXPath(element: any): string {
          if (element.id) {
            return `//*[@id="${element.id}"]`;
          }
          
          const parts: string[] = [];
          let current = element;
          
          while (current && current.nodeType === 1) {
            let index = 1;
            let sibling = current.previousSibling;
            
            while (sibling) {
              if (sibling.nodeType === 1 && sibling.tagName === current.tagName) {
                index++;
              }
              sibling = sibling.previousSibling;
            }
            
            const tagName = current.tagName.toLowerCase();
            const part = index > 1 ? `${tagName}[${index}]` : tagName;
            parts.unshift(part);
            
            if (current.tagName.toLowerCase() === 'body') {
              break;
            }
            
            current = current.parentNode;
          }
          
          return '/' + parts.join('/');
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
