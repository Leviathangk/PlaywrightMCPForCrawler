import { SessionManager, ErrorResponse } from '../session-manager.js';

/**
 * Handle close_session tool call
 */
export async function handleCloseSession(sessionManager: SessionManager, args: any): Promise<any> {
  const { sessionId } = args;

  if (!sessionId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INVALID_PARAMETERS',
            message: 'sessionId is required',
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }

  try {
    await sessionManager.closeSession(sessionId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Session closed successfully',
          }),
        },
      ],
    };
  } catch (error: any) {
    if (error.errorCode) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(error as ErrorResponse),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
