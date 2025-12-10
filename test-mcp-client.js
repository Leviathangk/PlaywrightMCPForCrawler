/**
 * MCP 客户端测试脚本
 * 连接到 MCP 服务器并测试各种操作
 * 
 * 使用方法：
 * 1. 先启动服务器: npm run dev
 * 2. 再运行此脚本: node test-mcp-client.js
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class MCPTestClient {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  // 连接到 MCP 服务器
  async connect() {
    console.log('🔌 连接到 MCP 服务器...\n');

    // 创建传输层（SDK 会自动启动服务器进程）
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [
        'build/index.js',
        '--browser', 'chromium',
        '--executable-path', 'D:\\Download\\chrome-win\\chrome-win\\chrome.exe',
        '--headless', 'false'
      ]
    });

    // 创建客户端
    this.client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // 连接
    await this.client.connect(this.transport);
    console.log('✅ 已连接到服务器\n');
  }

  // 列出可用工具
  async listTools() {
    console.log('📋 获取可用工具列表...\n');
    const response = await this.client.listTools();
    
    console.log('可用工具:');
    response.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');
    
    return response.tools;
  }

  // 调用工具
  async callTool(name, args = {}) {
    console.log(`🔧 调用工具: ${name}`);
    if (Object.keys(args).length > 0) {
      console.log(`   参数:`, JSON.stringify(args, null, 2));
    }
    
    const response = await this.client.callTool({ name, arguments: args });
    
    if (response.isError) {
      console.log('❌ 错误:', response.content[0].text);
      return null;
    }
    
    const result = JSON.parse(response.content[0].text);
    console.log('✅ 结果:', JSON.stringify(result, null, 2));
    console.log('');
    
    return result;
  }

  // 关闭连接
  async close() {
    console.log('👋 关闭连接...\n');
    await this.client.close();
  }
}

// 运行测试
async function runTests() {
  const client = new MCPTestClient();

  try {
    // 连接服务器
    await client.connect();

    // 列出工具
    await client.listTools();

    console.log('='.repeat(60));
    console.log('开始测试');
    console.log('='.repeat(60) + '\n');

    // 测试 1: 创建会话
    console.log('【测试 1】创建会话');
    const session = await client.callTool('create_session');
    const sessionId = session.sessionId;
    console.log(`会话 ID: ${sessionId}\n`);

    // 测试 2: 导航到百度
    console.log('【测试 2】导航到百度');
    await client.callTool('navigate', {
      sessionId: sessionId,
      url: 'https://www.baidu.com',
      waitUntil: 'networkidle'
    });

    // 测试 3: 输入搜索关键词
    console.log('【测试 3】输入搜索关键词');
    await client.callTool('type', {
      sessionId: sessionId,
      selector: '#kw',
      text: 'MCP 协议测试'
    });

    // 测试 4: 点击搜索按钮
    console.log('【测试 4】点击搜索按钮');
    await client.callTool('click', {
      sessionId: sessionId,
      selector: '#su'
    });

    // 等待一下
    console.log('⏳ 等待 5 秒观察结果...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 测试 5: 导航到必应
    console.log('【测试 5】导航到必应');
    await client.callTool('navigate', {
      sessionId: sessionId,
      url: 'https://www.bing.com'
    });

    // 测试 6: 在必应搜索
    console.log('【测试 6】在必应搜索');
    await client.callTool('type', {
      sessionId: sessionId,
      selector: '#sb_form_q',
      text: 'Playwright automation',
      clear: true
    });

    await client.callTool('click', {
      sessionId: sessionId,
      selector: '#search_icon'
    });

    // 等待观察
    console.log('⏳ 等待 5 秒观察结果...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 测试 7: 搜索网络请求
    console.log('【测试 7】搜索包含"百度"的请求');
    const searchResults = await client.callTool('search_requests', {
      sessionId: sessionId,
      keyword: '百度',
      searchIn: ['url', 'response'],
      limit: 5
    });

    if (searchResults && searchResults.matches) {
      console.log(`找到 ${searchResults.total} 个匹配，显示前 ${searchResults.returned} 个:`);
      searchResults.matches.forEach((match, index) => {
        console.log(`\n  ${index + 1}. ${match.method} ${match.url}`);
        console.log(`     匹配位置: ${match.matchedIn}`);
        if (match.curl) {
          console.log(`     curl 命令:\n     ${match.curl.substring(0, 100)}...`);
        }
      });
    }

    // 测试 8: 获取所有请求
    console.log('\n【测试 8】获取所有 XHR/Fetch 请求');
    const allRequests = await client.callTool('get_requests', {
      sessionId: sessionId,
      filter: {
        resourceType: 'xhr'
      },
      limit: 10
    });

    if (allRequests && allRequests.requests) {
      console.log(`共 ${allRequests.total} 个请求，显示最近 ${allRequests.returned} 个:`);
      allRequests.requests.forEach((req, index) => {
        console.log(`  ${index + 1}. [${req.method}] ${req.url.substring(0, 80)}...`);
        console.log(`     状态: ${req.status} ${req.statusText}`);
      });
    }

    // 测试 9: 获取请求详情
    if (searchResults && searchResults.matches && searchResults.matches.length > 0) {
      console.log('\n【测试 9】获取第一个匹配请求的详细信息');
      const requestDetail = await client.callTool('get_request_detail', {
        sessionId: sessionId,
        requestId: searchResults.matches[0].id
      });

      if (requestDetail) {
        console.log(`\n完整 curl 命令:\n${requestDetail.curl}\n`);
      }
    }

    // 等待观察
    console.log('⏳ 等待 3 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 测试 10: 关闭会话
    console.log('【测试 10】关闭会话');
    await client.callTool('close_session', {
      sessionId: sessionId
    });

    console.log('='.repeat(60));
    console.log('✨ 所有测试完成！');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

// 运行
console.log('🎯 MCP 客户端测试\n');
runTests().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
