# Implementation Plan

- [x] 1. 初始化项目结构和依赖
  - 创建 package.json，配置 TypeScript 和必要的依赖（@modelcontextprotocol/sdk, playwright, uuid）
  - 设置 tsconfig.json 用于 TypeScript 编译
  - 配置 Jest 测试框架和 fast-check 属性测试库
  - 创建基础目录结构（src/, tests/）
  - _Requirements: 9.1_

- [x] 2. 实现配置管理模块
  - [x] 2.1 创建 ServerConfig 接口和默认配置
    - 定义 ServerConfig 类型
    - 实现配置解析函数，从命令行参数读取配置
    - 设置默认值：browser=chromium, headless=false, sessionTimeout=300000, maxSessions=10
    - _Requirements: 6.1, 6.3, 6.5, 6.7_
  
  - [ ]* 2.2 编写配置解析的属性测试
    - **Property 7: Browser Type Configuration**
    - **Property 8: Headless Mode Configuration**
    - **Property 9: Session Timeout Configuration**
    - **Property 10: Max Sessions Configuration**
    - **Validates: Requirements 6.2, 6.4, 6.6, 6.8**

- [x] 3. 实现 SessionManager 核心类
  - [x] 3.1 创建 SessionContext 接口和 SessionManager 类骨架
    - 定义 SessionContext 接口
    - 实现 SessionManager 类的基本结构和私有属性（sessions Map, browser, config）
    - _Requirements: 1.2, 7.1_
  
  - [x] 3.2 实现 initialize() 方法
    - 启动共享的 Playwright Browser 实例
    - 根据配置选择浏览器类型和 headless 模式
    - _Requirements: 7.1, 6.2, 6.4_
  
  - [x] 3.3 实现 createSession() 方法
    - 检查是否达到 maxSessions 限制
    - 生成 UUID v4 作为 sessionId
    - 创建 BrowserContext 和 Page
    - 计算过期时间并调度自动清理
    - 存储到 sessions Map
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.2_
  
  - [x] 3.4 实现 closeSession() 方法
    - 验证 sessionId 存在
    - 关闭 Page 和 BrowserContext
    - 取消自动清理定时器
    - 从 sessions Map 移除
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 3.5 实现 validateSession() 方法
    - 检查 sessionId 是否存在
    - 检查会话是否过期
    - 返回验证结果和错误信息
    - _Requirements: 2.4, 3.3_
  
  - [x] 3.6 实现 scheduleCleanup() 和 cleanupSession() 私有方法
    - 使用 setTimeout 安排自动清理
    - 在过期时自动关闭会话
    - _Requirements: 1.4, 2.5_
  
  - [x] 3.7 实现 shutdown() 方法
    - 关闭所有活动会话
    - 关闭共享的 Browser 实例
    - _Requirements: 7.4_
  
  - [ ]* 3.8 编写 SessionManager 的属性测试
    - **Property 1: SessionId Uniqueness**
    - **Property 2: Session Expiration Time Calculation**
    - **Property 3: Session Closure Removes SessionId**
    - **Property 11: Shared Browser Instance**
    - **Property 12: Session Isolation**
    - **Validates: Requirements 1.1, 1.3, 2.3, 7.2, 7.5**

- [x] 4. 实现错误处理模块
  - [x] 4.1 创建 ErrorResponse 接口和错误构造函数
    - 定义 ErrorResponse 类型
    - 实现各种错误码的构造函数（SESSION_NOT_FOUND, SESSION_EXPIRED, MAX_SESSIONS_REACHED 等）
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 4.2 编写错误响应格式的属性测试
    - **Property 13: Error Response Structure**
    - **Property 14: Session-Related Errors Include SessionId**
    - **Property 15: Distinct Error Codes for Different Failures**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.5**

- [x] 5. 实现 MCP 工具处理器
  - [x] 5.1 实现 create_session 工具处理器
    - 调用 SessionManager.createSession()
    - 返回 sessionId 和 expiresAt
    - 处理 MAX_SESSIONS_REACHED 错误
    - _Requirements: 1.1, 1.5_
  
  - [x] 5.2 实现 close_session 工具处理器
    - 验证参数
    - 调用 SessionManager.closeSession()
    - 处理 SESSION_NOT_FOUND 错误
    - _Requirements: 2.1, 2.4_
  
  - [ ]* 5.3 编写 create_session 和 close_session 的属性测试
    - **Property 4: Invalid SessionId Returns Consistent Error**
    - **Validates: Requirements 2.4**
  
  - [x] 5.4 实现 navigate 工具处理器
    - 验证参数和会话
    - 调用 page.goto() 执行导航
    - 返回页面标题、最终 URL 和状态码
    - 处理 SESSION_NOT_FOUND, SESSION_EXPIRED, NAVIGATION_FAILED 错误
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 5.5 编写 navigate 的属性测试
    - **Property 5: Navigation Returns Complete Response**
    - **Validates: Requirements 3.2**
  
  - [x] 5.6 实现 click 工具处理器
    - 验证参数和会话
    - 调用 page.click() 执行点击
    - 支持可选参数（timeout, force, clickCount）
    - 返回成功状态
    - 处理 SESSION_NOT_FOUND, SESSION_EXPIRED, ELEMENT_NOT_FOUND, ELEMENT_NOT_CLICKABLE 错误
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.7 实现 type 工具处理器
    - 验证参数和会话
    - 可选清空输入框
    - 调用 page.type() 执行输入
    - 支持可选参数（delay, timeout, clear）
    - 返回成功状态
    - 处理 SESSION_NOT_FOUND, SESSION_EXPIRED, ELEMENT_NOT_FOUND, ELEMENT_NOT_EDITABLE 错误
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 5.8 编写 click 和 type 的属性测试
    - **Property 6: Successful Operations Return Success Field**
    - **Validates: Requirements 4.2, 5.2**

- [x] 6. 实现 MCP Server 主程序
  - [x] 6.1 创建 MCP Server 实例并注册工具
    - 使用 @modelcontextprotocol/sdk 创建 Server
    - 注册所有工具（create_session, close_session, navigate, click, type）
    - 为每个工具提供描述和参数 schema
    - _Requirements: 9.5_
  
  - [x] 6.2 实现工具调用路由
    - 设置 CallToolRequestHandler
    - 根据工具名称分发到对应的处理器
    - 统一错误处理和响应格式化
    - _Requirements: 9.4_
  
  - [x] 6.3 实现 stdio 传输层
    - 配置 Server 使用 stdio 传输
    - 处理服务器启动和关闭
    - 在关闭时调用 SessionManager.shutdown()
    - _Requirements: 9.3, 7.4_
  
  - [x] 6.4 实现命令行入口
    - 解析命令行参数
    - 初始化配置
    - 启动 MCP Server
    - _Requirements: 9.2_

- [x] 7. 配置 npm 包发布
  - [x] 7.1 配置 package.json 的 bin 字段
    - 设置可执行文件入口
    - 配置 npm scripts（build, test）
    - _Requirements: 9.1_
  
  - [x] 7.2 创建 README.md 文档
    - 说明安装和使用方法
    - 提供 MCP 配置示例
    - 列出所有可用工具和参数
    - _Requirements: 9.1_

- [-] 8. 最终检查点
  - 确保所有测试通过，如有问题请询问用户
