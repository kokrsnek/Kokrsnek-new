// Vstupní bod: přihlášení → členství → obrazovky podle adresy za #.
import { initAuth, onSession, session, isApproved } from './auth.js';
import { stopEvents } from './store.js';
import { spinner, installSheetGestures } from './ui.js';
import * as login from './login.js';
let avatarsOn = false;
import { showIntro } from './intro.js';
import * as akce from './akce.js';
import * as kalendar from './kalendar.js';
import * as detail from './detail.js';
import * as editor from './editor.js';
import * as parta from './parta.js';
import * as chat from './chat.js';
import * as kde from './kde.js';
import { renderPoll } from './polls.js';
import { installPlus } from './plus.js';
import { startPresence } from './presence.js';
import { startWeatherEffect } from './weather.js';
import { watchAvatars } from './store.js';
import { setAvatarImages } from './ui.js';
import { refreshPush, consumePendingNav } from './push.js';
import { checkCelebrations } from './celebrate.js';
import { myName } from './auth.js';
import { dmThreadId, PARTY_THREAD } from './chat.js';
let pushChecked = false;

const root = document.getElementById('app');
let cleanup = null;
let lastKey = '';

const ROUTES = [
  [/^\/akce\/?$/, () => akce.render(root, { tab: 'nadchazejici' })],
  [/^\/akce\/probehle$/, () => { location.replace('#/akce'); }],
  [/^\/kalendar(?:\/(\d{4})-(\d{1,2}))?$/, (m) => kalendar.render(root, { year: m[1] ? +m[1] : null, month: m[2] ? +m[2] - 1 : null })],
  [/^\/akce\/([^/]+)$/, (m) => detail.render(root, { id: decodeURIComponent(m[1]) })],
  [/^\/nova$/, () => editor.render(root, { id: null })],
  [/^\/upravit\/([^/]+)$/, (m) => editor.render(root, { id: decodeURIComponent(m[1]) })],
  [/^\/parta$/, () => parta.render(root, {})],
  [/^\/kde$/, () => kde.render(root, { tab: 'feed' })],
  [/^\/kde\/mapa$/, () => kde.render(root, { tab: 'mapa' })],
  [/^\/kde\/mista$/, () => kde.render(root, { tab: 'mista' })],
  [/^\/kde\/novy$/, () => kde.render(root, { tab: 'feed', openNew: true })],
  [/^\/chat$/, () => chat.renderList(root)],
  [/^\/chat\/([^/]+)$/, (m) => chat.renderThread(root, { id: decodeURIComponent(m[1]) })],
  // Cíle z notifikací (chatWith = jméno nebo celá parta)
  [/^\/s\/chat\/([^/]+)$/, (m) => { const n = decodeURIComponent(m[1]); location.replace('#/chat/' + encodeURIComponent(n === PARTY_THREAD ? PARTY_THREAD : dmThreadId(myName(), n))); }],
  [/^\/s\/anketa\/([^/]+)$/, (m) => { location.replace('#/anketa/' + m[1]); }],
  [/^\/anketa\/([^/]+)$/, (m) => renderPoll(root, { id: decodeURIComponent(m[1]) })]
];

function mount(key, fn) {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  lastKey = key;
  root.innerHTML = '';
  cleanup = fn() || null;
}

function route(force = false) {
  // Stav přihlášení má přednost před adresou.
  if (!session.ready) return mount('wait', () => { root.innerHTML = spinner(); });
  if (!session.user) { stopEvents(); return force || lastKey !== 'login' ? mount('login', () => login.render(root)) : null; }
  if (!session.memberLoaded) return mount('wait', () => { root.innerHTML = spinner(); });
  if (!session.member) return lastKey !== 'who' ? mount('who', () => login.renderWho(root)) : null;
  if (!isApproved()) return lastKey !== 'pending' ? mount('pending', () => login.renderPending(root)) : null;
  startPresence();
  startWeatherEffect();
  if (!avatarsOn) { avatarsOn = true; watchAvatars(setAvatarImages); }
  if (!pushChecked) {
    pushChecked = true;
    checkCelebrations();
    refreshPush();
    consumePendingNav((h) => { if (location.hash !== h) location.hash = h; });
  }

  const path = (location.hash || '').replace(/^#/, '') || '/akce';
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) {
      if (!force && lastKey === 'r:' + path) return;
      window.scrollTo(0, 0);
      return mount('r:' + path, () => fn(m));
    }
  }
  location.replace('#/akce');
}

window.addEventListener('hashchange', () => route(true));

// Ukazatel offline: aplikace jede dál z uložených dat (Firestore mezipaměť).
function offlineBar() {
  let el = document.querySelector('.offbar');
  if (navigator.onLine) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'offbar'; el.textContent = 'Jsi offline — ukazuju uložená data'; document.body.appendChild(el); }
}
window.addEventListener('online', offlineBar);
window.addEventListener('offline', offlineBar);
offlineBar();
onSession(() => route(false));
installPlus();
installSheetGestures();
showIntro();
initAuth();
route(true);

if ('serviceWorker' in navigator) {
  // Klepnutí na notifikaci, když je aplikace otevřená.
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.nav) location.hash = e.data.nav; });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
