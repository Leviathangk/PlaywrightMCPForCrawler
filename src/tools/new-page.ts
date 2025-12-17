import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface NewPageArgs {
  sessionId: string;
  url?: string;
}

export async function handleNewPage(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, url } = args as NewPageArgs;

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
    // Create a new page in the context
    const newPage = await session.context.newPage();

    // Navigate to URL if provided
    if (url) {
      await newPage.goto(url, { waitUntil: 'load' });
    }

    // Switch to the new page
    session.page = newPage;
    await newPage.bringToFront();

    const pages = session.context.pages();
    const pageIndex = pages.indexOf(newPage);
    const title = await newPage.title().catch(() => '');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId,
            pageIndex,
            url: newPage.url(),
            title,
            totalPages: pages.length,
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
            errorCode: 'NEW_PAGE_FAILED',
            message: error.message || 'Failed to create new page',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
