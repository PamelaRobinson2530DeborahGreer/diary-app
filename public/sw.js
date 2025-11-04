// Service Worker for Journal App PWA
// Version: 1.1.0

const CACHE_NAME = 'journal-app-v2';
const RUNTIME_CACHE = 'journal-runtime-v2';

// 预缓存的静态资源（不依赖构建哈希的文件）
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon.svg',
  '/apple-splash-iphone5.png',
  '/apple-splash-iphone6.png',
  '/apple-splash-iphonex.png',
  '/apple-splash-iphonexr.png',
  '/apple-splash-iphonexsmax.png',
  '/apple-splash-iphone12.png',
  '/apple-splash-iphone12max.png',
  '/apple-splash-ipad.png',
  '/apple-splash-ipadpro10.png',
  '/apple-splash-ipadpro11.png',
  '/apple-splash-ipadpro12.png',
  '/fonts/NotoSansSC-Regular.otf'
];

// 安装事件：预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // 立即激活新 SW
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 删除所有非当前版本的缓存
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // 立即控制所有页面
      })
  );
});

// Fetch 事件：智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return;
  }

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过非同源请求（Chrome 扩展等）
  if (url.origin !== self.location.origin) {
    return;
  }

  // 跳过 Next.js 数据请求（保护加密数据）
  if (url.pathname.includes('/_next/data/')) {
    return;
  }

  // 跳过 API 路由（如果有）
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // 缓存命中策略
        if (cachedResponse) {
          console.log('[SW] Cache hit:', url.pathname);

          // 对于静态资源，直接返回缓存
          if (isStaticAsset(url.pathname)) {
            return cachedResponse;
          }

          // 对于页面，返回缓存同时后台更新
          fetchAndCache(request);
          return cachedResponse;
        }

        // 缓存未命中，发起网络请求
        console.log('[SW] Cache miss, fetching:', url.pathname);
        return fetchAndCache(request);
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);

        // 网络失败且无缓存时，返回离线页面
        if (request.destination === 'document') {
          return caches.match('/offline');
        }

        // 其他资源失败时返回 null（浏览器会处理）
        return null;
      })
  );
});

// 辅助函数：判断是否为静态资源
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.startsWith('/_next/static/');
}

// 辅助函数：fetch 并缓存
function fetchAndCache(request) {
  return fetch(request)
    .then((response) => {
      // 只缓存成功的响应
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }

      // 克隆响应（因为响应流只能使用一次）
      const responseClone = response.clone();

      // 决定使用哪个缓存
      const url = new URL(request.url);
      const cacheName = STATIC_ASSETS.includes(url.pathname) ? CACHE_NAME : RUNTIME_CACHE;

      // 异步缓存（不阻塞返回）
      caches.open(cacheName)
        .then((cache) => {
          cache.put(request, responseClone);
          console.log('[SW] Cached:', url.pathname, 'in', cacheName);
        })
        .catch((error) => {
          console.error('[SW] Cache put failed:', error);
        });

      return response;
    });
}

// 消息事件：与页面通信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification.tag);

  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // 根据通知数据决定打开的页面
  if (data.action === 'open-new') {
    url = '/new';
  } else if (data.type === 'reminder') {
    url = '/new';
  } else if (data.type === 'goal') {
    url = '/statistics';
  } else if (data.type === 'celebration') {
    url = '/statistics';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有打开的窗口，聚焦并导航
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if ('navigate' in client) {
              return client.navigate(url);
            }
          });
        }
      }

      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// 推送通知事件（为未来推送通知预留）
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '你有一条新消息',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      data: data.data || {},
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Journal App', options)
    );
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
  }
});

console.log('[SW] Service Worker script loaded');
