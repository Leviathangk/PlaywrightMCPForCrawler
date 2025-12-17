import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface SwitchPageArgs {
  sessionId: string;
  pageIndex: number;
}

export async function handleSwitchPage(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, pageIndex } = args as SwitchPageArgs;

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
    const pages = session.context.pages();

    if (pageIndex < 0 || pageIndex >= pages.length) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'INVALID_PAGE_INDEX',
              message: `Invalid page index: ${pageIndex}. Valid range: 0-${pages.length - 1}`,
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    const targetPage = pages[pageIndex];

    if (targetPage.isClosed()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'PAGE_CLOSED',
              message: `Page at index ${pageIndex} is already closed`,
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    // Switch to the target page
    session.page = targetPage;
    await targetPage.bringToFront();

    const url = targetPage.url();
    const title = await targetPage.title().catch(() => '');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId,
            pageIndex,
            url,
            title,
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
            errorCode: 'SWITCH_PAGE_FAILED',
            message: error.message || 'Failed to switch page',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
