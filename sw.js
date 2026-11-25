// Service worker nové aplikace: soubory aplikace se berou ze sítě a při
// výpadku z mezipaměti, takže se aplikace otevře i offline. Data řeší
// Firestore sám (offline mezipaměť v prohlížeči).
const CACHE = 'kokrsnek-1.74';
const SHELL = [
  './', 'index.html', 'manifest.json', 'app.css', 'themes.css',
  'app.js', 'config.js', 'firebase.js', 'util.js', 'ui.js', 'namedays.js',
  'auth.js', 'store.js', 'attend.js', 'theme.js', 'version.js', 'plus.js', 'map.js', 'coverart.js',
  'login.js', 'akce.js', 'kalendar.js', 'detail.js',
  'editor.js', 'parta.js', 'chat.js', 'fotky.js', 'kde.js', 'presence.js', 'weather.js', 'emoji.js', 'emoji-data.js', 'intro.js', 'push.js', 'pushui.js', 'voice.js', 'polls.js', 'expenses.js', 'games.js', 'sudoku.js', 'profil.js', 'nav.js', 'people.js', 'celebrate.js', 'qr-platba.png',
  'logo-badge.png', 'icon-192.png', 'icon-512.png', 'badge-96.png'
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
  if (url.pathname.startsWith('/obed')) return; // samostatný formulář na obědy
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});

// ---------- Push notifikace ----------
// Cloudové funkce posílají jen „data“ (title, body, eventId, chatWith…),
// notifikaci zobrazíme sami — přesně jednou.
self.addEventListener('push', (e) => {
  let raw = {};
  try { raw = e.data ? e.data.json() : {}; } catch (x) { /* nic */ }
  const d = raw && typeof raw.data === 'object' ? raw.data : raw;
  e.waitUntil(self.registration.showNotification(d.title || 'KoKrŠNeK', {
    body: d.body || '', icon: 'icon-192.png', badge: 'badge-96.png', data: d
  }));
});

function targetHash(d) {
  if (!d) return '';
  if (d.gameId) return '#/hra/' + encodeURIComponent(d.gameId);
  if (d.eventId) return '#/akce/' + encodeURIComponent(d.eventId);
  if (d.bringKey) return '#/akce/' + encodeURIComponent(d.bringKey);
  if (d.expenseKey) return '#/akce/' + encodeURIComponent(d.expenseKey);
  if (d.chatWith) return '#/s/chat/' + encodeURIComponent(d.chatWith);
  if (d.pollId) return '#/s/anketa/' + encodeURIComponent(d.pollId);
  if (d.openPlaces) return '#/kde';
  if (d.openMembers) return '#/parta';
  return '';
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const hash = targetHash(e.notification.data);
  // iOS při otevření aplikace adresu ignoruje → cíl si uložíme, aplikace si ho vyzvedne.
  const save = new Promise((res) => {
    if (!hash) return res();
    try {
      const r = indexedDB.open('kokrsnek2Nav', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('pending');
      r.onsuccess = () => { try { const tx = r.result.transaction('pending', 'readwrite'); tx.objectStore('pending').put({ hash, at: Date.now() }, 'latest'); tx.oncomplete = res; tx.onerror = res; } catch (x) { res(); } };
      r.onerror = res;
    } catch (x) { res(); }
  });
  e.waitUntil(save.then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).then((list) => {
    const url = './' + hash;
    for (const c of list) {
      if ('focus' in c) { c.postMessage({ nav: hash }); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
