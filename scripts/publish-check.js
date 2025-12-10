#!/usr/bin/env node

/**
 * 发布前检查脚本
 * 运行: node scripts/publish-check.js
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

console.log('🔍 开始发布前检查...\n');

let hasError = false;

// 1. 检查 Git 状态
console.log('1️⃣ 检查 Git 状态...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (status.trim()) {
    console.log('⚠️  警告: 有未提交的更改');
    console.log(status);
  } else {
    console.log('✅ Git 工作区干净\n');
  }
} catch (error) {
  console.log('⚠️  无法检查 Git 状态\n');
}

// 2. 检查 package.json
console.log('2️⃣ 检查 package.json...');
try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  
  if (!pkg.name) {
    console.log('❌ 缺少 name 字段');
    hasError = true;
  } else {
    console.log(`   名称: ${pkg.name}`);
  }
  
  if (!pkg.version) {
    console.log('❌ 缺少 version 字段');
    hasError = true;
  } else {
    console.log(`   版本: ${pkg.version}`);
  }
  
  if (!pkg.description) {
    console.log('⚠️  建议添加 description 字段');
  }
  
  if (!pkg.author || pkg.author.includes('Your Name')) {
    console.log('⚠️  请更新 author 字段');
  }
  
  if (!pkg.repository || pkg.repository.url.includes('yourusername')) {
    console.log('⚠️  请更新 repository 字段');
  }
  
  if (!pkg.bin) {
    console.log('❌ 缺少 bin 字段');
    hasError = true;
  }
  
  if (!hasError) {
    console.log('✅ package.json 配置正确\n');
  } else {
    console.log('');
  }
} catch (error) {
  console.log('❌ 无法读取 package.json\n');
  hasError = true;
}

// 3. 检查必要文件
console.log('3️⃣ 检查必要文件...');
const requiredFiles = ['README.md', 'LICENSE', 'build/index.js'];
let allFilesExist = true;

for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ 缺少 ${file}`);
    allFilesExist = false;
    hasError = true;
  }
}

if (allFilesExist) {
  console.log('✅ 所有必要文件存在\n');
} else {
  console.log('');
}

// 4. 检查构建
console.log('4️⃣ 检查构建...');
if (existsSync('build') && existsSync('build/index.js')) {
  console.log('✅ 构建文件存在\n');
} else {
  console.log('❌ 请先运行 npm run build\n');
  hasError = true;
}

// 5. 检查 npm 登录状态
console.log('5️⃣ 检查 npm 登录状态...');
try {
  const user = execSync('npm whoami', { encoding: 'utf-8' }).trim();
  console.log(`✅ 已登录为: ${user}\n`);
} catch (error) {
  console.log('❌ 未登录 npm，请运行: npm login\n');
  hasError = true;
}

// 总结
console.log('='.repeat(60));
if (hasError) {
  console.log('❌ 检查失败，请修复上述问题后再发布');
  process.exit(1);
} else {
  console.log('✅ 所有检查通过！');
  console.log('\n可以发布了:');
  console.log('  npm publish');
  console.log('\n或者使用作用域包:');
  console.log('  npm publish --access public');
}
console.log('='.repeat(60));
