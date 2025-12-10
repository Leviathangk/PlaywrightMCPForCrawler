/**
 * 测试新增的4个工具
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class NewToolsTest {
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
      name: 'new-tools-test',
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
  const test = new NewToolsTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('browser_create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问百度
    console.log('🌐 访问百度...');
    await test.callTool('browser_navigate', {
      sessionId: sessionId,
      url: 'https://www.baidu.com',
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 测试 query_selector
    console.log('=' .repeat(60));
    console.log('测试 browser_query_selector');
    console.log('=' .repeat(60) + '\n');

    console.log('查询搜索框 (#kw):');
    const inputResult = await test.callTool('browser_query_selector', {
      sessionId: sessionId,
      selector: '#kw'
    });
    console.log(JSON.stringify(inputResult, null, 2));
    console.log('');

    console.log('查询所有链接 (a):');
    const linksResult = await test.callTool('browser_query_selector', {
      sessionId: sessionId,
      selector: 'a',
      multiple: true,
      includeAttributes: false
    });
    console.log(`找到 ${linksResult.count} 个链接`);
    console.log('前3个:', JSON.stringify(linksResult.elements.slice(0, 3), null, 2));
    console.log('');

    // 4. 测试 get_page_content
    console.log('=' .repeat(60));
    console.log('测试 browser_get_page_content');
    console.log('=' .repeat(60) + '\n');

    console.log('获取页面标题和 URL:');
    const contentResult = await test.callTool('browser_get_page_content', {
      sessionId: sessionId,
      format: 'text',
      selector: 'title'
    });
    console.log(`标题: ${contentResult.title}`);
    console.log(`URL: ${contentResult.url}`);
    console.log(`内容: ${contentResult.content.substring(0, 100)}...`);
    console.log('');

    // 5. 测试 scroll
    console.log('=' .repeat(60));
    console.log('测试 browser_scroll');
    console.log('=' .repeat(60) + '\n');

    console.log('滚动到底部...');
    const scrollResult = await test.callTool('browser_scroll', {
      sessionId: sessionId,
      target: 'bottom',
      smooth: true
    });
    console.log(JSON.stringify(scrollResult, null, 2));
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('滚动到顶部...');
    const scrollTopResult = await test.callTool('browser_scroll', {
      sessionId: sessionId,
      target: 'top',
      smooth: true
    });
    console.log(JSON.stringify(scrollTopResult, null, 2));
    console.log('');

    // 6. 测试 execute_script
    console.log('=' .repeat(60));
    console.log('测试 browser_execute_script');
    console.log('=' .repeat(60) + '\n');

    console.log('执行脚本获取页面信息:');
    const scriptResult = await test.callTool('browser_execute_script', {
      sessionId: sessionId,
      script: `
        return {
          title: document.title,
          url: document.location.href,
          linkCount: document.querySelectorAll('a').length,
          imageCount: document.querySelectorAll('img').length,
          scrollHeight: document.body.scrollHeight,
          viewportHeight: window.innerHeight
        };
      `
    });
    console.log(JSON.stringify(scriptResult, null, 2));
    console.log('');

    console.log('执行脚本修改页面:');
    const modifyResult = await test.callTool('browser_execute_script', {
      sessionId: sessionId,
      script: `
        const input = document.querySelector('#kw');
        if (input) {
          input.value = '测试文本';
          input.style.border = '3px solid red';
          return { success: true, value: input.value };
        }
        return { success: false };
      `
    });
    console.log(JSON.stringify(modifyResult, null, 2));
    console.log('');

    // 7. 等待观察
    console.log('⏳ 等待 3 秒观察效果...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 8. 关闭会话
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

console.log('🎯 测试新增工具\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
