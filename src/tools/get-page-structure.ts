import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetPageStructureArgs {
  sessionId: string;
  selector?: string;
  includeHidden?: boolean;
  maxElements?: number;
}

interface PageElement {
  type: string;
  text: string;
  selector: string;
  visible: boolean;
  clickable: boolean;
  tag: string;
  attributes?: Record<string, string>;
  children?: PageElement[];
}

export async function handleGetPageStructure(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, selector, includeHidden = false, maxElements = 100 } = args as GetPageStructureArgs;

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
    // Get page structure using Playwright
    const structure = await session.page.evaluate(
      ({ rootSelector, includeHidden, maxElements }): any => {
        const elements: any[] = [];
        let elementCount = 0;

        // Interactive element selectors
        const interactiveSelectors = [
          'a',
          'button',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[onclick]',
          '.clickable',
        ];

        function isVisible(element: any): boolean {
          // @ts-ignore - browser context
          const style = window.getComputedStyle(element);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          );
        }

        function isClickable(element: any): boolean {
          const tag = element.tagName.toLowerCase();
          if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
            return true;
          }
          if (element.hasAttribute('onclick') || element.hasAttribute('role')) {
            return true;
          }
          return false;
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

        function getText(element: any): string {
          // Get direct text content (not from children)
          let text = '';
          for (const node of element.childNodes) {
            if (node.nodeType === 3) { // TEXT_NODE
              text += node.textContent?.trim() || '';
            }
          }

          // If no direct text, try common text attributes
          if (!text) {
            const el = element;
            text = el.getAttribute('aria-label') ||
                   el.getAttribute('title') ||
                   el.getAttribute('placeholder') ||
                   el.getAttribute('alt') ||
                   '';
          }

          return text.trim().substring(0, 100); // Limit text length
        }

        function extractElement(element: any, depth: number = 0): any | null {
          if (elementCount >= maxElements) return null;
          if (depth > 5) return null; // Limit depth

          const visible = isVisible(element);
          if (!includeHidden && !visible) return null;

          const clickable = isClickable(element);
          const text = getText(element);

          // Skip elements with no text and not interactive
          if (!text && !clickable && depth > 0) return null;

          elementCount++;

          const elementData: any = {
            type: element.getAttribute('role') || element.tagName.toLowerCase(),
            text,
            selector: getSelector(element),
            visible,
            clickable,
            tag: element.tagName.toLowerCase(),
          };

          // Add useful attributes
          const attrs: Record<string, string> = {};
          const el = element;
          if (el.href) attrs.href = el.href;
          if (el.getAttribute('type')) attrs.type = el.getAttribute('type')!;
          if (el.className) attrs.class = el.className;
          if (Object.keys(attrs).length > 0) {
            elementData.attributes = attrs;
          }

          // Process children for interactive or container elements
          if (clickable || ['nav', 'menu', 'ul', 'ol', 'div', 'section'].includes(elementData.type)) {
            const children: any[] = [];
            for (const child of element.children) {
              if (elementCount >= maxElements) break;
              const childData = extractElement(child, depth + 1);
              if (childData) {
                children.push(childData);
              }
            }
            if (children.length > 0) {
              elementData.children = children;
            }
          }

          return elementData;
        }

        // Start extraction
        // @ts-ignore - browser context
        const root = rootSelector ? document.querySelector(rootSelector) : document.body;

        if (!root) {
          return { elements: [], error: 'Root element not found' };
        }

        // First, collect all interactive elements
        const interactiveElements: any[] = [];
        for (const selector of interactiveSelectors) {
          const elements = root.querySelectorAll(selector);
          for (const element of elements) {
            if (elementCount >= maxElements) break;
            const visible = isVisible(element);
            if (!includeHidden && !visible) continue;

            interactiveElements.push({
              type: element.getAttribute('role') || element.tagName.toLowerCase(),
              text: getText(element),
              selector: getSelector(element),
              visible,
              clickable: true,
              tag: element.tagName.toLowerCase(),
            });
            elementCount++;
          }
        }

        return {
          elements: interactiveElements,
          totalFound: elementCount,
        };
      },
      { rootSelector: selector, includeHidden, maxElements }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(structure),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'GET_PAGE_STRUCTURE_FAILED',
            message: error.message || 'Failed to get page structure',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
