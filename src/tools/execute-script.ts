import { SessionManager } from '../session-manager.js';
import { ErrorResponse } from '../errors.js';

export interface ExecuteScriptArgs {
  sessionId: string;
  script: string;
  args?: any[];
}

export async function handleExecuteScript(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  const { sessionId, script, args: scriptArgs = [] } = args as ExecuteScriptArgs;

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
    // Execute the script with provided arguments
    const result = await session.page.evaluate(
      ({ script, args }) => {
        try {
          // Create a function from the script
          // @ts-ignore
          const func = new Function('args', `
            return (function() {
              ${script}
            })();
          `);
          
          const output = func(args);
          
          return {
            success: true,
            result: output,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            stack: error.stack,
          };
        }
      },
      { script, args: scriptArgs }
    );

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'SCRIPT_EXECUTION_FAILED',
              message: result.error,
              stack: result.stack,
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
          text: JSON.stringify({
            success: true,
            result: result.result,
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
            errorCode: 'EXECUTE_SCRIPT_FAILED',
            message: error.message || 'Failed to execute script',
            sessionId,
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
