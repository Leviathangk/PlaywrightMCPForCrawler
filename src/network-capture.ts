import { Request, Response } from 'playwright';

/**
 * Network request data structure
 */
export interface NetworkRequest {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  resourceType: string;
  request: {
    headers: Record<string, string>;
    postData?: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: string;
  };
}

/**
 * Network capture manager for a session
 */
export class NetworkCapture {
  private requests: NetworkRequest[] = [];
  private maxRequests: number;
  private requestCounter = 0;

  constructor(maxRequests: number = 1000) {
    this.maxRequests = maxRequests;
  }

  /**
   * Add a request to the capture
   */
  addRequest(request: Request): string {
    const requestId = `req-${++this.requestCounter}`;
    
    const networkRequest: NetworkRequest = {
      id: requestId,
      timestamp: Date.now(),
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      request: {
        headers: request.headers(),
        postData: request.postData() || undefined,
      },
    };

    this.requests.push(networkRequest);

    // Limit the number of stored requests
    if (this.requests.length > this.maxRequests) {
      this.requests.shift(); // Remove oldest request
    }

    return requestId;
  }

  /**
   * Update request with response data
   */
  async updateResponse(requestId: string, response: Response): Promise<void> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return;

    try {
      const body = await response.body();
      request.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        body: body.toString('utf-8'),
      };
    } catch (error) {
      // Response body might not be available
      request.response = {
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
      };
    }
  }

  /**
   * Get all requests
   */
  getRequests(): NetworkRequest[] {
    return this.requests;
  }

  /**
   * Clear all requests
   */
  clear(): void {
    this.requests = [];
  }

  /**
   * Search requests by keyword (supports regex)
   */
  searchRequests(
    keyword: string,
    searchIn: ('url' | 'request' | 'response')[],
    isRegex: boolean = false
  ): NetworkRequest[] {
    const pattern = isRegex ? new RegExp(keyword, 'i') : null;
    
    return this.requests.filter(req => {
      for (const field of searchIn) {
        if (field === 'url') {
          if (this.matchText(req.url, keyword, pattern)) return true;
        } else if (field === 'request') {
          const requestData = JSON.stringify(req.request);
          if (this.matchText(requestData, keyword, pattern)) return true;
        } else if (field === 'response' && req.response) {
          const responseData = JSON.stringify(req.response);
          if (this.matchText(responseData, keyword, pattern)) return true;
        }
      }
      return false;
    });
  }

  /**
   * Match text against keyword or regex pattern
   */
  private matchText(text: string, keyword: string, pattern: RegExp | null): boolean {
    if (pattern) {
      return pattern.test(text);
    }
    return text.toLowerCase().includes(keyword.toLowerCase());
  }

  /**
   * Convert request to curl command
   */
  toCurl(request: NetworkRequest): string {
    const parts: string[] = ['curl'];

    // Method
    if (request.method !== 'GET') {
      parts.push(`-X ${request.method}`);
    }

    // URL
    parts.push(`'${request.url}'`);

    // Headers
    for (const [key, value] of Object.entries(request.request.headers)) {
      // Skip some headers that curl adds automatically
      if (['host', 'content-length'].includes(key.toLowerCase())) continue;
      parts.push(`-H '${key}: ${value}'`);
    }

    // Body
    if (request.request.postData) {
      const body = request.request.postData.replace(/'/g, "'\\''");
      parts.push(`-d '${body}'`);
    }

    return parts.join(' \\\n  ');
  }
}
