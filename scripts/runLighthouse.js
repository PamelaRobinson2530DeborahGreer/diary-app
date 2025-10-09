#!/usr/bin/env node
// scripts/runLighthouse.js - PWA Lighthouse 审计脚本

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../lighthouse-reports');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const config = {
  // PWA 审计配置
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2
    }
  }
};

console.log('🔍 开始 Lighthouse PWA 审计...\n');
console.log(`📊 目标 URL: ${TARGET_URL}`);
console.log(`📁 报告目录: ${OUTPUT_DIR}\n`);

// 生成 HTML 和 JSON 报告
const htmlReport = path.join(OUTPUT_DIR, `report-${TIMESTAMP}.html`);
const jsonReport = path.join(OUTPUT_DIR, `report-${TIMESTAMP}.json`);

const command = `npx lighthouse "${TARGET_URL}" \
  --output=html,json \
  --output-path="${path.join(OUTPUT_DIR, `report-${TIMESTAMP}`)}" \
  --only-categories=performance,accessibility,best-practices,seo,pwa \
  --form-factor=mobile \
  --throttling.rttMs=150 \
  --throttling.throughputKbps=1638.4 \
  --throttling.cpuSlowdownMultiplier=4 \
  --screenEmulation.mobile=true \
  --screenEmulation.width=375 \
  --screenEmulation.height=667 \
  --screenEmulation.deviceScaleFactor=2 \
  --chrome-flags="--headless"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Lighthouse 审计失败:', error.message);
    process.exit(1);
  }

  if (stderr) {
    console.error('⚠️  警告:', stderr);
  }

  console.log('✅ Lighthouse 审计完成！\n');

  // 读取 JSON 报告并提取关键指标
  try {
    const report = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
    const categories = report.categories;

    console.log('📈 评分摘要:\n');
    console.log(`  性能 (Performance):        ${Math.round(categories.performance.score * 100)}/100`);
    console.log(`  可访问性 (Accessibility):  ${Math.round(categories.accessibility.score * 100)}/100`);
    console.log(`  最佳实践 (Best Practices): ${Math.round(categories['best-practices'].score * 100)}/100`);
    console.log(`  SEO:                       ${Math.round(categories.seo.score * 100)}/100`);
    console.log(`  PWA:                       ${Math.round(categories.pwa.score * 100)}/100\n`);

    // PWA 关键指标
    console.log('🔧 PWA 关键指标:\n');
    const pwaAudits = categories.pwa.auditRefs;
    pwaAudits.forEach(auditRef => {
      const audit = report.audits[auditRef.id];
      const status = audit.score === 1 ? '✅' : (audit.score === 0 ? '❌' : '⚠️');
      console.log(`  ${status} ${audit.title}`);
    });

    // 性能指标
    console.log('\n⚡ 性能指标:\n');
    const metrics = report.audits['metrics'].details.items[0];
    console.log(`  FCP (首次内容绘制):     ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`  LCP (最大内容绘制):     ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`  TBT (总阻塞时间):       ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`  CLS (累积布局偏移):     ${metrics.cumulativeLayoutShift.toFixed(3)}`);
    console.log(`  SI (速度指数):          ${Math.round(metrics.speedIndex)}ms\n`);

    // 可安装性检查
    console.log('📱 可安装性检查:\n');
    const installable = report.audits['installable-manifest'];
    const serviceWorker = report.audits['service-worker'];
    const offline = report.audits['works-offline'];

    console.log(`  Manifest 可安装: ${installable.score === 1 ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  Service Worker:  ${serviceWorker.score === 1 ? '✅ 已注册' : '❌ 未注册'}`);
    console.log(`  离线可用:        ${offline.score === 1 ? '✅ 支持' : '❌ 不支持'}\n`);

    // 生成建议
    console.log('💡 优化建议:\n');
    const opportunities = report.audits;
    const suggestions = [];

    if (categories.performance.score < 0.9) {
      suggestions.push('  ⚡ 性能优化: 考虑代码分割、图片懒加载、压缩资源');
    }
    if (categories.accessibility.score < 0.95) {
      suggestions.push('  ♿ 可访问性: 检查 ARIA 标签、色彩对比度、键盘导航');
    }
    if (categories.pwa.score < 1) {
      suggestions.push('  📱 PWA 完善: 确保所有 PWA 审计项通过');
    }
    if (metrics.largestContentfulPaint > 2500) {
      suggestions.push('  🎨 LCP 优化: 减少首屏渲染时间，预加载关键资源');
    }
    if (metrics.totalBlockingTime > 300) {
      suggestions.push('  ⏱️  TBT 优化: 减少主线程阻塞，拆分长任务');
    }

    if (suggestions.length > 0) {
      suggestions.forEach(s => console.log(s));
    } else {
      console.log('  🎉 所有指标优秀，无需优化！');
    }

    console.log(`\n📄 详细报告: ${htmlReport}`);
    console.log(`📊 JSON 数据: ${jsonReport}\n`);

    // 保存摘要到 Markdown
    const summary = `# Lighthouse 审计报告 - ${new Date().toLocaleString('zh-CN')}

## 评分摘要

| 类别 | 得分 | 评级 |
|------|------|------|
| 性能 (Performance) | ${Math.round(categories.performance.score * 100)}/100 | ${getGrade(categories.performance.score)} |
| 可访问性 (Accessibility) | ${Math.round(categories.accessibility.score * 100)}/100 | ${getGrade(categories.accessibility.score)} |
| 最佳实践 (Best Practices) | ${Math.round(categories['best-practices'].score * 100)}/100 | ${getGrade(categories['best-practices'].score)} |
| SEO | ${Math.round(categories.seo.score * 100)}/100 | ${getGrade(categories.seo.score)} |
| PWA | ${Math.round(categories.pwa.score * 100)}/100 | ${getGrade(categories.pwa.score)} |

## 性能指标

| 指标 | 数值 | 目标 | 状态 |
|------|------|------|------|
| FCP (首次内容绘制) | ${Math.round(metrics.firstContentfulPaint)}ms | < 1800ms | ${metrics.firstContentfulPaint < 1800 ? '✅' : '❌'} |
| LCP (最大内容绘制) | ${Math.round(metrics.largestContentfulPaint)}ms | < 2500ms | ${metrics.largestContentfulPaint < 2500 ? '✅' : '❌'} |
| TBT (总阻塞时间) | ${Math.round(metrics.totalBlockingTime)}ms | < 300ms | ${metrics.totalBlockingTime < 300 ? '✅' : '❌'} |
| CLS (累积布局偏移) | ${metrics.cumulativeLayoutShift.toFixed(3)} | < 0.1 | ${metrics.cumulativeLayoutShift < 0.1 ? '✅' : '❌'} |
| SI (速度指数) | ${Math.round(metrics.speedIndex)}ms | < 3400ms | ${metrics.speedIndex < 3400 ? '✅' : '❌'} |

## PWA 可安装性

- **Manifest 可安装**: ${installable.score === 1 ? '✅ 通过' : '❌ 失败'}
- **Service Worker**: ${serviceWorker.score === 1 ? '✅ 已注册' : '❌ 未注册'}
- **离线可用**: ${offline.score === 1 ? '✅ 支持' : '❌ 不支持'}

## 优化建议

${suggestions.length > 0 ? suggestions.map(s => s.trim()).join('\n') : '🎉 所有指标优秀，无需优化！'}

## 报告文件

- HTML 报告: [report-${TIMESTAMP}.html](./report-${TIMESTAMP}.html)
- JSON 数据: [report-${TIMESTAMP}.json](./report-${TIMESTAMP}.json)
`;

    const summaryPath = path.join(OUTPUT_DIR, `SUMMARY-${TIMESTAMP}.md`);
    fs.writeFileSync(summaryPath, summary);
    console.log(`📝 摘要已保存: ${summaryPath}\n`);

  } catch (err) {
    console.error('⚠️  无法解析报告:', err.message);
  }
});

function getGrade(score) {
  if (score >= 0.9) return '🟢 优秀';
  if (score >= 0.5) return '🟡 中等';
  return '🔴 需改进';
}
