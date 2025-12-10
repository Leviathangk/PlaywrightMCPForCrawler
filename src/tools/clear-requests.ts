import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface ClearRequestsArgs {
  sessionId: string;
}

export async function handleClearRequests(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId } = args as ClearRequestsArgs;

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
    session.networkCapture.clear();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Network requests cleared',
            sessionId,
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
            errorCode: 'CLEAR_REQUESTS_FAILED',
            message: error.message || 'Failed to clear requests',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
