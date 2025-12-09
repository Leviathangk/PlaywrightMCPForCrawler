import { ErrorResponse } from './session-manager.js';

export const ErrorCodes = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  MAX_SESSIONS_REACHED: 'MAX_SESSIONS_REACHED',
  NAVIGATION_FAILED: 'NAVIGATION_FAILED',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_CLICKABLE: 'ELEMENT_NOT_CLICKABLE',
  ELEMENT_NOT_EDITABLE: 'ELEMENT_NOT_EDITABLE',
  BROWSER_ERROR: 'BROWSER_ERROR',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
} as const;

export function createSessionNotFoundError(sessionId: string): ErrorResponse {
  return {
    errorCode: ErrorCodes.SESSION_NOT_FOUND,
    message: `Session not found: ${sessionId}`,
    sessionId,
  };
}

export function createSessionExpiredError(sessionId: string): ErrorResponse {
  return {
    errorCode: ErrorCodes.SESSION_EXPIRED,
    message: `Session expired: ${sessionId}`,
    sessionId,
  };
}

export function createMaxSessionsReachedError(maxSessions: number): ErrorResponse {
  return {
    errorCode: ErrorCodes.MAX_SESSIONS_REACHED,
    message: `Maximum number of sessions (${maxSessions}) reached`,
  };
}

export function createNavigationFailedError(sessionId: string, url: string, details?: any): ErrorResponse {
  return {
    errorCode: ErrorCodes.NAVIGATION_FAILED,
    message: `Navigation failed for URL: ${url}`,
    sessionId,
    details,
  };
}

export function createElementNotFoundError(sessionId: string, selector: string): ErrorResponse {
  return {
    errorCode: ErrorCodes.ELEMENT_NOT_FOUND,
    message: `Element not found: ${selector}`,
    sessionId,
  };
}


export function createElementNotClickableError(sessionId: string, selector: string, details?: any): ErrorResponse {
  return {
    errorCode: ErrorCodes.ELEMENT_NOT_CLICKABLE,
    message: `Element not clickable: ${selector}`,
    sessionId,
    details,
  };
}

export function createElementNotEditableError(sessionId: string, selector: string): ErrorResponse {
  return {
    errorCode: ErrorCodes.ELEMENT_NOT_EDITABLE,
    message: `Element not editable: ${selector}`,
    sessionId,
  };
}

export function createBrowserError(message: string, details?: any): ErrorResponse {
  return {
    errorCode: ErrorCodes.BROWSER_ERROR,
    message,
    details,
  };
}

export function createInvalidParametersError(message: string): ErrorResponse {
  return {
    errorCode: ErrorCodes.INVALID_PARAMETERS,
    message,
  };
}
