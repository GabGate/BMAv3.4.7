const CACHE_NAME = 'bma-v34r-cache-v2';
const ASSETS = ['./index.html','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only cache GET requests — POST/PUT etc. cannot be cached
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip external API calls — never cache Gemini or other API requests
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('openai.com')) return;

  // Google Fonts — network first, fall back to cache
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // App assets — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
