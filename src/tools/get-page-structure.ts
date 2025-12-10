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
          // Try to generate a unique selector
          if (element.id) {
            return `#${element.id}`;
          }

          const classes = Array.from(element.classList).filter((c: any) => c && !c.startsWith('_'));
          if (classes.length > 0) {
            const classSelector = `.${classes.join('.')}`;
            const parent = element.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (el: any) => el.matches(classSelector)
              );
              if (siblings.length === 1) {
                return classSelector;
              }
              const index = siblings.indexOf(element) + 1;
              return `${classSelector}:nth-of-type(${index})`;
            }
            return classSelector;
          }

          // Fallback to tag with nth-child
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
