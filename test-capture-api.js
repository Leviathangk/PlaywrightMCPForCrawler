/**
 * 网络请求捕获测试 - 浙江政府采购网
 * 测试目标：捕获包含"衢州市柯城区人民医院2025年12月第一次政府采购意向"的 API
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class CaptureTest {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    console.log('🔌 连接到 MCP 服务器...\n');

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [
        'build/index.js',
        '--browser', 'chromium',
        '--executable-path', 'D:\\Download\\chrome-win\\chrome-win\\chrome.exe',
        '--headless', 'false'
      ]
    });

    this.client = new Client({
      name: 'capture-test',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);
    console.log('✅ 已连接\n');
  }

  async callTool(name, args = {}) {
    const response = await this.client.callTool({ name, arguments: args });
    
    if (response.isError) {
      console.log('❌ 错误:', response.content[0].text);
      return null;
    }
    
    return JSON.parse(response.content[0].text);
  }

  async close() {
    await this.client.close();
  }
}

async function main() {
  const test = new CaptureTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('browser_create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问目标页面
    console.log('🌐 访问浙江政府采购网...');
    const url = 'https://zfcg.czt.zj.gov.cn/site/category?excludeDistrictPrefix=false&isGov=true&parentId=600007&childrenCode=110-600268';
    await test.callTool('browser_navigate', {
      sessionId: sessionId,
      url: url,
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 等待一下确保所有请求完成
    console.log('⏳ 等待 3 秒，确保所有 API 请求完成...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. 搜索包含目标文本的 API
    console.log('🔍 搜索包含"衢州市柯城区人民医院2025年12月第一次政府采购意向"的 API...\n');
    const searchResults = await test.callTool('browser_search_requests', {
      sessionId: sessionId,
      keyword: '衢州市柯城区人民医院2025年12月第一次政府采购意向',
      searchIn: ['response'],
      limit: 5
    });

    if (searchResults && searchResults.total > 0) {
      console.log(`✅ 找到 ${searchResults.total} 个匹配的请求\n`);
      
      // 显示所有匹配的请求
      searchResults.matches.forEach((match, index) => {
        console.log(`${'='.repeat(80)}`);
        console.log(`匹配 ${index + 1}:`);
        console.log(`${'='.repeat(80)}`);
        console.log(`URL: ${match.url}`);
        console.log(`方法: ${match.method}`);
        console.log(`类型: ${match.resourceType}`);
        console.log(`状态: ${match.response?.status} ${match.response?.statusText}`);
        console.log(`\n匹配文本片段:\n${match.matchedText}\n`);
      });

      // 5. 获取第一个匹配请求的详细信息
      if (searchResults.matches.length > 0) {
        console.log(`\n${'='.repeat(80)}`);
        console.log('📋 第一个匹配请求的详细信息:');
        console.log(`${'='.repeat(80)}\n`);

        const detail = await test.callTool('browser_get_request_detail', {
          sessionId: sessionId,
          requestId: searchResults.matches[0].id
        });

        if (detail) {
          console.log('【请求信息】');
          console.log(`URL: ${detail.url}`);
          console.log(`方法: ${detail.method}`);
          console.log(`\n请求头:`);
          Object.entries(detail.request.headers).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });

          if (detail.request.postData) {
            console.log(`\n请求体:\n${detail.request.postData.substring(0, 500)}...`);
          }

          console.log(`\n【响应信息】`);
          console.log(`状态: ${detail.response?.status} ${detail.response?.statusText}`);
          console.log(`\n响应头:`);
          if (detail.response?.headers) {
            Object.entries(detail.response.headers).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });
          }

          if (detail.response?.body) {
            console.log(`\n响应体（前 1000 字符）:\n${detail.response.body.substring(0, 1000)}...`);
          }

          console.log(`\n【curl 命令】`);
          console.log(detail.curl);
        }
      }
    } else {
      console.log('❌ 未找到匹配的请求');
      console.log('提示：可能需要滚动页面或点击加载更多\n');

      // 显示所有捕获的请求供参考
      console.log('📋 显示所有捕获的 API 请求（供参考）:\n');
      const allRequests = await test.callTool('browser_get_requests', {
        sessionId: sessionId,
        filter: {
          resourceType: 'xhr'
        },
        limit: 20
      });

      if (allRequests && allRequests.requests) {
        allRequests.requests.forEach((req, index) => {
          console.log(`${index + 1}. [${req.method}] ${req.url}`);
          console.log(`   状态: ${req.status} | 时间: ${new Date(req.timestamp).toLocaleTimeString()}`);
        });
      }
    }

    // 6. 等待观察
    console.log('\n⏳ 等待 5 秒后关闭...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7. 关闭会话
    console.log('🔒 关闭会话...');
    await test.callTool('browser_close_session', { sessionId: sessionId });
    console.log('✅ 测试完成！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await test.close();
  }
}

console.log('🎯 开始捕获测试\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
