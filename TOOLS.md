# 工具列表

## 📋 所有可用工具

### 🔧 安装工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_install` | 安装 Playwright 浏览器 | `browser`: chromium/firefox/webkit/all<br>`withDeps`: 是否安装系统依赖 |

### 🌐 会话管理

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_create_session` | 创建浏览器会话 | 无 |
| `browser_close_session` | 关闭浏览器会话 | `sessionId`: 会话 ID |

### 🚀 页面导航

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_navigate` | 导航到指定 URL | `sessionId`: 会话 ID<br>`url`: 目标 URL<br>`waitUntil`: 等待条件（load/domcontentloaded/networkidle）<br>`timeout`: 超时时间 |

### 🖱️ 页面交互

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_click` | 点击元素 | `sessionId`: 会话 ID<br>`selector`: CSS 选择器<br>`timeout`: 超时时间<br>`force`: 是否强制点击<br>`clickCount`: 点击次数 |
| `browser_type` | 输入文本 | `sessionId`: 会话 ID<br>`selector`: CSS 选择器<br>`text`: 输入文本<br>`delay`: 按键延迟<br>`clear`: 是否先清空 |
| `browser_scroll` | 滚动页面 | `sessionId`: 会话 ID<br>`target`: top/bottom/element<br>`selector`: 元素选择器（target=element 时）<br>`x`: 横向位置<br>`y`: 纵向位置<br>`smooth`: 是否平滑滚动 |

### 🔍 页面分析

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_get_page_structure` | 获取页面可交互元素结构 | `sessionId`: 会话 ID<br>`selector`: 分析区域选择器<br>`includeHidden`: 是否包含隐藏元素<br>`maxElements`: 最大元素数量 |
| `browser_find_element_by_text` | 根据文本查找元素 | `sessionId`: 会话 ID<br>`text`: 搜索文本<br>`exact`: 是否精确匹配<br>`elementType`: link/button/any |
| `browser_query_selector` | 查询元素详细信息 | `sessionId`: 会话 ID<br>`selector`: CSS 选择器<br>`multiple`: 是否返回多个<br>`includeAttributes`: 是否包含属性 |
| `browser_get_text_content` | 获取元素文本内容 | `sessionId`: 会话 ID<br>`selector`: CSS 选择器 |
| `browser_get_page_content` | 获取页面内容 | `sessionId`: 会话 ID<br>`format`: html/text/markdown<br>`selector`: 元素选择器（可选） |

### 📸 截图工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_screenshot` | 截取页面或元素 | `sessionId`: 会话 ID<br>`path`: 保存路径（绝对路径）<br>`selector`: 元素选择器（可选）<br>`fullPage`: 是否全页截图 |

### ⏱️ 等待工具

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_wait_for_element` | 等待元素出现 | `sessionId`: 会话 ID<br>`selector`: CSS 选择器<br>`timeout`: 超时时间<br>`state`: attached/detached/visible/hidden |

### 🌐 网络请求捕获

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_search_requests` | 搜索网络请求 | `sessionId`: 会话 ID<br>`keyword`: 搜索关键词<br>`searchIn`: url/request/response<br>`isRegex`: 是否正则表达式<br>`limit`: 结果数量限制 |
| `browser_get_requests` | 获取所有网络请求 | `sessionId`: 会话 ID<br>`filter`: 过滤条件（method/urlContains/resourceType/statusCode）<br>`limit`: 结果数量限制 |
| `browser_get_request_detail` | 获取请求详细信息 | `sessionId`: 会话 ID<br>`requestId`: 请求 ID |
| `browser_clear_requests` | 清空请求历史 | `sessionId`: 会话 ID |

### 💻 脚本执行

| 工具名 | 说明 | 参数 |
|--------|------|------|
| `browser_execute_script` | 执行自定义 JavaScript | `sessionId`: 会话 ID<br>`script`: JavaScript 代码<br>`args`: 参数数组 |

---

## 📝 使用示例

### 基础流程
```javascript
// 1. 创建会话
const session = await callTool('browser_create_session');

// 2. 导航到页面
await callTool('browser_navigate', {
  sessionId: session.sessionId,
  url: 'https://example.com'
});

// 3. 查找元素
const element = await callTool('browser_find_element_by_text', {
  sessionId: session.sessionId,
  text: '登录'
});

// 4. 点击元素
await callTool('browser_click', {
  sessionId: session.sessionId,
  selector: element.selector
});

// 5. 关闭会话
await callTool('browser_close_session', {
  sessionId: session.sessionId
});
```

### 网络请求捕获
```javascript
// 搜索包含特定数据的 API
const results = await callTool('browser_search_requests', {
  sessionId: session.sessionId,
  keyword: '用户数据',
  searchIn: ['response'],
  limit: 10
});

// 获取请求详情（包含 curl 命令）
const detail = await callTool('browser_get_request_detail', {
  sessionId: session.sessionId,
  requestId: results.matches[0].id
});
```

### 页面分析
```javascript
// 获取页面结构
const structure = await callTool('browser_get_page_structure', {
  sessionId: session.sessionId,
  maxElements: 50
});

// 获取页面 HTML
const content = await callTool('browser_get_page_content', {
  sessionId: session.sessionId,
  format: 'html'
});

// 截图
await callTool('browser_screenshot', {
  sessionId: session.sessionId,
  path: '/absolute/path/to/screenshot.png',
  fullPage: true
});
```

### 高级操作
```javascript
// 滚动加载更多
await callTool('browser_scroll', {
  sessionId: session.sessionId,
  target: 'bottom',
  smooth: true
});

// 执行自定义脚本
const result = await callTool('browser_execute_script', {
  sessionId: session.sessionId,
  script: `
    return {
      title: document.title,
      links: document.querySelectorAll('a').length
    };
  `
});
```

---

## 🎯 常见使用场景

### 场景 1：网页爬虫
1. `browser_create_session` - 创建会话
2. `browser_navigate` - 打开页面
3. `browser_scroll` - 滚动加载更多
4. `browser_get_page_content` - 获取内容
5. `browser_close_session` - 关闭会话

### 场景 2：API 接口分析
1. `browser_create_session` - 创建会话
2. `browser_navigate` - 打开页面
3. `browser_search_requests` - 搜索 API 请求
4. `browser_get_request_detail` - 获取请求详情（curl）
5. `browser_close_session` - 关闭会话

### 场景 3：自动化测试
1. `browser_create_session` - 创建会话
2. `browser_navigate` - 打开页面
3. `browser_find_element_by_text` - 查找元素
4. `browser_click` / `browser_type` - 交互操作
5. `browser_screenshot` - 截图验证
6. `browser_close_session` - 关闭会话

### 场景 4：页面理解（AI）
1. `browser_create_session` - 创建会话
2. `browser_navigate` - 打开页面
3. `browser_get_page_structure` - 获取页面结构
4. `browser_screenshot` - 截图
5. `browser_get_text_content` - 获取文本
6. AI 分析页面结构和内容
7. `browser_close_session` - 关闭会话

---

## 💡 提示

- 所有工具都需要先创建会话（`browser_create_session`）
- 网络请求会自动捕获，无需手动开启
- 截图路径必须是绝对路径
- 选择器支持 CSS 选择器
- 支持无头模式和有头模式
