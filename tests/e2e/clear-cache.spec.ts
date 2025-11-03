import { test, chromium } from '@playwright/test';

test('自动清除浏览器缓存并验证', async () => {
  console.log('🚀 启动浏览器...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('\n=== 第 1 步：访问网站 ===');
  await page.goto('https://fmhdiary.com/');
  await page.waitForTimeout(2000);
  
  console.log('\n=== 第 2 步：清除所有 Service Workers ===');
  const swCount = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('找到', registrations.length, '个 Service Workers');
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ 已注销 Service Worker:', registration.scope);
    }
    return registrations.length;
  });
  console.log('✅ 已清除', swCount, '个 Service Workers');
  
  console.log('\n=== 第 3 步：清除 IndexedDB 数据库 ===');
  const dbCount = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    console.log('找到', dbs.length, '个数据库');
    for (const db of dbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log('✅ 已删除数据库:', db.name);
      }
    }
    return dbs.length;
  });
  console.log('✅ 已清除', dbCount, '个数据库');
  
  console.log('\n=== 第 4 步：清除 localStorage ===');
  await page.evaluate(() => {
    const count = localStorage.length;
    localStorage.clear();
    console.log('✅ 已清除', count, '个 localStorage 项');
  });
  
  console.log('\n=== 第 5 步：清除 sessionStorage ===');
  await page.evaluate(() => {
    const count = sessionStorage.length;
    sessionStorage.clear();
    console.log('✅ 已清除', count, '个 sessionStorage 项');
  });
  
  console.log('\n=== 第 6 步：清除所有 Cookies ===');
  const cookies = await context.cookies();
  await context.clearCookies();
  console.log('✅ 已清除', cookies.length, '个 Cookies');
  
  console.log('\n=== 第 7 步：清除缓存存储 ===');
  await page.evaluate(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('找到', cacheNames.length, '个缓存');
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log('✅ 已删除缓存:', name);
      }
    }
  });
  
  console.log('\n=== 第 8 步：强制刷新页面（禁用缓存）===');
  console.log('⏳ 正在重新加载...');
  await page.goto('https://fmhdiary.com/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('⏳ 等待页面完全渲染...');
  await page.waitForTimeout(5000);
  
  console.log('\n=== 第 9 步：验证页面状态 ===');
  
  const pageState = await page.evaluate(() => {
    return {
      title: document.title,
      hasLoading: document.body.textContent?.includes('加载中'),
      hasError: document.body.textContent?.includes('加载失败'),
      hasMainTitle: document.body.textContent?.includes('我的日记'),
      hasNewButton: document.body.textContent?.includes('写第一篇日记'),
      bodyLength: document.body.textContent?.length || 0
    };
  });
  
  console.log('📊 页面标题:', pageState.title);
  console.log('❌ 卡在"加载中":', pageState.hasLoading ? '是 ⚠️' : '否 ✅');
  console.log('❌ 显示错误:', pageState.hasError ? '是 ⚠️' : '否 ✅');
  console.log('✅ 显示"我的日记":', pageState.hasMainTitle ? '是 ✅' : '否 ❌');
  console.log('✅ 显示新建按钮:', pageState.hasNewButton ? '是 ✅' : '否 ❌');
  console.log('📄 页面内容长度:', pageState.bodyLength, '字符');
  
  console.log('\n=== 第 10 步：截图保存 ===');
  await page.screenshot({ 
    path: '/tmp/after-cache-clear.png', 
    fullPage: true 
  });
  console.log('📸 截图已保存到: /tmp/after-cache-clear.png');
  
  console.log('\n=== 🎉 清除完成！===');
  console.log('✅ 所有缓存、Service Workers、存储数据已清除');
  console.log('✅ 页面已重新加载');
  
  if (!pageState.hasLoading && pageState.hasMainTitle) {
    console.log('\n🎊 成功！网站现在应该正常显示了！');
  } else {
    console.log('\n⚠️ 警告：页面可能还有问题，请检查截图');
  }
  
  console.log('\n⏸️  浏览器将保持打开 15 秒供您查看...');
  await page.waitForTimeout(15000);
  
  await browser.close();
  console.log('\n✅ 浏览器已关闭');
});
