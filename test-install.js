/**
 * 测试 browser_install 工具
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class InstallTest {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    console.log('🔌 连接到 MCP 服务器...\n');

    this.transport = new StdioClientTransport({
      command: 'node',
      args: ['build/index.js']
    });

    this.client = new Client({
      name: 'install-test',
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
  const test = new InstallTest();

  try {
    await test.connect();

    console.log('📦 开始安装 Chromium 浏览器...\n');
    console.log('这可能需要几分钟时间，请耐心等待...\n');

    const result = await test.callTool('browser_install', {
      browser: 'chromium',
      withDeps: false
    });

    if (result) {
      console.log('✅ 安装完成！\n');
      console.log('结果:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await test.close();
  }
}

console.log('🎯 测试浏览器安装工具\n');
main().catch(error => {
  console.error('❌ 致命错误:', error);
  process.exit(1);
});
