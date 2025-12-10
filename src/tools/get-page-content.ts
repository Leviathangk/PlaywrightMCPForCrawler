import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetPageContentArgs {
  sessionId: string;
  format?: 'html' | 'text' | 'markdown';
  selector?: string;
}

export async function handleGetPageContent(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, format = 'html', selector } = args as GetPageContentArgs;

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
      ({ format, selector }): any => {
        let element;
        let targetSelector;
        
        if (selector) {
          // @ts-ignore
          element = document.querySelector(selector);
          if (!element) {
            return { error: 'Element not found' };
          }
          targetSelector = selector;
        } else {
          // 默认获取整个 HTML 文档
          // @ts-ignore
          element = document.documentElement;
          targetSelector = 'html';
        }

        let content = '';
        
        if (format === 'html') {
          // 如果是整个文档，返回完整的 HTML
          if (!selector) {
            // @ts-ignore
            content = document.documentElement.outerHTML;
          } else {
            content = element.outerHTML;
          }
        } else if (format === 'text') {
          content = element.innerText || element.textContent || '';
        } else if (format === 'markdown') {
          // Simple markdown conversion
          const html = element.innerHTML;
          content = html
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        }

        return {
          // @ts-ignore
          url: document.location.href,
          // @ts-ignore
          title: document.title,
          content,
          format,
          selector: targetSelector,
        };
      },
      { format, selector }
    );

    if (result.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'ELEMENT_NOT_FOUND',
              message: result.error,
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
            errorCode: 'GET_PAGE_CONTENT_FAILED',
            message: error.message || 'Failed to get page content',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
