#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseConfig } from './config.js';
import { SessionManager } from './session-manager.js';
import {
  handleCreateSession,
  handleCloseSession,
  handleNavigate,
  handleClick,
  handleType,
  handleSearchRequests,
  handleGetRequests,
  handleGetRequestDetail,
  handleClearRequests,
  handleGetPageStructure,
  handleFindElementByText,
  handleScreenshot,
  handleWaitForElement,
  handleGetTextContent,
  handleQuerySelector,
  handleGetPageContent,
  handleScroll,
  handleExecuteScript,
  handleInstallBrowser,
  handleGetPages,
  handleNewPage,
  handleSwitchPage,
  handleClosePage,
} from './tools/index.js';

/**
 * Main entry point
 */
async function main() {
  // Parse configuration from command line arguments
  const config = parseConfig(process.argv.slice(2));

  console.error('Starting Playwright MCP Server with config:', config);

  // Create session manager
  const sessionManager = new SessionManager(config);

  // Initialize browser
  await sessionManager.initialize();

  // Create MCP server
  const server = new Server(
    {
      name: 'playwright-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'browser_install',
          description:
            'Install Playwright browsers. This allows you to install chromium, firefox, webkit, or all browsers without manually running playwright install.',
          inputSchema: {
            type: 'object',
            properties: {
              browser: {
                type: 'string',
                enum: ['chromium', 'firefox', 'webkit', 'all'],
                description: 'Which browser to install',
                default: 'chromium',
              },
              withDeps: {
                type: 'boolean',
                description: 'Whether to install system dependencies (Linux only)',
                default: false,
              },
            },
            required: [],
          },
        },
        {
          name: 'browser_create_session',
          description:
            'Create a new browser session. Returns a sessionId that must be used for all subsequent operations.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'browser_close_session',
          description: 'Close an existing browser session and release resources.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID to close',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_navigate',
          description: 'Navigate to a URL in the specified session.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              url: {
                type: 'string',
                description: 'The URL to navigate to',
              },
              waitUntil: {
                type: 'string',
                description: 'When to consider navigation successful',
                enum: ['load', 'domcontentloaded', 'networkidle'],
                default: 'load',
              },
              timeout: {
                type: 'number',
                description: 'Navigation timeout in milliseconds',
              },
            },
            required: ['sessionId', 'url'],
          },
        },
        {
          name: 'browser_click',
          description: 'Click an element on the page.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'CSS selector or XPath of the element to click',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
              },
              force: {
                type: 'boolean',
                description: 'Whether to force the click even if the element is not actionable',
              },
              clickCount: {
                type: 'number',
                description: 'Number of times to click',
                default: 1,
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'browser_type',
          description: 'Type text into an input element.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'CSS selector or XPath of the input element',
              },
              text: {
                type: 'string',
                description: 'The text to type',
              },
              delay: {
                type: 'number',
                description: 'Delay between key presses in milliseconds',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
              },
              clear: {
                type: 'boolean',
                description: 'Whether to clear the input before typing',
                default: false,
              },
            },
            required: ['sessionId', 'selector', 'text'],
          },
        },
        {
          name: 'browser_search_requests',
          description: 'Search captured network requests by keyword (supports regex). Useful for finding API endpoints that contain specific data.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              keyword: {
                type: 'string',
                description: 'Keyword to search for',
              },
              searchIn: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['url', 'request', 'response'],
                },
                description: 'Where to search: url, request body, or response body',
                default: ['url', 'response'],
              },
              isRegex: {
                type: 'boolean',
                description: 'Whether the keyword is a regular expression',
                default: false,
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 10,
              },
            },
            required: ['sessionId', 'keyword'],
          },
        },
        {
          name: 'browser_get_requests',
          description: 'Get all captured network requests with optional filtering.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              filter: {
                type: 'object',
                properties: {
                  method: {
                    type: 'string',
                    description: 'Filter by HTTP method (GET, POST, etc.)',
                  },
                  urlContains: {
                    type: 'string',
                    description: 'Filter by URL containing this string',
                  },
                  resourceType: {
                    type: 'string',
                    description: 'Filter by resource type (xhr, fetch, document, etc.)',
                  },
                  statusCode: {
                    type: 'number',
                    description: 'Filter by HTTP status code',
                  },
                },
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 50,
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_get_request_detail',
          description: 'Get detailed information about a specific request, including curl command.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              requestId: {
                type: 'string',
                description: 'The request ID',
              },
            },
            required: ['sessionId', 'requestId'],
          },
        },
        {
          name: 'browser_clear_requests',
          description: 'Clear all captured network requests for a session.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_get_page_structure',
          description: 'Get the structure of interactive elements on the page. Returns clickable elements like links, buttons, and inputs with their text and selectors.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'Optional CSS selector to analyze only a specific region of the page',
              },
              includeHidden: {
                type: 'boolean',
                description: 'Whether to include hidden elements',
                default: false,
              },
              maxElements: {
                type: 'number',
                description: 'Maximum number of elements to return',
                default: 100,
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_find_element_by_text',
          description: 'Find an element on the page by its text content. Returns the selector that can be used with click or type tools.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              text: {
                type: 'string',
                description: 'The text to search for',
              },
              exact: {
                type: 'boolean',
                description: 'Whether to match the text exactly',
                default: false,
              },
              elementType: {
                type: 'string',
                enum: ['link', 'button', 'any'],
                description: 'Type of element to search for',
                default: 'any',
              },
            },
            required: ['sessionId', 'text'],
          },
        },
        {
          name: 'browser_screenshot',
          description: 'Take a screenshot of the page or a specific element and save it to a file.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              path: {
                type: 'string',
                description: 'File path where the screenshot will be saved (e.g., "screenshots/page.png")',
              },
              selector: {
                type: 'string',
                description: 'Optional CSS selector to screenshot only a specific element',
              },
              fullPage: {
                type: 'boolean',
                description: 'Whether to take a full page screenshot',
                default: false,
              },
            },
            required: ['sessionId', 'path'],
          },
        },
        {
          name: 'browser_wait_for_element',
          description: 'Wait for an element to appear on the page. Useful for waiting for dynamic content to load.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'CSS selector of the element to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Maximum time to wait in milliseconds',
                default: 30000,
              },
              state: {
                type: 'string',
                enum: ['attached', 'detached', 'visible', 'hidden'],
                description: 'Wait for element to reach this state',
                default: 'visible',
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'browser_get_text_content',
          description: 'Get the text content of a specific element on the page.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'CSS selector of the element',
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'browser_query_selector',
          description: 'Query elements using CSS selector and get detailed information including text, attributes, position, and visibility.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              selector: {
                type: 'string',
                description: 'CSS selector to query',
              },
              multiple: {
                type: 'boolean',
                description: 'Whether to return all matching elements or just the first one',
                default: false,
              },
              includeAttributes: {
                type: 'boolean',
                description: 'Whether to include element attributes in the result',
                default: true,
              },
            },
            required: ['sessionId', 'selector'],
          },
        },
        {
          name: 'browser_get_page_content',
          description: 'Get the content of the page or a specific element in different formats (html, text, markdown).',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              format: {
                type: 'string',
                enum: ['html', 'text', 'markdown'],
                description: 'Format of the content to return',
                default: 'html',
              },
              selector: {
                type: 'string',
                description: 'Optional CSS selector to get content from a specific element',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_scroll',
          description: 'Scroll the page to a specific position, element, or direction. Useful for loading lazy-loaded content.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              target: {
                type: 'string',
                enum: ['top', 'bottom', 'element'],
                description: 'Where to scroll: top, bottom, or to a specific element',
                default: 'bottom',
              },
              selector: {
                type: 'string',
                description: 'CSS selector of element to scroll to (required when target is "element")',
              },
              x: {
                type: 'number',
                description: 'Horizontal scroll position in pixels',
              },
              y: {
                type: 'number',
                description: 'Vertical scroll position in pixels',
              },
              smooth: {
                type: 'boolean',
                description: 'Whether to use smooth scrolling',
                default: true,
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_execute_script',
          description: 'Execute custom JavaScript code in the browser context. Returns the result of the script execution.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              script: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
              args: {
                type: 'array',
                description: 'Optional arguments to pass to the script',
                default: [],
              },
            },
            required: ['sessionId', 'script'],
          },
        },
        {
          name: 'browser_get_pages',
          description: 'Get a list of all open pages (tabs) in the session, including which page is currently active.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_new_page',
          description: 'Create a new page (tab) in the session and optionally navigate to a URL.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              url: {
                type: 'string',
                description: 'Optional URL to navigate to in the new page',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'browser_switch_page',
          description: 'Switch to a different page (tab) by its index. Use browser_get_pages to see available pages.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              pageIndex: {
                type: 'number',
                description: 'The index of the page to switch to (0-based)',
              },
            },
            required: ['sessionId', 'pageIndex'],
          },
        },
        {
          name: 'browser_close_page',
          description: 'Close a specific page (tab) by its index. Cannot close the last remaining page.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'The session ID',
              },
              pageIndex: {
                type: 'number',
                description: 'The index of the page to close (0-based)',
              },
            },
            required: ['sessionId', 'pageIndex'],
          },
        },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'browser_install':
          return await handleInstallBrowser(args);

        case 'browser_create_session':
          return await handleCreateSession(sessionManager);

        case 'browser_close_session':
          return await handleCloseSession(sessionManager, args);

        case 'browser_navigate':
          return await handleNavigate(sessionManager, args);

        case 'browser_click':
          return await handleClick(sessionManager, args);

        case 'browser_type':
          return await handleType(sessionManager, args);

        case 'browser_search_requests':
          return await handleSearchRequests(sessionManager, args);

        case 'browser_get_requests':
          return await handleGetRequests(sessionManager, args);

        case 'browser_get_request_detail':
          return await handleGetRequestDetail(sessionManager, args);

        case 'browser_clear_requests':
          return await handleClearRequests(sessionManager, args);

        case 'browser_get_page_structure':
          return await handleGetPageStructure(sessionManager, args);

        case 'browser_find_element_by_text':
          return await handleFindElementByText(sessionManager, args);

        case 'browser_screenshot':
          return await handleScreenshot(sessionManager, args);

        case 'browser_wait_for_element':
          return await handleWaitForElement(sessionManager, args);

        case 'browser_get_text_content':
          return await handleGetTextContent(sessionManager, args);

        case 'browser_query_selector':
          return await handleQuerySelector(sessionManager, args);

        case 'browser_get_page_content':
          return await handleGetPageContent(sessionManager, args);

        case 'browser_scroll':
          return await handleScroll(sessionManager, args);

        case 'browser_execute_script':
          return await handleExecuteScript(sessionManager, args);

        case 'browser_get_pages':
          return await handleGetPages(sessionManager, args);

        case 'browser_new_page':
          return await handleNewPage(sessionManager, args);

        case 'browser_switch_page':
          return await handleSwitchPage(sessionManager, args);

        case 'browser_close_page':
          return await handleClosePage(sessionManager, args);

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  errorCode: 'INVALID_TOOL',
                  message: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      console.error(`Error handling tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              errorCode: 'INTERNAL_ERROR',
              message: error.message || 'Internal server error',
              details: error.stack,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  console.error('Playwright MCP Server started successfully');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down...');
    await sessionManager.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down...');
    await sessionManager.shutdown();
    process.exit(0);
  });
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
