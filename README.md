# Playwright MCP Server

基于 Playwright 的 Model Context Protocol (MCP) 服务器，提供浏览器自动化功能。

## 功能特性

- **会话管理**：创建和管理多个独立的浏览器会话
- **并发支持**：支持多个并发浏览器会话，自动清理过期会话
- **浏览器操作**：导航、点击、输入等常用操作
- **灵活配置**：支持不同浏览器（Chromium、Firefox、WebKit）和模式（有头/无头）
- **自动清理**：会话超时后自动清理资源

## 安装

```bash
npm install
```

## 启动方式

### 方式 1：开发模式（推荐用于测试）

使用默认配置启动：
```bash
npm run dev
```

使用自定义参数启动：
```bash
npm run dev --browser chromium --headless false --executable-path "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

### 方式 2：生产模式

```bash
npm run build
npm start
```

### 方式 3：MCP 配置文件

在 MCP 配置文件（如 `.kiro/settings/mcp.json`）中添加：

**使用 Playwright 自带浏览器：**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "E:/Project/MyProject/PlaywrightMCPForCrawler/build/index.js",
        "--browser", "chromium",
        "--headless", "false",
        "--session-timeout", "300000",
        "--max-sessions", "10"
      ]
    }
  }
}
```

**使用本地 Chrome 浏览器（无需 playwright install）：**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "E:/Project/MyProject/PlaywrightMCPForCrawler/build/index.js",
        "--browser", "chromium",
        "--executable-path", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "--headless", "false",
        "--session-timeout", "600000",
        "--max-sessions", "5"
      ]
    }
  }
}
```

## 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--browser` | string | `chromium` | 浏览器类型：`chromium`、`firefox` 或 `webkit` |
| `--headless` | boolean | `false` | 是否使用无头模式（true/false） |
| `--session-timeout` | number | `300000` | 会话超时时间（毫秒），默认 5 分钟 |
| `--max-sessions` | number | `10` | 最大并发会话数 |
| `--executable-path` | string | 无 | 浏览器可执行文件路径（可选）。如不指定则使用 Playwright 自带浏览器 |

### 常见浏览器路径

**Windows:**
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

**macOS:**
- Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Edge: `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`

**Linux:**
- Chrome: `/usr/bin/google-chrome`
- Chromium: `/usr/bin/chromium-browser`

## 完整示例

### 示例 1：开发测试（使用本地 Chrome）
```bash
npm run dev -- --executable-path "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless false
```

### 示例 2：MCP 配置（最小配置）
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["E:/Project/MyProject/PlaywrightMCPForCrawler/build/index.js"]
    }
  }
}
```

### 示例 3：MCP 配置（完整配置）
```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": [
        "E:/Project/MyProject/PlaywrightMCPForCrawler/build/index.js",
        "--browser", "chromium",
        "--executable-path", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "--headless", "false",
        "--session-timeout", "600000",
        "--max-sessions", "5"
      ]
    }
  }
}
```

## 可用工具

### create_session
创建新的浏览器会话。

**返回值：**
- `sessionId`：唯一会话标识符
- `expiresAt`：会话过期时间戳

### close_session
关闭现有浏览器会话。

**参数：**
- `sessionId`（必需）：要关闭的会话 ID

### navigate
在指定会话中导航到 URL。

**参数：**
- `sessionId`（必需）：会话 ID
- `url`（必需）：要导航到的 URL
- `waitUntil`（可选）：何时认为导航成功（load、domcontentloaded、networkidle）
- `timeout`（可选）：导航超时时间（毫秒）

**返回值：**
- `success`：导航是否成功
- `title`：页面标题
- `url`：最终 URL（重定向后）
- `status`：HTTP 状态码

### click
点击页面上的元素。

**参数：**
- `sessionId`（必需）：会话 ID
- `selector`（必需）：元素的 CSS 选择器或 XPath
- `timeout`（可选）：超时时间（毫秒）
- `force`（可选）：即使元素不可操作也强制点击
- `clickCount`（可选）：点击次数（默认：1）

### type
在输入元素中输入文本。

**参数：**
- `sessionId`（必需）：会话 ID
- `selector`（必需）：输入元素的 CSS 选择器或 XPath
- `text`（必需）：要输入的文本
- `delay`（可选）：按键之间的延迟（毫秒）
- `timeout`（可选）：超时时间（毫秒）
- `clear`（可选）：输入前是否清空（默认：false）

## 错误处理

所有操作返回结构化的错误响应：
- `errorCode`：机器可读的错误代码
- `message`：人类可读的错误描述
- `sessionId`：会话 ID（如适用）
- `details`：额外的错误上下文（如可用）

### 错误代码

- `SESSION_NOT_FOUND`：会话不存在
- `SESSION_EXPIRED`：会话已过期
- `MAX_SESSIONS_REACHED`：达到最大会话限制
- `NAVIGATION_FAILED`：导航操作失败
- `ELEMENT_NOT_FOUND`：页面上未找到元素
- `ELEMENT_NOT_CLICKABLE`：元素不可点击
- `ELEMENT_NOT_EDITABLE`：元素不可编辑
- `BROWSER_ERROR`：浏览器级别错误
- `INVALID_PARAMETERS`：提供的参数无效

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 运行测试
npm test

# 启动服务器
npm start
```

## 许可证

MIT
