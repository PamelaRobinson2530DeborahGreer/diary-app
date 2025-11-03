import { test, expect } from '@playwright/test';

test('日记应用首页加载测试', async ({ page }) => {
  // 监听控制台错误
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 监听页面错误
  const pageErrors: Error[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error);
  });

  // 访问网站
  console.log('正在访问 https://fmhdiary.com/ ...');
  await page.goto('https://fmhdiary.com/', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  // 等待页面加载
  await page.waitForTimeout(3000);

  // 截图
  await page.screenshot({ path: '/tmp/fmhdiary-screenshot.png', fullPage: true });
  console.log('截图已保存到: /tmp/fmhdiary-screenshot.png');

  // 获取页面标题
  const title = await page.title();
  console.log('页面标题:', title);

  // 检查是否有"加载中"文本
  const loadingText = await page.locator('text=加载中').count();
  console.log('是否显示"加载中":', loadingText > 0);

  // 检查是否有错误提示
  const errorText = await page.locator('text=加载失败').count();
  console.log('是否显示错误:', errorText > 0);

  // 检查主要内容是否加载
  const mainContent = await page.locator('body').textContent();
  console.log('页面主要内容预览:', mainContent?.substring(0, 200));

  // 输出控制台错误
  console.log('\n=== 控制台错误 ===');
  if (consoleErrors.length > 0) {
    consoleErrors.forEach(err => console.log('❌', err));
  } else {
    console.log('✅ 没有控制台错误');
  }

  // 输出页面错误
  console.log('\n=== 页面 JavaScript 错误 ===');
  if (pageErrors.length > 0) {
    pageErrors.forEach(err => console.log('❌', err.message));
  } else {
    console.log('✅ 没有页面错误');
  }

  // 断言
  expect(pageErrors.length).toBe(0);
  expect(title).toBeTruthy();
});
