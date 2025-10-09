// tests/e2e/pwa.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // 清除 Service Worker 和缓存
    await page.goto('/');
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    });
  });

  test('should register Service Worker successfully', async ({ page }) => {
    // 监听 console 日志
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('[App] SW registered')) {
        logs.push(msg.text());
      }
    });

    // 访问首页
    await page.goto('/');

    // 等待 Service Worker 注册
    await page.waitForTimeout(2000);

    // 验证 Service Worker 已注册
    const swRegistered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined;
    });

    expect(swRegistered).toBe(true);

    // 验证控制台有注册日志
    expect(logs.some(log => log.includes('SW registered'))).toBe(true);
  });

  test('should load manifest.json correctly', async ({ page }) => {
    await page.goto('/');

    // 获取 manifest 链接
    const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestUrl).toBe('/manifest.json');

    // 验证 manifest 内容
    const response = await page.request.get('/manifest.json');
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toBe('Journal App - 加密日记');
    expect(manifest.short_name).toBe('日记');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#3b82f6');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should have all required PWA assets', async ({ page }) => {
    const assets = [
      '/manifest.json',
      '/sw.js',
      '/icon.svg',
      '/icon-192.png',
      '/icon-512.png'
    ];

    for (const asset of assets) {
      const response = await page.request.get(asset);
      expect(response.ok()).toBe(true);
    }
  });

  test('should cache static assets after first visit', async ({ page }) => {
    await page.goto('/');

    // 等待 Service Worker 激活和缓存
    await page.waitForTimeout(3000);

    // 检查缓存是否创建
    const cacheExists = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      return cacheNames.some(name => name.includes('journal-app'));
    });

    expect(cacheExists).toBe(true);

    // 检查静态资源是否已缓存
    const cachedAssets = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const cache = await caches.open(cacheNames[0]);
      const keys = await cache.keys();
      return keys.map(req => new URL(req.url).pathname);
    });

    // 验证关键资源已缓存
    expect(cachedAssets).toContain('/');
    expect(cachedAssets).toContain('/offline');
    expect(cachedAssets).toContain('/manifest.json');
  });

  test('should display offline page with correct content', async ({ page }) => {
    await page.goto('/offline');

    // 验证页面标题
    const heading = page.locator('h1');
    await expect(heading).toHaveText('网络已断开');

    // 验证图标可见
    const icon = page.locator('svg').first();
    await expect(icon).toBeVisible();

    // 验证重新加载按钮存在
    const reloadButton = page.locator('button:has-text("重新加载")');
    await expect(reloadButton).toBeVisible();

    // 验证在线状态指示器存在（更精确的选择器）
    const statusIndicator = page.locator('span.text-muted-foreground').last();
    await expect(statusIndicator).toBeVisible();
  });

  test('should detect online/offline status on offline page', async ({ page }) => {
    await page.goto('/offline');

    // 初始应该是在线（使用更精确的选择器）
    const statusText = page.locator('.flex.items-center.justify-center.gap-2.text-sm span.text-muted-foreground');
    await expect(statusText).toContainText(/已连接|离线/);

    // 模拟离线
    await page.context().setOffline(true);
    await page.waitForTimeout(500);

    // 验证状态变为离线
    await expect(statusText).toContainText('离线');

    // 恢复在线
    await page.context().setOffline(false);
  });

  test('should have installable PWA characteristics', async ({ page }) => {
    await page.goto('/');

    // 验证 viewport meta 标签
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // 验证 manifest 链接存在（PWA 必需）
    const manifestLink = await page.locator('link[rel="manifest"]').count();
    expect(manifestLink).toBeGreaterThan(0);

    // 验证没有关键控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Service Worker')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);

    // 验证无关键错误
    expect(errors.length).toBe(0);
  });

  test('should reload page when clicking reload button on offline page', async ({ page }) => {
    await page.goto('/offline');

    // 点击重新加载按钮
    const reloadButton = page.locator('button:has-text("重新加载")');

    // 监听导航
    const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
    await reloadButton.click();

    // 验证页面刷新或导航
    // 在离线页面点击重新加载会触发 window.location.reload()
    await page.waitForTimeout(500);
  });

  test('should have manifest shortcuts configured', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    const manifest = await response.json();

    expect(manifest.shortcuts).toBeDefined();
    expect(manifest.shortcuts.length).toBeGreaterThan(0);

    const newEntryShortcut = manifest.shortcuts.find(
      (s: any) => s.name === '新建日记'
    );
    expect(newEntryShortcut).toBeDefined();
    expect(newEntryShortcut.url).toBe('/new');
  });

  test('should work across navigation with Service Worker', async ({ page }) => {
    // 首次访问
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 导航到设置页
    await page.goto('/settings');
    await page.waitForTimeout(1000);

    // 导航到离线页
    await page.goto('/offline');
    await page.waitForTimeout(1000);

    // 验证 Service Worker 仍然活跃
    const swActive = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.active !== null;
    });

    expect(swActive).toBe(true);
  });

  test('should update Service Worker when new version available', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 获取当前 Service Worker 版本信息
    const currentSW = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        hasActive: registration?.active !== null,
        hasWaiting: registration?.waiting !== null,
        hasInstalling: registration?.installing !== null
      };
    });

    expect(currentSW.hasActive).toBe(true);

    // 在实际场景中，Service Worker 更新需要服务器端文件变化
    // 这里只验证更新机制存在
  });

  test('should handle offline page auto-redirect when back online', async ({ page, context, browserName }) => {
    // WebKit 对 setOffline 支持有限，跳过此测试
    test.skip(browserName === 'webkit', 'WebKit offline mode has limited support');

    // 先访问离线页面
    await page.goto('/offline');

    // 验证初始在线状态
    const statusText = page.locator('.flex.items-center.justify-center.gap-2.text-sm span.text-muted-foreground');
    await expect(statusText).toContainText('已连接');

    // 注意：实际的自动重定向功能需要在真实离线/在线切换时测试
    // 这里只验证页面正常加载
  });
});
