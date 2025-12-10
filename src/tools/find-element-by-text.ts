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
              text += node.textContent || '';
            }
          }
          return text.trim();
        }

        function matchesText(element: any, searchText: string, exact: boolean): { matches: boolean; score: number } {
          const el = element;
          
          // Get different text sources and trim them
          const directText = getDirectText(el);
          const innerText = (el.innerText || '').trim();
          const ariaLabel = (el.getAttribute('aria-label') || '').trim();
          const title = (el.getAttribute('title') || '').trim();
          const placeholder = (el.getAttribute('placeholder') || '').trim();

          const search = searchText.trim().toLowerCase();
          
          // Score system: higher score = better match
          let score = 0;
          let matches = false;

          if (exact) {
            // Exact match (after trimming)
            if (directText.toLowerCase() === search) {
              matches = true;
              score = 100; // Best: direct text exact match
            } else if (innerText.toLowerCase() === search) {
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
            const matchResult = matchesText(element, searchText, exact);
            if (matchResult.matches) {
              const visible = isVisible(element);
              matches.push({
                selector: getSelector(element),
                text: (element.innerText || element.textContent || '').trim().substring(0, 100),
                tag: element.tagName.toLowerCase(),
                visible,
                clickable: true,
                score: matchResult.score,
              });
            }
          }
        }

        // Sort by score (higher first), then by visibility
        matches.sort((a, b) => {
          if (a.score !== b.score) {
            return b.score - a.score; // Higher score first
          }
          return (b.visible ? 1 : 0) - (a.visible ? 1 : 0); // Visible first
        });

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
