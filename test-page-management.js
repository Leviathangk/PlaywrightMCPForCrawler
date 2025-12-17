/**
 * 测试页面管理功能
 * 测试多标签页的创建、切换和关闭
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class PageManagementTest {
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
      name: 'page-management-test',
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
  const test = new PageManagementTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('browser_create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问第一个页面
    console.log('🌐 在第一个页面访问百度...');
    await test.callTool('browser_navigate', {
      sessionId: sessionId,
      url: 'https://www.baidu.com',
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 获取当前页面列表
    console.log('📋 获取当前页面列表:');
    let pages = await test.callTool('browser_get_pages', {
      sessionId: sessionId
    });
    console.log(JSON.stringify(pages, null, 2));
    console.log('');

    // 4. 创建新页面并访问必应
    console.log('➕ 创建新页面并访问必应...');
    const newPage1 = await test.callTool('browser_new_page', {
      sessionId: sessionId,
      url: 'https://www.bing.com'
    });
    console.log(`✅ 新页面创建成功，索引: ${newPage1.pageIndex}`);
    console.log(`   URL: ${newPage1.url}`);
    console.log(`   标题: ${newPage1.title}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. 再创建一个新页面访问京东
    console.log('➕ 再创建一个新页面并访问京东...');
    const newPage2 = await test.callTool('browser_new_page', {
      sessionId: sessionId,
      url: 'https://www.jd.com'
    });
    console.log(`✅ 新页面创建成功，索引: ${newPage2.pageIndex}`);
    console.log(`   URL: ${newPage2.url}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. 获取所有页面
    console.log('📋 获取所有页面列表:');
    pages = await test.callTool('browser_get_pages', {
      sessionId: sessionId
    });
    console.log(`总共 ${pages.totalPages} 个页面:\n`);
    pages.pages.forEach((page, index) => {
      console.log(`${index}. ${page.isActive ? '👉 ' : '   '}${page.title || '(无标题)'}`);
      console.log(`   URL: ${page.url}`);
      console.log(`   状态: ${page.isClosed ? '已关闭' : '打开'}`);
      console.log('');
    });

    // 7. 切换到第一个页面（百度）
    console.log('🔄 切换到第一个页面（百度）...');
    const switched = await test.callTool('browser_switch_page', {
      sessionId: sessionId,
      pageIndex: 0
    });
    console.log(`✅ 已切换到页面 ${switched.pageIndex}`);
    console.log(`   标题: ${switched.title}`);
    console.log(`   URL: ${switched.url}\n`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 8. 在当前页面（百度）输入搜索
    console.log('⌨️  在百度页面输入搜索...');
    await test.callTool('browser_type', {
      sessionId: sessionId,
      selector: '#kw',
      text: '多标签页测试'
    });
    console.log('✅ 输入完成\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 9. 切换到第二个页面（必应）
    console.log('🔄 切换到第二个页面（必应）...');
    await test.callTool('browser_switch_page', {
      sessionId: sessionId,
      pageIndex: 1
    });
    console.log('✅ 已切换到必应页面\n');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 10. 关闭第三个页面（京东）
    console.log('❌ 关闭第三个页面（京东）...');
    const closed = await test.callTool('browser_close_page', {
      sessionId: sessionId,
      pageIndex: 2
    });
    console.log(`✅ 页面已关闭`);
    console.log(`   剩余页面数: ${closed.remainingPages}\n`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 11. 再次获取页面列表
    console.log('📋 关闭后的页面列表:');
    pages = await test.callTool('browser_get_pages', {
      sessionId: sessionId
    });
    console.log(`总共 ${pages.totalPages} 个页面:\n`);
    pages.pages.forEach((page, index) => {
      if (!page.isClosed) {
        console.log(`${index}. ${page.isActive ? '👉 ' : '   '}${page.title || '(无标题)'}`);
        console.log(`   URL: ${page.url}\n`);
      }
    });

    // 12. 等待观察
    console.log('⏳ 等待 5 秒观察效果...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 13. 关闭会话
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

console.log('🎯 测试页面管理功能\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
