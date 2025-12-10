import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';
import * as path from 'path';

export interface ScreenshotArgs {
  sessionId: string;
  path: string;
  selector?: string;
  fullPage?: boolean;
}

export async function handleScreenshot(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, path: screenshotPath, selector, fullPage = false } = args as ScreenshotArgs;

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
    // Resolve path (relative to current working directory)
    const resolvedPath = path.resolve(screenshotPath);

    if (selector) {
      // Screenshot specific element
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

      await element.screenshot({ path: resolvedPath });
    } else {
      // Screenshot full page or viewport
      await session.page.screenshot({
        path: resolvedPath,
        fullPage,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            path: resolvedPath,
            message: 'Screenshot saved successfully',
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
            errorCode: 'SCREENSHOT_FAILED',
            message: error.message || 'Failed to take screenshot',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
