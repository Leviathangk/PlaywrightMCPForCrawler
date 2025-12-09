# Playwright MCP Server

A Model Context Protocol (MCP) server that provides browser automation capabilities using Playwright.

## Features

- **Session Management**: Create and manage multiple isolated browser sessions
- **Concurrent Sessions**: Support for multiple concurrent browser sessions with automatic cleanup
- **Browser Operations**: Navigate, click, and type operations
- **Configurable**: Support for different browsers (Chromium, Firefox, WebKit) and modes (headless/headed)
- **Auto-cleanup**: Automatic session cleanup after timeout

## Installation

```bash
npm install -g @modelcontextprotocol/server-playwright
```

Or use with npx:

```bash
npx @modelcontextprotocol/server-playwright
```

## Configuration

Add to your MCP settings file (e.g., `mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-playwright",
        "--browser", "chromium",
        "--headless", "false",
        "--session-timeout", "300000",
        "--max-sessions", "10"
      ]
    }
  }
}
```

## Configuration Options

- `--browser <type>`: Browser type (chromium, firefox, webkit). Default: chromium
- `--headless <boolean>`: Run in headless mode. Default: false
- `--session-timeout <ms>`: Session timeout in milliseconds. Default: 300000 (5 minutes)
- `--max-sessions <number>`: Maximum concurrent sessions. Default: 10

## Available Tools

### create_session

Create a new browser session.

**Returns:**
- `sessionId`: Unique session identifier
- `expiresAt`: Session expiration timestamp


### close_session

Close an existing browser session.

**Parameters:**
- `sessionId` (required): The session ID to close

### navigate

Navigate to a URL in the specified session.

**Parameters:**
- `sessionId` (required): The session ID
- `url` (required): The URL to navigate to
- `waitUntil` (optional): When to consider navigation successful (load, domcontentloaded, networkidle)
- `timeout` (optional): Navigation timeout in milliseconds

**Returns:**
- `success`: Whether navigation was successful
- `title`: Page title
- `url`: Final URL (after redirects)
- `status`: HTTP status code

### click

Click an element on the page.

**Parameters:**
- `sessionId` (required): The session ID
- `selector` (required): CSS selector or XPath of the element
- `timeout` (optional): Timeout in milliseconds
- `force` (optional): Force click even if element is not actionable
- `clickCount` (optional): Number of times to click (default: 1)

### type

Type text into an input element.

**Parameters:**
- `sessionId` (required): The session ID
- `selector` (required): CSS selector or XPath of the input element
- `text` (required): The text to type
- `delay` (optional): Delay between key presses in milliseconds
- `timeout` (optional): Timeout in milliseconds
- `clear` (optional): Clear input before typing (default: false)

## Error Handling

All operations return structured error responses with:
- `errorCode`: Machine-readable error code
- `message`: Human-readable error description
- `sessionId`: Session ID (if applicable)
- `details`: Additional error context (if available)

### Error Codes

- `SESSION_NOT_FOUND`: Session does not exist
- `SESSION_EXPIRED`: Session has expired
- `MAX_SESSIONS_REACHED`: Maximum session limit reached
- `NAVIGATION_FAILED`: Navigation operation failed
- `ELEMENT_NOT_FOUND`: Element not found on page
- `ELEMENT_NOT_CLICKABLE`: Element is not clickable
- `ELEMENT_NOT_EDITABLE`: Element is not editable
- `BROWSER_ERROR`: Browser-level error
- `INVALID_PARAMETERS`: Invalid parameters provided

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start server
npm start
```

## License

MIT
