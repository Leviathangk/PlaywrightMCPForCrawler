import { exec } from 'child_process';
import { promisify } from 'util';
import { ErrorResponse } from '../errors.js';

const execAsync = promisify(exec);

export interface InstallBrowserArgs {
  browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
  withDeps?: boolean;
}

export async function handleInstallBrowser(args: any): Promise<any> {
  const { browser = 'chromium', withDeps = false } = args as InstallBrowserArgs;

  try {
    console.error(`Installing Playwright ${browser}...`);

    let command = 'npx playwright install';
    
    if (browser !== 'all') {
      command += ` ${browser}`;
    }
    
    if (withDeps) {
      command += ' --with-deps';
    }

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    const output = stdout + stderr;
    console.error('Installation output:', output);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            browser,
            withDeps,
            message: `Successfully installed ${browser}`,
            output: output.substring(0, 1000), // Limit output length
          }),
        },
      ],
    };
  } catch (error: any) {
    console.error('Installation failed:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            errorCode: 'INSTALL_FAILED',
            message: error.message || 'Failed to install browser',
            stderr: error.stderr?.substring(0, 1000),
            stdout: error.stdout?.substring(0, 1000),
          } as ErrorResponse),
        },
      ],
      isError: true,
    };
  }
}
