import { test, chromium } from '@playwright/test';

test('捕获客户端错误详情', async () => {
  const browser = await chromium.launch({
    headless: false
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 捕获所有错误
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const text = msg.text();
    logs.push({ type: msg.type(), text });
    console.log(`[${msg.type()}]`, text);
  });
  
  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack
    });
    console.log('\n❌ 页面错误:');
    console.log('消息:', error.message);
    console.log('堆栈:', error.stack);
  });
  
  // 访问网站
  console.log('访问 https://fmhdiary.com/ ...');
  await page.goto('https://fmhdiary.com/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  await page.waitForTimeout(5000);
  
  // 截图
  await page.screenshot({ 
    path: '/tmp/error-screenshot.png', 
    fullPage: true 
  });
  
  console.log('\n=== 捕获的错误 ===');
  if (errors.length > 0) {
    errors.forEach((err, i) => {
      console.log(`\n错误 ${i + 1}:`);
      console.log('消息:', err.message);
      console.log('堆栈:', err.stack);
    });
  } else {
    console.log('没有捕获到错误');
  }
  
  await page.waitForTimeout(10000);
  await browser.close();
});
