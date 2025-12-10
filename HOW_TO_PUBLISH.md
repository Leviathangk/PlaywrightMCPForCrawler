# 如何发布 @leviathangk/playwright-mcp

## 快速发布（3 步）

### 1. 登录 npm
```bash
npm login
```
输入你的 npm 用户名、密码和邮箱

### 2. 构建并检查
```bash
npm run build
npm run publish-check
```

### 3. 发布
```bash
npm publish --access public
```

## 发布后，用户可以这样使用：

### 在 MCP 配置文件中添加：
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

### 或者全局安装：
```bash
npm install -g @leviathangk/playwright-mcp
```

## 更新版本

```bash
# 修复 bug (0.1.0 -> 0.1.1)
npm version patch
npm publish --access public

# 新功能 (0.1.0 -> 0.2.0)
npm version minor
npm publish --access public

# 破坏性更改 (0.1.0 -> 1.0.0)
npm version major
npm publish --access public
```

## 注意事项

1. **作用域包必须加 `--access public`**，否则会尝试发布为私有包（需要付费）
2. 发布前确保代码已提交到 Git
3. 每次发布后建议打 Git 标签：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

## 常见错误

### 错误：You must sign up for private packages
**原因**：作用域包默认是私有的
**解决**：添加 `--access public` 参数
```bash
npm publish --access public
```

### 错误：You do not have permission to publish
**原因**：未登录或登录过期
**解决**：重新登录
```bash
npm logout
npm login
```

### 错误：Cannot publish over existing version
**原因**：版本号已存在
**解决**：更新版本号
```bash
npm version patch
```
