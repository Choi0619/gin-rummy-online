const THEME_CACHE_VERSION = 'gin-rummy-theme-assets-v2';
const THEME_ASSET_PATH = /^\/assets\/(?:abyss|angel|profile-borders)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('gin-rummy-theme-assets-') && name !== THEME_CACHE_VERSION)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'WARM_THEME' || !Array.isArray(event.data.assets)) return;
  const urls = event.data.assets.filter(url => typeof url === 'string' && THEME_ASSET_PATH.test(url));
  event.waitUntil((async () => {
    const cache = await caches.open(THEME_CACHE_VERSION);
    await Promise.allSettled(urls.map(async url => {
      if (await cache.match(url)) return;
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await cache.put(url, response);
    }));
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !THEME_ASSET_PATH.test(url.pathname)) return;

  const update = (async () => {
    const cache = await caches.open(THEME_CACHE_VERSION);
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })();

  event.respondWith((async () => {
    const cache = await caches.open(THEME_CACHE_VERSION);
    return (await cache.match(request)) || update;
  })());
  event.waitUntil(update.then(() => undefined).catch(() => undefined));
});
