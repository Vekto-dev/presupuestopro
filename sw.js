// PresupuestoPro — Service Worker v2
// No intercepta scripts externos (Firebase, fonts, CDN)

const CACHE = 'pp4-v4';

// Solo cacheamos el HTML de la app
const APP_SHELL = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NO interceptar: Firebase, Google APIs, CDNs externos
  const external = [
    'firebaseapp.com',
    'googleapis.com',
    'gstatic.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];
  if (external.some(d => url.hostname.includes(d))) return;

  // Solo manejar GET del mismo origen
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Cache first para el app shell, network first para todo lo demás
  const isShell = url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
