import { test, chromium } from '@playwright/test';

test('在无痕模式下测试网站', async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--incognito']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('打开无痕窗口...');
  console.log('访问网站...');
  
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('浏览器日志:', text);
  });
  
  page.on('pageerror', error => {
    console.log('页面错误:', error.message);
  });
  
  await page.goto('https://fmhdiary.com/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('等待页面加载...');
  await page.waitForTimeout(5000);
  
  await page.screenshot({ 
    path: '/tmp/incognito-screenshot.png', 
    fullPage: true 
  });
  console.log('截图保存完成');
  
  const title = await page.title();
  const hasLoading = await page.locator('text=加载中').count();
  const hasError = await page.locator('text=加载失败').count();
  const hasMainTitle = await page.locator('text=我的日记').count();
  const hasNewButton = await page.locator('text=写第一篇日记').count();
  
  console.log('\n=== 页面检查结果 ===');
  console.log('标题:', title);
  console.log('卡在加载中:', hasLoading > 0);
  console.log('显示错误:', hasError > 0);
  console.log('显示主标题:', hasMainTitle > 0);
  console.log('显示新建按钮:', hasNewButton > 0);
  
  console.log('\n浏览器保持打开 10 秒...');
  await page.waitForTimeout(10000);
  
  await browser.close();
});
