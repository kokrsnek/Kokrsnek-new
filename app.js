// Vstupní bod: přihlášení → členství → obrazovky podle adresy za #.
import { initAuth, onSession, session, isApproved } from './auth.js';
import { stopEvents } from './store.js';
import { spinner, installSheetGestures } from './ui.js';
import * as login from './login.js';
import * as akce from './akce.js';
import * as kalendar from './kalendar.js';
import * as detail from './detail.js';
import * as editor from './editor.js';
import * as parta from './parta.js';
import * as chat from './chat.js';
import * as kde from './kde.js';
import { installPlus } from './plus.js';

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
  [/^\/kde\/novy$/, () => kde.render(root, { tab: 'feed', openNew: true })],
  [/^\/chat$/, () => chat.renderList(root)],
  [/^\/chat\/([^/]+)$/, (m) => chat.renderThread(root, { id: decodeURIComponent(m[1]) })]
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
onSession(() => route(false));
installPlus();
installSheetGestures();
initAuth();
route(true);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
