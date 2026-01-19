const CACHE_NAME = 'rise-app-cache-v3';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/lovable-uploads/8a13e880-4305-4f6d-bb4a-1f2b4650dd36.png',
  '/lovable-uploads/e9739c50-a4ab-45ca-86ca-3aef0ad19461.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      await self.skipWaiting();
    })().catch(() => {
      // If precaching fails, still install; network will serve assets.
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const shouldCache = (request, response) => {
  // Only cache successful, same-origin, non-partial responses
  if (!response) return false;
  if (response.status !== 200) return false;
  if (response.type !== 'basic') return false;

  // Avoid caching API/data requests; keep caching focused on app shell/assets
  const dest = request.destination;
  const isAsset = ['script', 'style', 'image', 'font', 'manifest'].includes(dest);
  const isNavigate = request.mode === 'navigate';
  return isAsset || isNavigate;
};

const handleNavigate = async (request) => {
  try {
    const response = await fetch(request);

    // Cache the latest app shell for offline navigation
    if (shouldCache(request, response)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/index.html', response.clone()).catch(() => {});
    }

    return response;
  } catch {
    // Offline fallback to cached app shell
    const cached = await caches.match('/index.html');
    if (cached) return cached;
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
};

const handleAsset = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (shouldCache(request, response)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never handle range requests (video/audio streaming) to avoid 206 cache errors
  if (event.request.headers.has('range')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigate(event.request));
    return;
  }

  event.respondWith(
    handleAsset(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('', { status: 504 });
    })
  );
});

