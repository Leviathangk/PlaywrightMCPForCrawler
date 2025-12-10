/**
 * 文本匹配测试
 * 测试 find_element_by_text 的匹配逻辑
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class TextMatchingTest {
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
      name: 'text-matching-test',
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
  const test = new TextMatchingTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问百度
    console.log('🌐 访问百度...');
    await test.callTool('navigate', {
      sessionId: sessionId,
      url: 'https://www.baidu.com',
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 测试查找"百度一下"（带空格）
    console.log('=' .repeat(60));
    console.log('测试 1: 查找"百度一下"（可能有前后空格）');
    console.log('=' .repeat(60) + '\n');
    
    const result1 = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '百度一下'
    });

    if (result1 && result1.found) {
      console.log('✅ 找到元素:');
      console.log(`   文本: "${result1.text}"`);
      console.log(`   选择器: ${result1.selector}`);
      console.log(`   标签: ${result1.tag}`);
      console.log(`   可见: ${result1.visible ? '是' : '否'}`);
      console.log(`   得分: ${result1.score}\n`);
    } else {
      console.log('❌ 未找到"百度一下"按钮\n');
    }

    // 4. 测试查找"新闻"链接
    console.log('=' .repeat(60));
    console.log('测试 2: 查找"新闻"链接');
    console.log('=' .repeat(60) + '\n');
    
    const result2 = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '新闻',
      elementType: 'link'
    });

    if (result2 && result2.found) {
      console.log('✅ 找到元素:');
      console.log(`   文本: "${result2.text}"`);
      console.log(`   选择器: ${result2.selector}`);
      console.log(`   标签: ${result2.tag}`);
      console.log(`   得分: ${result2.score}\n`);
    } else {
      console.log('❌ 未找到"新闻"链接\n');
    }

    // 5. 测试精确匹配
    console.log('=' .repeat(60));
    console.log('测试 3: 精确匹配"百度一下"');
    console.log('=' .repeat(60) + '\n');
    
    const result3 = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '百度一下',
      exact: true
    });

    if (result3 && result3.found) {
      console.log('✅ 找到元素（精确匹配）:');
      console.log(`   文本: "${result3.text}"`);
      console.log(`   选择器: ${result3.selector}`);
      console.log(`   得分: ${result3.score}\n`);
    } else {
      console.log('❌ 精确匹配未找到\n');
    }

    // 6. 测试查找按钮
    console.log('=' .repeat(60));
    console.log('测试 4: 只查找按钮类型');
    console.log('=' .repeat(60) + '\n');
    
    const result4 = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '百度一下',
      elementType: 'button'
    });

    if (result4 && result4.found) {
      console.log('✅ 找到按钮:');
      console.log(`   文本: "${result4.text}"`);
      console.log(`   选择器: ${result4.selector}`);
      console.log(`   标签: ${result4.tag}`);
      console.log(`   得分: ${result4.score}\n`);
    } else {
      console.log('❌ 未找到按钮\n');
    }

    // 7. 等待观察
    console.log('⏳ 等待 3 秒后关闭...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 8. 关闭会话
    console.log('🔒 关闭会话...');
    await test.callTool('close_session', { sessionId: sessionId });
    console.log('✅ 测试完成！\n');

    console.log('💡 修复说明:');
    console.log('   - 所有文本都会 trim（去除前后空格）');
    console.log('   - 使用评分系统，优先返回最佳匹配');
    console.log('   - 直接文本匹配得分最高（100分）');
    console.log('   - innerText 匹配次之（90分）');
    console.log('   - 属性匹配最低（80分）\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await test.close();
  }
}

console.log('🎯 开始文本匹配测试\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
