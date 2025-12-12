# Playwright MCP Server

基于 Playwright 的 Model Context Protocol (MCP) 服务器，提供浏览器自动化功能。
- **会话管理**：创建和管理多个独立的浏览器会话
- **并发支持**：支持多个并发浏览器会话，自动清理过期会话
- **浏览器操作**：导航、点击、输入等常用操作
- **灵活配置**：支持不同浏览器（Chromium、Firefox、WebKit）和模式（有头/无头）
- **自动清理**：会话超时后自动清理资源

npm 地址：https://www.npmjs.com/package/@leviathangk/playwright-mcp

GitHub 地址：https://github.com/Leviathangk/PlaywrightMCPForCrawler

## 安装

```bash
npm i @leviathangk/playwright-mcp
```

## MCP 配置

在 MCP Server 中添加：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "@leviathangk/playwright-mcp@latest",
        "--browser", "chromium",
        "--headless", "false",
        "--session-timeout", "300000",
        "--max-sessions", "10"
      ]
    }
  }
}
```

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--browser` | `chromium` | 浏览器类型：chromium、firefox、webkit |
| `--headless` | `false` | 无头模式 |
| `--session-timeout` | `300000` | 会话超时（毫秒） |
| `--max-sessions` | `10` | 最大并发会话数 |
| `--executable-path` | 无 | 浏览器可执行路径（可选） |

## 核心工具

### 会话管理
- `browser_create_session` - 创建会话
- `browser_close_session` - 关闭会话

### 页面操作
- `browser_navigate` - 导航到 URL
- `browser_click` - 点击元素
- `browser_type` - 输入文本
- `browser_scroll` - 滚动页面

### 页面分析
- `browser_get_page_structure` - 获取页面结构
- `browser_find_element_by_text` - 根据文本查找元素
- `browser_get_page_content` - 获取页面内容
- `browser_screenshot` - 截图

### 网络请求捕获
- `browser_search_requests` - 搜索请求
- `browser_get_requests` - 获取所有请求
- `browser_get_request_detail` - 获取请求详情（含 curl）
- `browser_clear_requests` - 清空请求历史

## 使用示例

```javascript
// 1. 创建会话
const session = await callTool('browser_create_session');

// 2. 导航到页面
await callTool('browser_navigate', {
  sessionId: session.sessionId,
  url: 'https://example.com'
});

// 3. 搜索 API 请求
const results = await callTool('browser_search_requests', {
  sessionId: session.sessionId,
  keyword: 'api/data',
  searchIn: ['url']
});

// 4. 获取请求详情
const detail = await callTool('browser_get_request_detail', {
  sessionId: session.sessionId,
  requestId: results.matches[0].id
});

// 5. 关闭会话
await callTool('browser_close_session', {
  sessionId: session.sessionId
});
```

## 常见浏览器路径

**Windows:**
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

**macOS:**
- Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Edge: `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`

**Linux:**
- Chrome: `/usr/bin/google-chrome`
- Chromium: `/usr/bin/chromium-browser`