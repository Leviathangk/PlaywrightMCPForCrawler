/**
 * Server configuration interface
 */
export interface ServerConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  sessionTimeout: number; // milliseconds
  maxSessions: number;
  executablePath?: string; // Optional path to browser executable
  maxNetworkRequests?: number; // Maximum network requests to store per session
}

/**
 * Default server configuration
 */
export const DEFAULT_CONFIG: ServerConfig = {
  browser: 'chromium',
  headless: false,
  sessionTimeout: 300000, // 5 minutes
  maxSessions: 10,
  maxNetworkRequests: 1000, // Store up to 1000 requests per session
};

/**
 * Parse command line arguments and return server configuration
 */
export function parseConfig(args: string[]): ServerConfig {
  const config: ServerConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--browser' && i + 1 < args.length) {
      const browserType = args[i + 1];
      if (browserType === 'chromium' || browserType === 'firefox' || browserType === 'webkit') {
        config.browser = browserType;
      }
      i++;
    } else if (arg === '--headless' && i + 1 < args.length) {
      config.headless = args[i + 1] === 'true';
      i++;
    } else if (arg === '--session-timeout' && i + 1 < args.length) {
      const timeout = parseInt(args[i + 1], 10);
      if (!isNaN(timeout) && timeout > 0) {
        config.sessionTimeout = timeout;
      }
      i++;
    } else if (arg === '--max-sessions' && i + 1 < args.length) {
      const maxSessions = parseInt(args[i + 1], 10);
      if (!isNaN(maxSessions) && maxSessions > 0) {
        config.maxSessions = maxSessions;
      }
      i++;
    } else if (arg === '--executable-path' && i + 1 < args.length) {
      config.executablePath = args[i + 1];
      i++;
    } else if (arg === '--max-network-requests' && i + 1 < args.length) {
      const maxNetworkRequests = parseInt(args[i + 1], 10);
      if (!isNaN(maxNetworkRequests) && maxNetworkRequests > 0) {
        config.maxNetworkRequests = maxNetworkRequests;
      }
      i++;
    }
  }

  return config;
}
