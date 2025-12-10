/**
 * 调试百度页面结构
 * 查看"百度一下"按钮的实际 HTML 结构
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class DebugTest {
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
        // '--executable-path', 'D:\\Download\\chrome-win\\chrome-win\\chrome.exe',
        '--headless', 'false'
      ]
    });

    this.client = new Client({
      name: 'debug-test',
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
  const test = new DebugTest();

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

    // 3. 获取所有可交互元素
    console.log('🔍 获取页面所有可交互元素...\n');
    const structure = await test.callTool('browser_get_page_structure', {
      sessionId: sessionId,
      maxElements: 1000,  // 增加限制
      includeHidden: true  // 包括隐藏元素
    });

    if (structure && structure.elements) {
      console.log(`找到 ${structure.totalFound} 个可交互元素\n`);
      
      // 查找包含"百度"的元素
      const baiduElements = structure.elements.filter(el => 
        el.text && el.text.includes('百度')
      );

      console.log('=' .repeat(80));
      console.log(`包含"百度"的元素（共 ${baiduElements.length} 个）:`);
      console.log('=' .repeat(80) + '\n');

      baiduElements.forEach((el, index) => {
        console.log(`${index + 1}. 文本: "${el.text}"`);
        console.log(`   标签: ${el.tag}`);
        console.log(`   选择器: ${el.selector}`);
        console.log(`   可见: ${el.visible ? '是' : '否'}`);
        console.log(`   可点击: ${el.clickable ? '是' : '否'}`);
        if (el.attributes) {
          console.log(`   属性:`, el.attributes);
        }
        console.log('');
      });

      // 查找所有 button 和 input
      const buttons = structure.elements.filter(el => 
        el.tag === 'button' || el.tag === 'input'
      );

      console.log('=' .repeat(80));
      console.log(`所有按钮和输入框（共 ${buttons.length} 个）:`);
      console.log('=' .repeat(80) + '\n');

      buttons.forEach((el, index) => {
        console.log(`${index + 1}. 文本: "${el.text || '(无文本)'}"`);
        console.log(`   标签: ${el.tag}`);
        console.log(`   选择器: ${el.selector}`);
        console.log(`   可见: ${el.visible ? '是' : '否'}`);
        if (el.attributes) {
          console.log(`   属性:`, el.attributes);
        }
        console.log('');
      });

      // 特别查找 id 包含 submit 或 su 的元素
      const submitElements = structure.elements.filter(el =>
        el.selector && (el.selector.includes('submit') || el.selector.includes('#su'))
      );

      if (submitElements.length > 0) {
        console.log('=' .repeat(80));
        console.log(`ID 包含 submit/su 的元素（共 ${submitElements.length} 个）:`);
        console.log('=' .repeat(80) + '\n');

        submitElements.forEach((el, index) => {
          console.log(`${index + 1}. 文本: "${el.text || '(无文本)'}"`);
          console.log(`   标签: ${el.tag}`);
          console.log(`   选择器: ${el.selector}`);
          console.log(`   可见: ${el.visible ? '是' : '否'}`);
          console.log('');
        });
      }
    }

    // 4. 测试 find_element_by_text
    console.log('=' .repeat(80));
    console.log('测试 find_element_by_text:');
    console.log('=' .repeat(80) + '\n');

    const tests = [
      { text: '百度一下', type: 'any' },
      { text: '百度', type: 'any' },
      { text: '一下', type: 'any' },
      { text: '百度一下', type: 'button' },
    ];

    for (const testCase of tests) {
      console.log(`查找: "${testCase.text}" (类型: ${testCase.type})`);
      const result = await test.callTool('browser_find_element_by_text', {
        sessionId: sessionId,
        text: testCase.text,
        elementType: testCase.type
      });

      if (result && result.found) {
        console.log(`✅ 找到: ${result.tag} - "${result.text}"`);
        console.log(`   选择器: ${result.selector}\n`);
      } else {
        console.log(`❌ 未找到\n`);
      }
    }

    // 5. 等待观察
    console.log('⏳ 等待 5 秒后关闭...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. 关闭会话
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

console.log('🎯 开始调试百度页面\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
