import { SessionManager, ErrorResponse } from '../session-manager.js';

/**
 * Handle create_session tool call
 */
export async function handleCreateSession(sessionManager: SessionManager): Promise<any> {
  try {
    const result = await sessionManager.createSession();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            sessionId: result.sessionId,
            expiresAt: result.expiresAt,
            message: 'Session created successfully',
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
