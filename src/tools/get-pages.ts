import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetPagesArgs {
  sessionId: string;
}

export async function handleGetPages(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId } = args as GetPagesArgs;

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
    // Get all pages in the context
    const pages = session.context.pages();
    const currentPage = session.page;

    // Build page information
    const pageInfos = await Promise.all(
      pages.map(async (page, index) => {
        const url = page.url();
        const title = await page.title().catch(() => '');
        const isClosed = page.isClosed();
        const isActive = page === currentPage;

        return {
          index,
          url,
          title,
          isClosed,
          isActive,
        };
      })
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId,
            totalPages: pages.length,
            pages: pageInfos,
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
            errorCode: 'GET_PAGES_FAILED',
            message: error.message || 'Failed to get pages',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
