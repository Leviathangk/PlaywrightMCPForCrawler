# Design Document

## Overview

Playwright MCP Server 是一个基于 Model Context Protocol 的浏览器自动化服务器，使用 Playwright 提供浏览器控制能力。服务器采用会话管理架构，支持多个并发的隔离会话，每个会话通过唯一的 sessionId 标识。所有会话共享单个 Browser 实例，通过 BrowserContext 实现隔离，确保资源高效利用的同时保证会话独立性。

服务器通过 stdio 与 MCP 客户端通信，暴露一组工具接口供 AI Agent 调用，实现网页导航、元素交互等自动化操作。

## Architecture

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Client (AI)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ stdio (JSON-RPC)
┌───────────────────────────▼─────────────────────────────────┐
│                     MCP Server Layer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tool Handlers (create_session, navigate, click, etc.) │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   Session Manager                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sessions Map: sessionId -> SessionContext           │  │
│  │  - context: BrowserContext                           │  │
│  │  - page: Page                                        │  │
│  │  - createdAt: timestamp                              │  │
│  │  - expiresAt: timestamp                              │  │
│  │  - timeoutHandle: NodeJS.Timeout                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Configuration:                                              │
│  - maxSessions: number                                       │
│  - sessionTimeout: number (ms)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Playwright Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Shared Browser Instance (chromium/firefox/webkit)   │  │
│  │    ├─ BrowserContext 1 -> Page 1                     │  │
│  │    ├─ BrowserContext 2 -> Page 2                     │  │
│  │    └─ BrowserContext N -> Page N                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

1. **MCP Server Layer**: 处理 MCP 协议通信，注册和分发工具调用
2. **Session Manager**: 管理会话生命周期、验证 sessionId、执行自动清理
3. **Playwright Layer**: 封装 Playwright API，提供浏览器操作能力

## Components and Interfaces

### 1. Configuration Interface

```typescript
interface ServerConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  sessionTimeout: number; // 毫秒
  maxSessions: number;
}
```

**默认值：**
- `browser`: 'chromium'
- `headless`: false
- `sessionTimeout`: 300000 (5 分钟)
- `maxSessions`: 10

### 2. Session Context

```typescript
interface SessionContext {
  sessionId: string;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  expiresAt: number;
  timeoutHandle: NodeJS.Timeout;
}
```

### 3. Error Response

```typescript
interface ErrorResponse {
  errorCode: string;
  message: string;
  sessionId?: string;
  details?: any;
}
```

**错误码定义：**
- `SESSION_NOT_FOUND`: 会话不存在
- `SESSION_EXPIRED`: 会话已过期
- `MAX_SESSIONS_REACHED`: 达到最大会话数限制
- `NAVIGATION_FAILED`: 导航失败
- `ELEMENT_NOT_FOUND`: 元素未找到
- `ELEMENT_NOT_CLICKABLE`: 元素不可点击
- `ELEMENT_NOT_EDITABLE`: 元素不可编辑
- `BROWSER_ERROR`: 浏览器层面错误
- `INVALID_PARAMETERS`: 参数无效

### 4. Tool Interfaces

#### create_session

**输入：**
```typescript
{
  // 当前版本无额外参数，使用服务器配置的默认超时
}
```

**输出：**
```typescript
{
  sessionId: string;
  expiresAt: number; // Unix timestamp
  message: string;
}
```

#### close_session

**输入：**
```typescript
{
  sessionId: string;
}
```

**输出：**
```typescript
{
  success: boolean;
  message: string;
}
```

#### navigate

**输入：**
```typescript
{
  sessionId: string;
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}
```

**输出：**
```typescript
{
  success: boolean;
  title: string;
  url: string; // 最终 URL（可能重定向）
  status: number; // HTTP 状态码
}
```

#### click

**输入：**
```typescript
{
  sessionId: string;
  selector: string; // CSS 或 XPath
  timeout?: number;
  force?: boolean;
  clickCount?: number; // 点击次数，默认 1
}
```

**输出：**
```typescript
{
  success: boolean;
  message: string;
}
```

#### type

**输入：**
```typescript
{
  sessionId: string;
  selector: string;
  text: string;
  delay?: number; // 每个字符之间的延迟（毫秒）
  timeout?: number;
  clear?: boolean; // 是否先清空输入框
}
```

**输出：**
```typescript
{
  success: boolean;
  message: string;
}
```

## Data Models

### SessionManager Class

```typescript
class SessionManager {
  private sessions: Map<string, SessionContext>;
  private browser: Browser | null;
  private config: ServerConfig;

  constructor(config: ServerConfig);
  
  async initialize(): Promise<void>;
  async createSession(): Promise<{ sessionId: string; expiresAt: number }>;
  async closeSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): SessionContext | null;
  validateSession(sessionId: string): { valid: boolean; error?: ErrorResponse };
  private scheduleCleanup(sessionId: string, timeout: number): void;
  private cleanupSession(sessionId: string): Promise<void>;
  async shutdown(): Promise<void>;
}
```

**核心逻辑：**

1. **initialize()**: 启动共享的 Browser 实例
2. **createSession()**: 
   - 检查是否达到 maxSessions 限制
   - 生成 UUID v4 作为 sessionId
   - 创建 BrowserContext 和 Page
   - 设置过期时间和清理定时器
   - 存储到 sessions Map
3. **validateSession()**: 
   - 检查 sessionId 是否存在
   - 检查是否已过期
   - 返回验证结果和错误信息
4. **scheduleCleanup()**: 使用 setTimeout 安排自动清理
5. **cleanupSession()**: 关闭 Page、Context，清除定时器，从 Map 移除

### Tool Handler Functions

每个工具处理函数遵循统一模式：

```typescript
async function handleToolCall(
  sessionManager: SessionManager,
  args: any
): Promise<any> {
  // 1. 验证参数
  // 2. 验证会话（如需要）
  // 3. 执行 Playwright 操作
  // 4. 捕获错误并返回结构化响应
  // 5. 返回成功结果
}
```

## Error Handling

### 错误处理策略

1. **会话验证错误**：在每个需要 sessionId 的操作开始时验证
   - 不存在：返回 `SESSION_NOT_FOUND`
   - 已过期：返回 `SESSION_EXPIRED`

2. **Playwright 操作错误**：使用 try-catch 捕获
   - TimeoutError：转换为对应的错误码（如 `ELEMENT_NOT_FOUND`）
   - 其他错误：返回 `BROWSER_ERROR` 并包含原始错误信息

3. **资源限制错误**：
   - 达到最大会话数：返回 `MAX_SESSIONS_REACHED`

4. **参数验证错误**：
   - 缺少必需参数：返回 `INVALID_PARAMETERS`

### 错误响应格式

所有错误统一返回以下格式：

```typescript
{
  isError: true,
  content: [{
    type: "text",
    text: JSON.stringify({
      errorCode: "ERROR_CODE",
      message: "Human readable message",
      sessionId: "optional-session-id",
      details: { /* optional additional context */ }
    })
  }]
}
```

## Testing Strategy

### 测试框架

- **单元测试**: Jest
- **属性测试**: fast-check (JavaScript/TypeScript 的 PBT 库)
- **最小迭代次数**: 100 次

### 测试分层

1. **SessionManager 单元测试**
   - 会话创建和销毁
   - 过期时间计算
   - 并发限制
   - 自动清理机制

2. **Tool Handler 单元测试**
   - 参数验证
   - 错误处理
   - 成功路径

3. **集成测试**
   - 完整的会话生命周期
   - 多会话并发
   - 浏览器操作端到端测试

4. **属性测试**
   - 会话管理属性
   - 错误处理一致性



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SessionId Uniqueness
*For any* sequence of session creation calls, all returned sessionIds should be unique (no duplicates)
**Validates: Requirements 1.1**

### Property 2: Session Expiration Time Calculation
*For any* configured timeout value, when a session is created, the expiresAt timestamp should equal createdAt plus the timeout duration
**Validates: Requirements 1.3**

### Property 3: Session Closure Removes SessionId
*For any* valid session, after calling close_session, that sessionId should no longer exist in the session manager
**Validates: Requirements 2.3**

### Property 4: Invalid SessionId Returns Consistent Error
*For any* operation requiring a sessionId (navigate, click, type, close_session), providing a non-existent sessionId should return an error with errorCode "SESSION_NOT_FOUND"
**Validates: Requirements 2.4, 3.3, 4.4, 5.4**

### Property 5: Navigation Returns Complete Response
*For any* successful navigation operation, the response should contain title, url, and status fields
**Validates: Requirements 3.2**

### Property 6: Successful Operations Return Success Field
*For any* successful click or type operation, the response should contain a success field set to true
**Validates: Requirements 4.2, 5.2**

### Property 7: Browser Type Configuration
*For any* valid browser type parameter (chromium, firefox, webkit), the server should initialize with that browser type
**Validates: Requirements 6.2**

### Property 8: Headless Mode Configuration
*For any* boolean value provided for the headless parameter, the browser should launch in the corresponding mode
**Validates: Requirements 6.4**

### Property 9: Session Timeout Configuration
*For any* valid timeout value provided as a startup parameter, sessions should use that timeout duration
**Validates: Requirements 6.6**

### Property 10: Max Sessions Configuration
*For any* valid maxSessions value provided as a startup parameter, the server should enforce that limit
**Validates: Requirements 6.8**

### Property 11: Shared Browser Instance
*For any* number of sessions created, all should share the same Browser instance (verified by internal reference equality)
**Validates: Requirements 7.2**

### Property 12: Session Isolation
*For any* two concurrent sessions, setting a cookie or localStorage item in one session should not be visible in the other session
**Validates: Requirements 7.5**

### Property 13: Error Response Structure
*For any* operation that fails, the error response should contain both errorCode and message fields
**Validates: Requirements 8.1, 8.2**

### Property 14: Session-Related Errors Include SessionId
*For any* error related to a specific session, the error response should include the sessionId field
**Validates: Requirements 8.3**

### Property 15: Distinct Error Codes for Different Failures
*For any* two different error scenarios (e.g., session not found vs. element not found), the errorCode values should be different
**Validates: Requirements 8.5**

