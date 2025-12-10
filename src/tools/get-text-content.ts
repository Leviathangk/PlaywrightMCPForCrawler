import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface GetTextContentArgs {
  sessionId: string;
  selector: string;
}

export async function handleGetTextContent(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, selector } = args as GetTextContentArgs;

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
    // Get text content
    const element = await session.page.$(selector);
    if (!element) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'ELEMENT_NOT_FOUND',
              message: `Element not found: ${selector}`,
              sessionId,
            } as ErrorResponse),
          },
        ],
        isError: true,
      };
    }

    const textContent = await element.textContent();
    const innerText = await element.evaluate((el: any) => el.innerText);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            selector,
            textContent: textContent?.trim() || '',
            innerText: innerText?.trim() || '',
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
            errorCode: 'GET_TEXT_CONTENT_FAILED',
            message: error.message || 'Failed to get text content',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
