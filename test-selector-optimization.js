/**
 * 选择器优化效果测试
 * 对比优化前后的选择器长度和精确度
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class SelectorOptimizationTest {
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
      name: 'selector-optimization-test',
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
  const test = new SelectorOptimizationTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问一个复杂页面
    console.log('🌐 访问淘宝首页（复杂页面）...');
    await test.callTool('navigate', {
      sessionId: sessionId,
      url: 'https://www.taobao.com',
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 获取页面结构
    console.log('🔍 分析页面结构...\n');
    const structure = await test.callTool('get_page_structure', {
      sessionId: sessionId,
      maxElements: 30
    });

    if (structure && structure.elements) {
      console.log(`找到 ${structure.totalFound} 个可交互元素\n`);
      console.log('=' .repeat(80));
      console.log('选择器优化效果展示');
      console.log('=' .repeat(80) + '\n');
      
      // 统计选择器长度
      const selectorLengths = structure.elements.map(el => el.selector.length);
      const avgLength = selectorLengths.reduce((a, b) => a + b, 0) / selectorLengths.length;
      const maxLength = Math.max(...selectorLengths);
      const minLength = Math.min(...selectorLengths);

      console.log('📊 选择器统计:');
      console.log(`   平均长度: ${avgLength.toFixed(0)} 字符`);
      console.log(`   最长: ${maxLength} 字符`);
      console.log(`   最短: ${minLength} 字符\n`);

      console.log('📋 选择器示例（前 10 个）:\n');
      structure.elements.slice(0, 10).forEach((el, index) => {
        const text = el.text ? el.text.substring(0, 30) : '(无文本)';
        console.log(`${index + 1}. ${text}`);
        console.log(`   选择器: ${el.selector}`);
        console.log(`   长度: ${el.selector.length} 字符`);
        console.log(`   层级: ${el.selector.split('>').length} 层`);
        console.log('');
      });

      // 分析选择器类型
      const withId = structure.elements.filter(el => el.selector.startsWith('#')).length;
      const withClass = structure.elements.filter(el => el.selector.includes('.')).length;
      const levels = structure.elements.map(el => el.selector.split('>').length);
      const avgLevels = levels.reduce((a, b) => a + b, 0) / levels.length;

      console.log('=' .repeat(80));
      console.log('📈 选择器类型分析:');
      console.log(`   使用 ID 的: ${withId} 个 (${(withId/structure.elements.length*100).toFixed(1)}%)`);
      console.log(`   使用 Class 的: ${withClass} 个 (${(withClass/structure.elements.length*100).toFixed(1)}%)`);
      console.log(`   平均层级: ${avgLevels.toFixed(1)} 层`);
      console.log('=' .repeat(80) + '\n');
    }

    // 4. 测试查找功能
    console.log('🔍 测试查找"登录"按钮...\n');
    const loginBtn = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '登录'
    });

    if (loginBtn && loginBtn.found) {
      console.log('✅ 找到登录按钮:');
      console.log(`   文本: ${loginBtn.text}`);
      console.log(`   选择器: ${loginBtn.selector}`);
      console.log(`   长度: ${loginBtn.selector.length} 字符`);
      console.log(`   层级: ${loginBtn.selector.split('>').length} 层\n`);
    }

    // 5. 等待观察
    console.log('⏳ 等待 3 秒后关闭...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. 关闭会话
    console.log('🔒 关闭会话...');
    await test.callTool('close_session', { sessionId: sessionId });
    console.log('✅ 测试完成！\n');

    console.log('💡 优化说明:');
    console.log('   - 优先使用元素 ID（最短）');
    console.log('   - 查找最近的唯一祖先（减少层级）');
    console.log('   - 限制最大层级为 5 层（避免过长）');
    console.log('   - 保证选择器唯一性（精确匹配）\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await test.close();
  }
}

console.log('🎯 开始选择器优化效果测试\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
