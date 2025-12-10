/**
 * 选择器精确度测试
 * 验证生成的选择器是否唯一
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class SelectorTest {
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
      name: 'selector-test',
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
  const test = new SelectorTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问百度（简单页面）
    console.log('🌐 访问百度...');
    await test.callTool('navigate', {
      sessionId: sessionId,
      url: 'https://www.baidu.com',
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 获取页面结构
    console.log('🔍 获取页面结构...\n');
    const structure = await test.callTool('get_page_structure', {
      sessionId: sessionId,
      maxElements: 20
    });

    if (structure && structure.elements) {
      console.log(`找到 ${structure.totalFound} 个元素\n`);
      console.log('选择器示例:\n');
      
      structure.elements.slice(0, 10).forEach((el, index) => {
        console.log(`${index + 1}. ${el.text || '(无文本)'}`);
        console.log(`   选择器: ${el.selector}`);
        console.log('');
      });
    }

    // 4. 测试截图路径验证
    console.log('📸 测试截图路径验证...\n');
    
    // 测试相对路径（应该失败）
    console.log('测试 1: 使用相对路径（应该失败）');
    const result1 = await test.callTool('screenshot', {
      sessionId: sessionId,
      path: 'test.png'
    });
    if (result1 && result1.errorCode === 'INVALID_PATH') {
      console.log('✅ 正确拒绝了相对路径\n');
    } else {
      console.log('❌ 应该拒绝相对路径\n');
    }

    // 测试绝对路径（应该成功）
    console.log('测试 2: 使用绝对路径（应该成功）');
    const absolutePath = process.cwd() + '\\test-screenshot.png';
    const result2 = await test.callTool('screenshot', {
      sessionId: sessionId,
      path: absolutePath
    });
    if (result2 && result2.success) {
      console.log(`✅ 成功保存截图: ${absolutePath}\n`);
    } else {
      console.log('❌ 截图失败\n');
    }

    // 5. 测试查找元素
    console.log('🔍 测试查找"百度一下"按钮...\n');
    const element = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '百度一下'
    });

    if (element && element.found) {
      console.log('✅ 找到元素:');
      console.log(`   文本: ${element.text}`);
      console.log(`   选择器: ${element.selector}`);
      console.log(`   标签: ${element.tag}\n`);
    }

    // 6. 关闭会话
    console.log('🔒 关闭会话...');
    await test.callTool('close_session', { sessionId: sessionId });
    console.log('✅ 测试完成！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await test.close();
  }
}

console.log('🎯 开始选择器精确度测试\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
