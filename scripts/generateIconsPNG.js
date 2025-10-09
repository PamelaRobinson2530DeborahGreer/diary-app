#!/usr/bin/env node

/**
 * PWA PNG 图标生成脚本 (使用 sharp)
 *
 * 从 SVG 生成 PNG 图标，包括：
 * - icon-192.png (192x192 标准图标)
 * - icon-512.png (512x512 标准图标)
 * - icon-maskable-192.png (192x192 maskable)
 * - icon-maskable-512.png (512x512 maskable)
 * - apple-touch-icon.png (180x180 iOS)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');

async function generatePNGFromSVG(svgFilename, outputFilename, size) {
  const svgPath = path.join(PUBLIC_DIR, svgFilename);
  const outputPath = path.join(PUBLIC_DIR, outputFilename);

  try {
    await sharp(svgPath)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✅ Created: ${outputFilename} (${(stats.size / 1024).toFixed(1)}KB)`);
  } catch (error) {
    console.error(`❌ Failed to create ${outputFilename}:`, error.message);
  }
}

async function main() {
  console.log('🎨 生成 PWA PNG 图标...\n');

  // 确保 SVG 文件存在
  const requiredSVGs = ['icon.svg', 'icon-maskable.svg', 'apple-touch-icon.svg'];
  const missingSVGs = requiredSVGs.filter(
    svg => !fs.existsSync(path.join(PUBLIC_DIR, svg))
  );

  if (missingSVGs.length > 0) {
    console.error('❌ 缺少 SVG 文件:');
    missingSVGs.forEach(svg => console.error(`   - ${svg}`));
    console.error('\n请先运行: node scripts/generateIconsNode.js\n');
    process.exit(1);
  }

  // 生成所有 PNG 图标
  await Promise.all([
    // 标准图标
    generatePNGFromSVG('icon.svg', 'icon-192.png', 192),
    generatePNGFromSVG('icon.svg', 'icon-512.png', 512),

    // Maskable 图标
    generatePNGFromSVG('icon-maskable.svg', 'icon-maskable-192.png', 192),
    generatePNGFromSVG('icon-maskable.svg', 'icon-maskable-512.png', 512),

    // Apple Touch Icon
    generatePNGFromSVG('apple-touch-icon.svg', 'apple-touch-icon.png', 180),
  ]);

  console.log('\n✅ 所有 PNG 图标生成完成！');
  console.log('\n📝 下一步:');
  console.log('1. 检查 public/ 目录下的图标文件');
  console.log('2. 更新 manifest.json (如需要)');
  console.log('3. 更新 app/layout.tsx 添加 Apple Touch Icon 链接\n');
}

main().catch(error => {
  console.error('❌ 生成失败:', error);
  process.exit(1);
});
