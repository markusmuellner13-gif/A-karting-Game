const CACHE = 'kart-racer-v5';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/audio.js', '/js/game.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(all => all.forEach(c => c.postMessage({ type: 'sw-updated' })))
  );
  clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/socket.io/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
