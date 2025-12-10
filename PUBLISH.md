# 发布到 npm 指南

## 准备工作

### 1. 注册 npm 账号
访问 https://www.npmjs.com/ 注册账号

### 2. 登录 npm
```bash
npm login
```
输入用户名、密码和邮箱

### 3. 验证登录状态
```bash
npm whoami
```

## 发布前检查

### 1. 更新 package.json
确保以下信息正确：
- `name`: 包名（确保在 npm 上未被占用）
- `version`: 版本号（遵循语义化版本）
- `author`: 你的名字和邮箱
- `repository`: GitHub 仓库地址
- `homepage`: 项目主页

### 2. 检查包名是否可用
```bash
npm search playwright-mcp-server
```

如果已被占用，需要修改包名，例如：
- `@yourusername/playwright-mcp-server`（作用域包）
- `playwright-mcp-crawler`
- `mcp-playwright-automation`

### 3. 构建项目
```bash
npm run build
```

### 4. 测试本地安装
```bash
npm pack
npm install -g ./playwright-mcp-server-0.1.0.tgz
playwright-mcp-server --help
```

## 发布步骤

### 1. 首次发布
```bash
npm publish
```

如果使用作用域包（@yourusername/package-name），需要：
```bash
npm publish --access public
```

### 2. 更新版本
```bash
# 补丁版本（bug 修复）: 0.1.0 -> 0.1.1
npm version patch

# 次版本（新功能）: 0.1.0 -> 0.2.0
npm version minor

# 主版本（破坏性更改）: 0.1.0 -> 1.0.0
npm version major
```

### 3. 发布新版本
```bash
npm publish
```

## 使用方式

发布成功后，用户可以这样使用：

### 方式 1: 通过 npx（推荐）
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@leviathangk/playwright-mcp@latest",
        "--browser", "chromium",
        "--headless", "false"
      ]
    }
  }
}
```

### 方式 2: 全局安装
```bash
npm install -g @leviathangk/playwright-mcp
```

然后配置：
```json
{
  "mcpServers": {
    "playwright": {
      "command": "playwright-mcp",
      "args": [
        "--browser", "chromium",
        "--headless", "false"
      ]
    }
  }
}
```

## 发布检查清单

- [ ] 代码已提交到 Git
- [ ] 版本号已更新
- [ ] README.md 已完善
- [ ] 测试通过
- [ ] 构建成功
- [ ] 本地测试通过
- [ ] package.json 信息正确
- [ ] .npmignore 或 files 字段配置正确

## 常见问题

### 1. 包名已被占用
使用作用域包：`@yourusername/playwright-mcp`

修改 package.json：
```json
{
  "name": "@yourusername/playwright-mcp"
}
```

### 2. 发布失败：需要验证邮箱
登录 npm 网站验证邮箱

### 3. 发布失败：权限问题
```bash
npm logout
npm login
```

### 4. 撤销已发布的版本
```bash
# 只能撤销 72 小时内发布的版本
npm unpublish @leviathangk/playwright-mcp@0.1.0
```

## 最佳实践

1. **语义化版本**：遵循 semver 规范
2. **变更日志**：维护 CHANGELOG.md
3. **标签发布**：每次发布打 Git 标签
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
4. **测试覆盖**：确保测试通过
5. **文档完善**：README 包含使用示例

## 推广

发布后可以：
1. 在 GitHub 添加 topics 标签
2. 提交到 MCP 服务器列表
3. 在社区分享
4. 编写博客介绍

## 维护

定期更新：
- 依赖包版本
- Playwright 版本
- 修复 bug
- 添加新功能
