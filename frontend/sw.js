const CACHE = 'ecorewards-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/leaderboard.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});