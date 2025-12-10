# 网络请求捕获功能说明

## 功能概述

Playwright MCP Server 现在支持自动捕获和搜索网络请求，专为爬虫场景设计。

## 核心特性

### 1. 自动捕获
- ✅ 创建会话时自动开启网络监听
- ✅ 捕获所有类型的请求（XHR、Fetch、Document 等）
- ✅ 记录完整的请求和响应数据
- ✅ 自动限制历史记录数量（默认 1000 条）

### 2. 强大搜索
- ✅ 支持关键词搜索
- ✅ 支持正则表达式
- ✅ 可搜索 URL、请求体、响应体
- ✅ 返回匹配的上下文片段

### 3. 导出 curl
- ✅ 自动生成 curl 命令
- ✅ 包含完整的 headers 和 body
- ✅ 可直接在终端执行

## 使用场景

### 场景 1：找到数据来源 API

```javascript
// 1. 创建会话并访问页面
const session = await callTool('create_session');
await callTool('navigate', {
  sessionId: session.sessionId,
  url: 'https://example.com/products'
});

// 2. 等待页面加载完成
await new Promise(resolve => setTimeout(resolve, 3000));

// 3. 搜索包含"商品列表"的 API
const results = await callTool('search_requests', {
  sessionId: session.sessionId,
  keyword: '商品列表',
  searchIn: ['response']
});

// 4. 获取 curl 命令
const detail = await callTool('get_request_detail', {
  sessionId: session.sessionId,
  requestId: results.matches[0].id
});

console.log(detail.curl);
// 输出：curl -X POST 'https://api.example.com/products/list' ...
```

### 场景 2：分析登录接口

```javascript
// 1. 创建会话
const session = await callTool('create_session');

// 2. 访问登录页
await callTool('navigate', {
  sessionId: session.sessionId,
  url: 'https://example.com/login'
});

// 3. 填写表单并提交
await callTool('type', {
  sessionId: session.sessionId,
  selector: '#username',
  text: 'test@example.com'
});

await callTool('type', {
  sessionId: session.sessionId,
  selector: '#password',
  text: 'password123'
});

await callTool('click', {
  sessionId: session.sessionId,
  selector: '#submit'
});

// 4. 等待登录完成
await new Promise(resolve => setTimeout(resolve, 2000));

// 5. 搜索登录 API
const loginRequests = await callTool('search_requests', {
  sessionId: session.sessionId,
  keyword: 'login',
  searchIn: ['url']
});

// 6. 查看登录请求详情
const loginDetail = await callTool('get_request_detail', {
  sessionId: session.sessionId,
  requestId: loginRequests.matches[0].id
});

console.log('登录接口:', loginDetail.url);
console.log('请求方法:', loginDetail.method);
console.log('请求头:', loginDetail.request.headers);
console.log('请求体:', loginDetail.request.postData);
console.log('响应:', loginDetail.response.body);
```

### 场景 3：批量获取 API 列表

```javascript
// 获取所有 POST 请求
const postRequests = await callTool('get_requests', {
  sessionId: session.sessionId,
  filter: {
    method: 'POST',
    resourceType: 'xhr'
  },
  limit: 100
});

// 遍历所有请求
for (const req of postRequests.requests) {
  console.log(`${req.method} ${req.url} - ${req.status}`);
}
```

### 场景 4：使用正则表达式

```javascript
// 搜索所有 /api/v1/ 开头的接口
const apiRequests = await callTool('search_requests', {
  sessionId: session.sessionId,
  keyword: '^https://.*\\/api\\/v1\\/',
  searchIn: ['url'],
  isRegex: true
});

// 搜索响应中包含 JSON 数组的请求
const arrayResponses = await callTool('search_requests', {
  sessionId: session.sessionId,
  keyword: '\\[\\s*\\{',
  searchIn: ['response'],
  isRegex: true
});
```

## 性能优化

### 请求数量限制
默认每个会话最多保存 1000 条请求，超过后自动删除最旧的请求。

可通过配置调整：
```bash
npm run dev -- --max-network-requests 2000
```

### 清空历史
对于长时间运行的会话，可以手动清空历史：
```javascript
await callTool('clear_requests', {
  sessionId: session.sessionId
});
```

## 注意事项

1. **响应体大小**：大文件（如图片、视频）的响应体可能很大，建议过滤掉这些请求
2. **内存占用**：捕获大量请求会占用内存，注意设置合理的 `max-network-requests`
3. **异步请求**：某些 API 可能在页面加载后才触发，需要等待或触发相应操作
4. **CORS 限制**：某些请求可能因为 CORS 而无法获取响应体

## 完整测试示例

运行测试脚本查看完整示例：
```bash
node test-mcp-client.js
```

测试脚本会：
1. 创建会话
2. 访问百度并搜索
3. 访问必应并搜索
4. 搜索包含"百度"的请求
5. 获取所有 XHR 请求
6. 查看请求详情和 curl 命令
