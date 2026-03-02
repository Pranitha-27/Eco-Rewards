// Bump this version whenever you update your files
const CACHE_VERSION = 'ecorewards-v3';

// Only cache static assets — NOT html files
const STATIC_ASSETS = [
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/favicon.ico',
];

// Install — cache only static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Immediately activate new service worker
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first for HTML and API, cache first for static assets only
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always fetch API calls from network, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Always fetch HTML from network (so changes show immediately)
  if (e.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/') return;

  // For static assets (images, icons) use cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});