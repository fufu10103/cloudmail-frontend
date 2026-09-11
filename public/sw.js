// CloudMail Service Worker
// 安全策略：只缓存同源静态资源与页面外壳；API 请求、附件、任何带凭证的请求一律不缓存
const CACHE_VERSION = 'cloudmail-v1';
const STATIC_CACHE = CACHE_VERSION + '-static';
const PAGE_CACHE = CACHE_VERSION + '-pages';

// 安装时预缓存应用图标与清单
const PRECACHE = ['/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// 激活时清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 判断是否为应缓存的同源静态资源
function isStaticAsset(url) {
  return url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icon') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 跨域请求（后端 API、R2 附件等）一律直连网络，不进入缓存，避免泄露邮件数据
  if (url.origin !== self.location.origin) return;
  // 同源下的接口/函数请求也不缓存
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/attachments/')) return;

  // 静态资源：cache-first（带版本哈希，可长期缓存）
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // 页面导航：network-first，保证总是拿到最新页面；离线时回退缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/mailbox/')))
    );
  }
});
