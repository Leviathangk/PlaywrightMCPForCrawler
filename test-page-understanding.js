/**
 * 页面理解功能测试
 * 测试 AI 理解页面结构的能力
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class PageUnderstandingTest {
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
      name: 'page-understanding-test',
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
  const test = new PageUnderstandingTest();

  try {
    await test.connect();

    // 1. 创建会话
    console.log('📝 创建浏览器会话...');
    const session = await test.callTool('create_session');
    const sessionId = session.sessionId;
    console.log(`✅ 会话 ID: ${sessionId}\n`);

    // 2. 访问浙江政府采购网
    console.log('🌐 访问浙江政府采购网...');
    const url = 'https://zfcg.czt.zj.gov.cn/site/category?excludeDistrictPrefix=false&isGov=true&parentId=600007&childrenCode=110-600268';
    await test.callTool('navigate', {
      sessionId: sessionId,
      url: url,
      waitUntil: 'networkidle'
    });
    console.log('✅ 页面加载完成\n');

    // 3. 获取页面结构
    console.log('🔍 分析页面结构...\n');
    const structure = await test.callTool('get_page_structure', {
      sessionId: sessionId,
      maxElements: 50
    });

    if (structure && structure.elements) {
      console.log(`找到 ${structure.totalFound} 个可交互元素（显示前 20 个）:\n`);
      structure.elements.slice(0, 20).forEach((el, index) => {
        console.log(`${index + 1}. [${el.tag}] ${el.text || '(无文本)'}`);
        console.log(`   选择器: ${el.selector}`);
        console.log(`   可见: ${el.visible ? '是' : '否'} | 可点击: ${el.clickable ? '是' : '否'}`);
        console.log('');
      });
    }

    // 4. 查找"政府采购公告"元素
    console.log('🔍 查找"政府采购公告"元素...\n');
    const element1 = await test.callTool('find_element_by_text', {
      sessionId: sessionId,
      text: '政府采购公告'
    });

    if (element1 && element1.found) {
      console.log('✅ 找到元素:');
      console.log(`   文本: ${element1.text}`);
      console.log(`   选择器: ${element1.selector}`);
      console.log(`   可见: ${element1.visible ? '是' : '否'}\n`);

      // 5. 点击该元素
      console.log('🖱️  点击"政府采购公告"...');
      await test.callTool('click', {
        sessionId: sessionId,
        selector: element1.selector
      });
      console.log('✅ 点击成功\n');

      // 6. 等待子菜单出现
      console.log('⏳ 等待子菜单加载...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ 等待完成\n');

      // 7. 查找"采购意向"
      console.log('🔍 查找"采购意向"元素...\n');
      const element2 = await test.callTool('find_element_by_text', {
        sessionId: sessionId,
        text: '采购意向'
      });

      if (element2 && element2.found) {
        console.log('✅ 找到元素:');
        console.log(`   文本: ${element2.text}`);
        console.log(`   选择器: ${element2.selector}\n`);

        // 8. 点击"采购意向"
        console.log('🖱️  点击"采购意向"...');
        await test.callTool('click', {
          sessionId: sessionId,
          selector: element2.selector
        });
        console.log('✅ 点击成功\n');

        // 9. 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 10. 截图
        console.log('📸 截图保存...');
        await test.callTool('screenshot', {
          sessionId: sessionId,
          path: 'screenshots/result.png',
          fullPage: true
        });
        console.log('✅ 截图已保存到 screenshots/result.png\n');

        // 11. 获取右侧内容
        console.log('📄 获取右侧内容区域文本...\n');
        const content = await test.callTool('get_text_content', {
          sessionId: sessionId,
          selector: '.right-content, .content, .main-content, body'
        });

        if (content) {
          console.log('内容预览（前 500 字符）:');
          console.log(content.innerText.substring(0, 500) + '...\n');
        }
      }
    } else {
      console.log('❌ 未找到"政府采购公告"元素\n');
    }

    // 12. 等待观察
    console.log('⏳ 等待 5 秒后关闭...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 13. 关闭会话
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

console.log('🎯 开始页面理解测试\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
