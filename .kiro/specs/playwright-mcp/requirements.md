# Requirements Document

## Introduction

本文档定义了一个基于 Playwright 的 Model Context Protocol (MCP) 服务器的需求。该服务器提供浏览器自动化能力，支持多个并发会话，每个会话通过唯一的 sessionId 进行隔离管理。服务器通过 MCP 协议暴露工具接口，允许 AI Agent 执行浏览器操作如导航、点击、输入等。

## Glossary

- **MCP Server**: Model Context Protocol 服务器，遵循 MCP 协议规范的服务端程序
- **Session**: 浏览器会话，包含独立的 BrowserContext 和 Page 实例
- **SessionId**: 会话的唯一标识符，使用 UUID v4 格式
- **BrowserContext**: Playwright 的浏览器上下文，提供会话隔离（cookies、storage 等）
- **Page**: Playwright 的页面对象，代表一个浏览器标签页
- **Browser Instance**: Playwright 的浏览器实例，所有会话共享
- **Agent**: 调用 MCP Server 的 AI 客户端
- **Startup Parameters**: 服务器启动时通过命令行参数传递的配置选项

## Requirements

### Requirement 1

**User Story:** 作为 Agent，我希望能够创建新的浏览器会话，以便开始执行浏览器自动化任务

#### Acceptance Criteria

1. WHEN Agent 调用 create_session 工具 THEN the MCP Server SHALL 生成唯一的 sessionId 并返回给 Agent
2. WHEN 创建新会话 THEN the MCP Server SHALL 创建新的 BrowserContext 和 Page 实例并关联到该 sessionId
3. WHEN 创建新会话 THEN the MCP Server SHALL 设置会话过期时间为当前时间加上配置的超时时长
4. WHEN 创建新会话 THEN the MCP Server SHALL 启动自动清理定时器，在过期时间到达时自动关闭会话
5. WHEN 会话数量已达到最大限制 THEN the MCP Server SHALL 返回错误信息，包含错误码 "MAX_SESSIONS_REACHED" 和描述信息

### Requirement 2

**User Story:** 作为 Agent，我希望能够手动关闭不再需要的会话，以便释放系统资源

#### Acceptance Criteria

1. WHEN Agent 调用 close_session 工具并提供有效的 sessionId THEN the MCP Server SHALL 关闭对应的 Page 和 BrowserContext
2. WHEN 关闭会话 THEN the MCP Server SHALL 取消该会话的自动清理定时器
3. WHEN 关闭会话 THEN the MCP Server SHALL 从会话管理器中移除该 sessionId
4. WHEN Agent 提供不存在的 sessionId THEN the MCP Server SHALL 返回错误信息，包含错误码 "SESSION_NOT_FOUND" 和描述信息
5. WHEN 会话已过期 THEN the MCP Server SHALL 自动执行关闭流程并清理所有相关资源

### Requirement 3

**User Story:** 作为 Agent，我希望能够导航到指定的 URL，以便访问目标网页

#### Acceptance Criteria

1. WHEN Agent 调用 navigate 工具并提供有效的 sessionId 和 url THEN the MCP Server SHALL 使用对应会话的 Page 导航到该 URL
2. WHEN 导航成功完成 THEN the MCP Server SHALL 返回页面标题、最终 URL 和加载状态
3. WHEN Agent 提供不存在或已过期的 sessionId THEN the MCP Server SHALL 返回错误信息，包含错误码 "SESSION_NOT_FOUND" 或 "SESSION_EXPIRED" 和描述信息
4. WHEN 导航操作超时或失败 THEN the MCP Server SHALL 返回错误信息，包含错误码 "NAVIGATION_FAILED" 和详细错误描述
5. WHEN 导航到新页面 THEN the MCP Server SHALL 等待页面加载完成后再返回结果

### Requirement 4

**User Story:** 作为 Agent，我希望能够点击页面元素，以便与网页进行交互

#### Acceptance Criteria

1. WHEN Agent 调用 click 工具并提供有效的 sessionId 和 selector THEN the MCP Server SHALL 在对应会话的页面中查找并点击该元素
2. WHEN 点击操作成功 THEN the MCP Server SHALL 返回成功状态和操作结果信息
3. WHEN 元素不存在或不可点击 THEN the MCP Server SHALL 返回错误信息，包含错误码 "ELEMENT_NOT_FOUND" 或 "ELEMENT_NOT_CLICKABLE" 和描述信息
4. WHEN Agent 提供不存在或已过期的 sessionId THEN the MCP Server SHALL 返回错误信息，包含错误码 "SESSION_NOT_FOUND" 或 "SESSION_EXPIRED" 和描述信息
5. WHERE Agent 提供可选的 options 参数 THEN the MCP Server SHALL 使用这些选项（如 timeout、force）执行点击操作

### Requirement 5

**User Story:** 作为 Agent，我希望能够在输入框中输入文本，以便填写表单或搜索内容

#### Acceptance Criteria

1. WHEN Agent 调用 type 工具并提供有效的 sessionId、selector 和 text THEN the MCP Server SHALL 在对应会话的页面中查找该元素并输入文本
2. WHEN 输入操作成功 THEN the MCP Server SHALL 返回成功状态和操作结果信息
3. WHEN 元素不存在或不可输入 THEN the MCP Server SHALL 返回错误信息，包含错误码 "ELEMENT_NOT_FOUND" 或 "ELEMENT_NOT_EDITABLE" 和描述信息
4. WHEN Agent 提供不存在或已过期的 sessionId THEN the MCP Server SHALL 返回错误信息，包含错误码 "SESSION_NOT_FOUND" 或 "SESSION_EXPIRED" 和描述信息
5. WHERE Agent 提供可选的 options 参数（如 delay） THEN the MCP Server SHALL 使用这些选项模拟真实的输入行为

### Requirement 6

**User Story:** 作为系统管理员，我希望能够通过启动参数配置服务器行为，以便适应不同的使用场景

#### Acceptance Criteria

1. WHEN 服务器启动时未提供 browser 参数 THEN the MCP Server SHALL 使用 chromium 作为默认浏览器类型
2. WHERE 服务器启动时提供 browser 参数 THEN the MCP Server SHALL 使用指定的浏览器类型（chromium、firefox 或 webkit）
3. WHEN 服务器启动时未提供 headless 参数 THEN the MCP Server SHALL 以有头模式（headless=false）启动浏览器
4. WHERE 服务器启动时提供 headless 参数 THEN the MCP Server SHALL 根据参数值决定是否使用无头模式
5. WHEN 服务器启动时未提供 sessionTimeout 参数 THEN the MCP Server SHALL 使用 5 分钟作为默认会话超时时长
6. WHERE 服务器启动时提供 sessionTimeout 参数 THEN the MCP Server SHALL 使用指定的超时时长（单位：毫秒）
7. WHEN 服务器启动时未提供 maxSessions 参数 THEN the MCP Server SHALL 使用 10 作为默认最大会话数
8. WHERE 服务器启动时提供 maxSessions 参数 THEN the MCP Server SHALL 使用指定的最大会话数限制

### Requirement 7

**User Story:** 作为开发者，我希望服务器能够共享单个 Browser 实例，以便节省系统资源并提高性能

#### Acceptance Criteria

1. WHEN 服务器启动 THEN the MCP Server SHALL 创建单个共享的 Browser 实例
2. WHEN 创建新会话 THEN the MCP Server SHALL 使用共享的 Browser 实例创建新的 BrowserContext
3. WHEN 所有会话都已关闭 THEN the MCP Server SHALL 保持 Browser 实例运行，以便快速创建新会话
4. WHEN 服务器关闭 THEN the MCP Server SHALL 关闭所有活动会话和共享的 Browser 实例
5. WHILE 多个会话同时运行 THEN the MCP Server SHALL 通过 BrowserContext 确保会话之间的完全隔离（cookies、localStorage、sessionStorage）

### Requirement 8

**User Story:** 作为 Agent，我希望收到结构化的错误信息，以便能够正确处理错误情况并采取适当的行动

#### Acceptance Criteria

1. WHEN 操作失败 THEN the MCP Server SHALL 返回包含 errorCode 字段的错误对象
2. WHEN 操作失败 THEN the MCP Server SHALL 返回包含 message 字段的错误对象，提供人类可读的错误描述
3. WHERE 错误与特定会话相关 THEN the MCP Server SHALL 在错误对象中包含 sessionId 字段
4. WHERE 错误包含额外的上下文信息 THEN the MCP Server SHALL 在错误对象中包含 details 字段
5. WHEN 会话不存在或已过期 THEN the MCP Server SHALL 返回明确的错误码，使 Agent 能够识别需要创建新会话

### Requirement 9

**User Story:** 作为用户，我希望能够通过标准的 MCP 配置方式使用该服务器，以便轻松集成到支持 MCP 的 AI 工具中

#### Acceptance Criteria

1. WHEN 服务器作为 npm 包发布 THEN the MCP Server SHALL 支持通过 npx 命令直接运行
2. WHEN 在 MCP 配置文件中配置服务器 THEN the MCP Server SHALL 接受通过 args 数组传递的启动参数
3. WHEN 服务器启动 THEN the MCP Server SHALL 通过标准输入输出（stdio）与 MCP 客户端通信
4. WHEN 服务器接收到 MCP 协议消息 THEN the MCP Server SHALL 按照 MCP 规范解析和响应消息
5. WHEN 服务器启动 THEN the MCP Server SHALL 注册所有可用的工具（create_session、close_session、navigate、click、type）并提供工具描述
