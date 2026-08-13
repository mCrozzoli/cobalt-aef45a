/* Offline cache. Bump CACHE when the pages change. */
const CACHE = 'fitness-v8';
const FILES = [
  './', './index.html',
  './training-log.html', './daily-log.html', './food-playbook.html',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './store-training.js', './store-daily.js',
  './coach.js', './coach-ui.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
