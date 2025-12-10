# 快速发布指南

## 第一次发布

### 1. 检查包名是否可用
```bash
npm search @leviathangk/playwright-mcp
```

包名已设置为：`@leviathangk/playwright-mcp`

### 2. 更新个人信息
编辑 `package.json`：
```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/leviathangk/playwright-mcp.git"
  }
}
```

### 3. 登录 npm
```bash
npm login
```

### 4. 运行发布检查
```bash
npm run publish-check
```

### 5. 发布
```bash
# 普通包
npm publish

# 作用域包（@yourusername/package-name）
npm publish --access public
```

## 发布后使用

用户可以通过以下方式使用：

### MCP 配置文件
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

### 或者全局安装
```bash
npm install -g @leviathangk/playwright-mcp
```

## 更新版本

```bash
# 修复 bug: 0.1.0 -> 0.1.1
npm version patch && npm publish

# 新功能: 0.1.0 -> 0.2.0
npm version minor && npm publish

# 破坏性更改: 0.1.0 -> 1.0.0
npm version major && npm publish
```

## 常见问题

### Q: 包名已被占用怎么办？
A: 使用作用域包 `@yourusername/playwright-mcp`

### Q: 如何撤销发布？
A: 只能撤销 72 小时内的版本
```bash
npm unpublish @leviathangk/playwright-mcp@0.1.0
```

### Q: 如何更新已发布的包？
A: 修改代码后，更新版本号并重新发布
```bash
npm version patch
npm publish
```

## 推荐流程

1. 开发新功能
2. 测试通过
3. 提交代码到 Git
4. 运行 `npm run publish-check`
5. 更新版本 `npm version patch/minor/major`
6. 发布 `npm publish`
7. 打标签 `git push --tags`
