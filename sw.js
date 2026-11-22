// Service worker nové aplikace: soubory aplikace se berou ze sítě a při
// výpadku z mezipaměti, takže se aplikace otevře i offline. Data řeší
// Firestore sám (offline mezipaměť v prohlížeči).
const CACHE = 'kokrsnek-1.00';
const SHELL = [
  './', 'index.html', 'manifest.json', 'app.css', 'themes.css',
  'app.js', 'config.js', 'firebase.js', 'util.js', 'ui.js', 'namedays.js',
  'auth.js', 'store.js', 'attend.js', 'theme.js', 'version.js',
  'login.js', 'akce.js', 'kalendar.js', 'detail.js',
  'editor.js', 'parta.js', 'brzy.js',
  'icon-192.png', 'icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
