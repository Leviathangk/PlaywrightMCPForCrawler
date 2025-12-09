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
} from './tools.js';

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
          name: 'create_session',
          description:
            'Create a new browser session. Returns a sessionId that must be used for all subsequent operations.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'close_session',
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
          name: 'navigate',
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
          name: 'click',
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
          name: 'type',
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
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_session':
          return await handleCreateSession(sessionManager);

        case 'close_session':
          return await handleCloseSession(sessionManager, args);

        case 'navigate':
          return await handleNavigate(sessionManager, args);

        case 'click':
          return await handleClick(sessionManager, args);

        case 'type':
          return await handleType(sessionManager, args);

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
