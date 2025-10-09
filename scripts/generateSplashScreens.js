#!/usr/bin/env node

/**
 * iOS Splash Screen 生成脚本
 *
 * 生成不同尺寸的 iOS 启动画面
 * 参考: https://developer.apple.com/design/human-interface-guidelines/app-icons
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');

// iOS 设备启动画面尺寸
// https://developer.apple.com/design/human-interface-guidelines/launch-screen#Specifications
const SPLASH_SIZES = [
  // iPhone
  { name: 'iphone5', width: 640, height: 1136 },        // iPhone SE (1st gen)
  { name: 'iphone6', width: 750, height: 1334 },        // iPhone 8
  { name: 'iphonex', width: 1125, height: 2436 },       // iPhone X/XS/11 Pro
  { name: 'iphonexr', width: 828, height: 1792 },       // iPhone XR/11
  { name: 'iphonexsmax', width: 1242, height: 2688 },   // iPhone XS Max/11 Pro Max
  { name: 'iphone12', width: 1170, height: 2532 },      // iPhone 12/13/14 Pro
  { name: 'iphone12max', width: 1284, height: 2778 },   // iPhone 12/13/14 Pro Max

  // iPad
  { name: 'ipad', width: 1536, height: 2048 },          // iPad (portrait)
  { name: 'ipadpro10', width: 1668, height: 2224 },     // iPad Pro 10.5"
  { name: 'ipadpro11', width: 1668, height: 2388 },     // iPad Pro 11"
  { name: 'ipadpro12', width: 2048, height: 2732 },     // iPad Pro 12.9"
];

async function generateSplashScreen(name, width, height) {
  const outputPath = path.join(PUBLIC_DIR, `apple-splash-${name}.png`);

  // 创建 SVG 启动画面
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="url(#bg)"/>

      <!-- 中心图标 -->
      <g transform="translate(${width / 2}, ${height / 2})">
        <!-- 白色圆形背景 -->
        <circle cx="0" cy="0" r="${Math.min(width, height) * 0.15}" fill="white" opacity="0.95"/>

        <!-- "日" 字 -->
        <text
          x="0"
          y="0"
          dominant-baseline="middle"
          text-anchor="middle"
          font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
          font-size="${Math.min(width, height) * 0.12}"
          font-weight="700"
          fill="#3b82f6"
        >日</text>
      </g>

      <!-- 底部文字 -->
      <text
        x="${width / 2}"
        y="${height * 0.85}"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="system-ui, sans-serif"
        font-size="${Math.min(width, height) * 0.03}"
        font-weight="600"
        fill="white"
        opacity="0.9"
      >Journal App</text>
    </svg>
  `;

  try {
    await sharp(Buffer.from(svg))
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✅ Created: apple-splash-${name}.png (${width}x${height}) - ${(stats.size / 1024).toFixed(1)}KB`);
  } catch (error) {
    console.error(`❌ Failed to create apple-splash-${name}.png:`, error.message);
  }
}

async function main() {
  console.log('🎨 生成 iOS Splash Screens...\n');

  // 生成所有尺寸的启动画面
  for (const { name, width, height } of SPLASH_SIZES) {
    await generateSplashScreen(name, width, height);
  }

  console.log('\n✅ 所有 Splash Screens 生成完成！');
  console.log('\n📝 下一步:');
  console.log('将以下 meta 标签添加到 app/layout.tsx 的 <head> 中：\n');

  // 生成 meta 标签代码
  console.log('        {/* iOS Splash Screens */}');
  SPLASH_SIZES.forEach(({ name, width, height }) => {
    const orientation = width < height ? 'portrait' : 'landscape';
    console.log(`        <link rel="apple-touch-startup-image" media="(device-width: ${width / 2}px) and (device-height: ${height / 2}px) and (-webkit-device-pixel-ratio: 2) and (orientation: ${orientation})" href="/apple-splash-${name}.png" />`);
  });
  console.log();
}

main().catch(error => {
  console.error('❌ 生成失败:', error);
  process.exit(1);
});
