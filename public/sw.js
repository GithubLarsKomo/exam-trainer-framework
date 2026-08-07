const CACHE = 'etf-v0.5.2-legal';
const CORE = ['./index.html', './manifest.webmanifest', './legal.css', './impressum.html', './datenschutz.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const isNavigation = request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith((async () => {
      const pathname = new URL(request.url).pathname;
      const legalTarget = pathname.endsWith('/impressum.html')
        ? './impressum.html'
        : pathname.endsWith('/datenschutz.html')
          ? './datenschutz.html'
          : undefined;
      const cacheTarget = legalTarget ?? './index.html';
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        await cache.put(cacheTarget, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(cacheTarget)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    });
    return cached || network;
  })());
});
