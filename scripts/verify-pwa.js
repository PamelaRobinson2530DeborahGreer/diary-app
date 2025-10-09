#!/usr/bin/env node

/**
 * PWA 功能验证脚本
 * 自动检查 Service Worker、Manifest 等关键文件
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

const checks = [
  {
    name: 'Service Worker 文件',
    url: '/sw.js',
    validate: (content) => content.includes('Service Worker for Journal App PWA')
  },
  {
    name: 'Manifest 文件',
    url: '/manifest.json',
    validate: (content) => {
      try {
        const manifest = JSON.parse(content);
        return manifest.name && manifest.short_name && manifest.icons;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'SVG 图标',
    url: '/icon.svg',
    validate: (content) => content.includes('<svg')
  },
  {
    name: '192x192 图标',
    url: '/icon-192.png',
    validate: (content) => content.length > 0
  },
  {
    name: '512x512 图标',
    url: '/icon-512.png',
    validate: (content) => content.length > 0
  },
  {
    name: '离线页面',
    url: '/offline',
    validate: (content) => content.includes('<!DOCTYPE html>') // 客户端渲染，只检查 HTML 返回
  }
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(BASE_URL + url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          content: data
        });
      });
    }).on('error', reject);
  });
}

async function runChecks() {
  console.log('🔍 开始验证 PWA 功能...\n');
  console.log(`测试目标: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      const result = await fetchUrl(check.url);

      if (result.statusCode === 200 && check.validate(result.content)) {
        console.log(`✅ ${check.name}: 通过`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: 失败 (状态码: ${result.statusCode})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: 错误 (${error.message})`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 验证结果: ${passed} 通过, ${failed} 失败`);

  if (failed === 0) {
    console.log(`\n✨ 所有检查通过！PWA 功能正常。`);
    console.log(`\n下一步: 在 Chrome DevTools 中手动验证:`);
    console.log(`  1. 打开: ${BASE_URL}`);
    console.log(`  2. DevTools -> Application -> Service Workers`);
    console.log(`  3. DevTools -> Application -> Manifest`);
    console.log(`  4. 运行 Lighthouse PWA 审计`);
  } else {
    console.log(`\n⚠️  部分检查失败，请检查配置。`);
    process.exit(1);
  }
}

// 运行验证
runChecks().catch((error) => {
  console.error('验证过程出错:', error.message);
  console.error('\n请确保开发服务器运行在端口 3001:');
  console.error('  npm run dev');
  process.exit(1);
});
