// Give It A Shot service worker. Bump VERSION to force clients to drop old caches.
const VERSION = 'v1';
const SHELL = 'gias-shell-' + VERSION;
const ASSETS = 'gias-assets-' + VERSION;
const FONTS = 'gias-fonts-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, ASSETS, FONTS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackKey || req);
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch Supabase (auth, scores, leaderboard must always be live).
  if (url.hostname.endsWith('supabase.co')) return;
  // Google Fonts: cache so the look survives offline.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req, FONTS).catch(() => Response.error()));
    return;
  }
  if (url.origin !== location.origin) return;
  // Page loads: network first (so deploys show up), cached shell when offline. Auth-redirect query strings share one entry.
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, '/').catch(() => caches.match('/')));
    return;
  }
  // Hashed build files never change: cache first.
  if (url.pathname.startsWith('/assets/')) { e.respondWith(cacheFirst(req, ASSETS)); return; }
  // Icons, manifest: network first.
  e.respondWith(networkFirst(req, SHELL).catch(() => caches.match(req)));
});
