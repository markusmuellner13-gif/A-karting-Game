const CACHE = 'kart-racer-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/game.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  // Network-first for socket.io, cache-first for static assets
  if (e.request.url.includes('/socket.io/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
