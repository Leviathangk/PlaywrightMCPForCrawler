import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface ClosePageArgs {
  sessionId: string;
  pageIndex: number;
}

export async function handleClosePage(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, pageIndex } = args as ClosePageArgs;

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
              errorCode: 'PAGE_ALREADY_CLOSED',
              message: `Page at index ${pageIndex} is already closed`,
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    // Don't allow closing the last page
    const openPages = pages.filter(p => !p.isClosed());
    if (openPages.length === 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'CANNOT_CLOSE_LAST_PAGE',
              message: 'Cannot close the last page. Use browser_close_session to close the session.',
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    const wasActive = targetPage === session.page;
    await targetPage.close();

    // If we closed the active page, switch to the first available page
    if (wasActive) {
      const remainingPages = session.context.pages().filter(p => !p.isClosed());
      if (remainingPages.length > 0) {
        session.page = remainingPages[0];
        await remainingPages[0].bringToFront();
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId,
            closedPageIndex: pageIndex,
            remainingPages: session.context.pages().filter(p => !p.isClosed()).length,
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
            errorCode: 'CLOSE_PAGE_FAILED',
            message: error.message || 'Failed to close page',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
