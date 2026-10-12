// Offline cache for Buhurt: Steel & Tape. Bump VERSION when you upload a new build.
const VERSION = 'steel-tape-hosted-spectate13';
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./sfx_base.js", "./sfx_00.js", "./sfx_01.js", "./sfx_02.js", "./sfx_03.js", "./library_base.js", "./library_icons_00.js", "./library_surfaces_00.js", "./library_models_00.js", "./library_models_01.js", "./library_models_02.js", "./library_models_03.js", "./library_models_04.js", "./library_models_05.js", "./library_models_06.js", "./library_models_07.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// the game page and its icons: cache first; three.js and fonts from their CDNs: cached the first time they load
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // The owner dashboard includes authentication state. Never serve an obsolete admin
  // bundle out of the PWA's cache, and never replace a failed dashboard load with game HTML.
  if (url.origin === self.location.origin && /^\/admin(?:[.\/-]|$)/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() =>
      new Response('Admin dashboard is unavailable offline. Reconnect and reload.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      })));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (e.request.url.startsWith(self.location.origin) || /cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(e.request.url))) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
