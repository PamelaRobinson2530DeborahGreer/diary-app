#!/usr/bin/env node

/**
 * PWA 图标生成脚本 (使用 SVG)
 *
 * 由于 Node.js 环境限制，这个脚本生成 SVG 图标
 * PNG 图标需要使用浏览器工具生成（见 generateIcons.html）
 * 或者安装 sharp 库后使用 sharp 转换
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');

// 标准图标 SVG (512x512)
const standardIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect width="512" height="512" fill="url(#bg-gradient)"/>

  <!-- 日记本 -->
  <g filter="url(#shadow)">
    <!-- 白色背景 -->
    <rect x="102" y="128" width="308" height="282" fill="white" rx="16"/>

    <!-- 红色装订线 -->
    <line x1="148" y1="159" x2="148" y2="379" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>

    <!-- 纸张横线 -->
    <line x1="179" y1="205" x2="374" y2="205" stroke="#e5e7eb" stroke-width="2"/>
    <line x1="179" y1="242" x2="374" y2="242" stroke="#e5e7eb" stroke-width="2"/>
    <line x1="179" y1="279" x2="374" y2="279" stroke="#e5e7eb" stroke-width="2"/>
    <line x1="179" y1="316" x2="323" y2="316" stroke="#e5e7eb" stroke-width="2"/>
  </g>

  <!-- "日" 字 -->
  <text
    x="256"
    y="256"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
    font-size="100"
    font-weight="700"
    fill="#3b82f6"
  >日</text>
</svg>`;

// Maskable 图标 SVG (512x512 with 80% safe zone)
const maskableIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- 完整背景 (会被 mask 裁剪) -->
  <rect width="512" height="512" fill="url(#bg-gradient)"/>

  <!-- 安全区内容 (80% = 409.6px, margin: 51.2px) -->
  <g transform="translate(51.2, 51.2)">
    <!-- 日记本 - 缩小以适应安全区 -->
    <g filter="url(#shadow)">
      <rect x="51" y="64" width="308" height="282" fill="white" rx="16"/>
      <line x1="97" y1="95" x2="97" y2="315" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
      <line x1="128" y1="141" x2="323" y2="141" stroke="#e5e7eb" stroke-width="2"/>
      <line x1="128" y1="178" x2="323" y2="178" stroke="#e5e7eb" stroke-width="2"/>
      <line x1="128" y1="215" x2="323" y2="215" stroke="#e5e7eb" stroke-width="2"/>
      <line x1="128" y1="252" x2="268" y2="252" stroke="#e5e7eb" stroke-width="2"/>
    </g>

    <!-- "日" 字 -->
    <text
      x="204.8"
      y="204.8"
      dominant-baseline="middle"
      text-anchor="middle"
      font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
      font-size="100"
      font-weight="700"
      fill="#3b82f6"
    >日</text>
  </g>
</svg>`;

// Apple Touch Icon (180x180)
const appleTouchIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>

  <rect width="180" height="180" fill="url(#bg-gradient)"/>

  <g filter="url(#shadow)">
    <rect x="36" y="45" width="108" height="99" fill="white" rx="6"/>
    <line x1="52" y1="56" x2="52" y2="133" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="63" y1="72" x2="131" y2="72" stroke="#e5e7eb" stroke-width="1"/>
    <line x1="63" y1="85" x2="131" y2="85" stroke="#e5e7eb" stroke-width="1"/>
    <line x1="63" y1="98" x2="131" y2="98" stroke="#e5e7eb" stroke-width="1"/>
    <line x1="63" y1="111" x2="113" y2="111" stroke="#e5e7eb" stroke-width="1"/>
  </g>

  <text
    x="90"
    y="90"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
    font-size="35"
    font-weight="700"
    fill="#3b82f6"
  >日</text>
</svg>`;

function saveFile(filename, content) {
  const filepath = path.join(PUBLIC_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ Created: ${filename}`);
}

console.log('🎨 生成 PWA 图标...\n');

// 保存 SVG 图标
saveFile('icon.svg', standardIconSVG);
saveFile('icon-maskable.svg', maskableIconSVG);
saveFile('apple-touch-icon.svg', appleTouchIconSVG);

console.log('\n📝 注意：');
console.log('1. SVG 图标已生成完成');
console.log('2. PNG 图标需要使用浏览器工具生成：');
console.log('   打开: scripts/generateIcons.html');
console.log('   或者安装 sharp: npm install --save-dev sharp');
console.log('   然后运行: node scripts/generateIconsPNG.js\n');

// 检查是否可以生成 PNG
try {
  require.resolve('sharp');
  console.log('✅ 检测到 sharp 库，可以生成 PNG');
  console.log('运行: node scripts/generateIconsPNG.js\n');
} catch (e) {
  console.log('⚠️  未安装 sharp 库');
  console.log('安装方法: npm install --save-dev sharp\n');
}
