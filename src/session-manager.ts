import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { ServerConfig } from './config.js';
import { NetworkCapture } from './network-capture.js';

/**
 * Session context containing browser context and page
 */
export interface SessionContext {
  sessionId: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  expiresAt: number;
  timeoutHandle: NodeJS.Timeout;
  networkCapture: NetworkCapture;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  errorCode: string;
  message: string;
  sessionId?: string;
  details?: any;
}

/**
 * Session validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: ErrorResponse;
}

/**
 * Manages browser sessions with automatic cleanup
 */
export class SessionManager {
  private sessions: Map<string, SessionContext>;
  private browser: Browser | null;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.sessions = new Map();
    this.browser = null;
    this.config = config;
  }

  /**
   * Initialize the shared browser instance
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }

    // Prepare launch options
    const launchOptions: any = {
      headless: this.config.headless,
    };

    // Add executable path if provided
    if (this.config.executablePath) {
      launchOptions.executablePath = this.config.executablePath;
    }

    // Launch browser based on configuration
    switch (this.config.browser) {
      case 'chromium':
        this.browser = await chromium.launch(launchOptions);
        break;
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      default:
        throw new Error(`Unsupported browser type: ${this.config.browser}`);
    }
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<{ sessionId: string; expiresAt: number }> {
    // Check if max sessions limit reached
    if (this.sessions.size >= this.config.maxSessions) {
      throw {
        errorCode: 'MAX_SESSIONS_REACHED',
        message: `Maximum number of sessions (${this.config.maxSessions}) reached`,
      } as ErrorResponse;
    }

    // Ensure browser is initialized
    if (!this.browser) {
      await this.initialize();
    }

    // Generate unique session ID
    const sessionId = uuidv4();

    // Create browser context and page
    const context = await this.browser!.newContext();
    const page = await context.newPage();

    // Create network capture
    const networkCapture = new NetworkCapture(this.config.maxNetworkRequests || 1000);

    // Set up network monitoring
    const requestMap = new Map<string, string>(); // Map request URL to request ID

    page.on('request', (request) => {
      const requestId = networkCapture.addRequest(request);
      requestMap.set(request.url(), requestId);
    });

    page.on('response', async (response) => {
      const requestId = requestMap.get(response.url());
      if (requestId) {
        await networkCapture.updateResponse(requestId, response);
        requestMap.delete(response.url());
      }
    });

    // Calculate expiration time
    const createdAt = Date.now();
    const expiresAt = createdAt + this.config.sessionTimeout;

    // Schedule automatic cleanup
    const timeoutHandle = setTimeout(() => {
      this.cleanupSession(sessionId).catch(console.error);
    }, this.config.sessionTimeout);

    // Store session
    const session: SessionContext = {
      sessionId,
      context,
      page,
      createdAt,
      expiresAt,
      timeoutHandle,
      networkCapture,
    };

    this.sessions.set(sessionId, session);

    return { sessionId, expiresAt };
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw {
        errorCode: 'SESSION_NOT_FOUND',
        message: `Session not found: ${sessionId}`,
        sessionId,
      } as ErrorResponse;
    }

    // Clear the timeout
    clearTimeout(session.timeoutHandle);

    // Close page and context
    try {
      await session.page.close();
      await session.context.close();
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }

    // Remove from sessions map
    this.sessions.delete(sessionId);
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionContext | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Validate a session
   */
  validateSession(sessionId: string): ValidationResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        valid: false,
        error: {
          errorCode: 'SESSION_NOT_FOUND',
          message: `Session not found: ${sessionId}`,
          sessionId,
        },
      };
    }

    // Check if session has expired
    const now = Date.now();
    if (now >= session.expiresAt) {
      return {
        valid: false,
        error: {
          errorCode: 'SESSION_EXPIRED',
          message: `Session expired: ${sessionId}`,
          sessionId,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Schedule automatic cleanup for a session
   */
  private scheduleCleanup(sessionId: string, timeout: number): void {
    const timeoutHandle = setTimeout(() => {
      this.cleanupSession(sessionId).catch(console.error);
    }, timeout);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.timeoutHandle = timeoutHandle;
    }
  }

  /**
   * Clean up a session
   */
  private async cleanupSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return; // Session already cleaned up
    }

    console.log(`Auto-cleaning expired session: ${sessionId}`);

    // Close page and context
    try {
      await session.page.close();
      await session.context.close();
    } catch (error) {
      console.error(`Error during auto-cleanup of session ${sessionId}:`, error);
    }

    // Remove from sessions map
    this.sessions.delete(sessionId);
  }

  /**
   * Shutdown the session manager and close all sessions
   */
  async shutdown(): Promise<void> {
    // Will be implemented in next subtask
  }
}
