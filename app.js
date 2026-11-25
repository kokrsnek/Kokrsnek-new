// Vstupní bod: přihlášení → členství → obrazovky podle adresy za #.
import { initAuth, onSession, session, isApproved } from './auth.js';
import { stopEvents } from './store.js';
import { spinner, installSheetGestures } from './ui.js';
import * as login from './login.js';
let avatarsOn = false;
import { showIntro } from './intro.js';
import { applyTheme, currentTheme } from './theme.js';
// Uložený vzhled hned po startu (pojistka k úvodnímu skriptu v index.html).
applyTheme(currentTheme().id, false);
import * as akce from './akce.js';
import * as kalendar from './kalendar.js';
import * as detail from './detail.js';
import * as editor from './editor.js';
import * as parta from './parta.js';
import * as chat from './chat.js';
import * as kde from './kde.js';
import { renderPoll } from './polls.js';
import { renderHub, renderGame } from './games.js';
import { renderSudoku } from './sudoku.js';
import * as profil from './profil.js';
import * as fotky from './fotky.js';
import { askPushOnInstall } from './pushui.js';
import { installPlus } from './plus.js';
import { startPresence } from './presence.js';
import { startWeatherEffect } from './weather.js';
import { watchAvatars } from './store.js';
import { setAvatarImages, runFocus } from './ui.js';
import { refreshPush, consumePendingNav } from './push.js';
import { checkCelebrations } from './celebrate.js';
import { myName, isAdmin } from './auth.js';
import { db, collection, query, where, onSnapshot } from './firebase.js';
import { dmThreadId, PARTY_THREAD } from './chat.js';
import { NAME_LABELS } from './config.js';
import { navOut, navIn, fixIosViewport } from './nav.js';
let pushChecked = false;

const root = document.getElementById('app');

// Jména v zobrazení (např. Pecak → Pecák). Uložená jména se nemění — kvůli
// návaznosti na starou aplikaci; přepisuje se jen zobrazený text, ne políčka pro psaní.
const LABEL_RULES = Object.entries(NAME_LABELS).map(([k, v]) => [k, new RegExp(`(^|[^\\p{L}])${k}(?![\\p{L}])`, 'gu'), `$1${v}`]);
const LABEL_SKIP = /^(TEXTAREA|INPUT|SCRIPT|STYLE)$/;
function relabelText(t) {
  const p = t.parentNode;
  if (!p || LABEL_SKIP.test(p.nodeName) || p.isContentEditable) return;
  let v = t.nodeValue;
  for (const [k, re, rep] of LABEL_RULES) if (v.includes(k)) v = v.replace(re, rep);
  if (v !== t.nodeValue) t.nodeValue = v;
}
function relabelTree(n) {
  if (n.nodeType === 3) return relabelText(n);
  if (n.nodeType !== 1 && n.nodeType !== 11) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) relabelText(t);
}
// Klepnutí na jméno (data-profile) otevře profil s historií.
document.addEventListener('click', (e) => {
  const p = e.target.closest('[data-profile]');
  const n = p && p.dataset.profile;
  if (!n || n === '?') return;
  e.preventDefault(); e.stopPropagation();
  location.hash = '#/profil/' + encodeURIComponent(n);
}, true);

if (LABEL_RULES.length) {
  relabelTree(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') relabelText(m.target);
      else m.addedNodes.forEach(relabelTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
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
  [/^\/anketa\/([^/]+)$/, (m) => renderPoll(root, { id: decodeURIComponent(m[1]) })],
  [/^\/fotky$/, () => fotky.render(root, {})],
  [/^\/fotky\/akce\/([^/]+)$/, (m) => fotky.render(root, { group: decodeURIComponent(m[1]) })],
  [/^\/hry$/, () => renderHub(root, { dmThreadId, threadPath: chat.threadPath })],
  [/^\/hry\/s\/([^/]+)$/, (m) => renderHub(root, { with: decodeURIComponent(m[1]), dmThreadId, threadPath: chat.threadPath })],
  [/^\/profil\/([^/]+)$/, (m) => profil.render(root, { name: decodeURIComponent(m[1]) })],
  [/^\/sudoku\/sam$/, () => renderSudoku(root, { mode: 'solo' })],
  [/^\/sudoku\/den$/, () => renderSudoku(root, { mode: 'daily' })],
  [/^\/sudoku\/([^/]+)$/, (m) => renderSudoku(root, { mode: 'race', id: decodeURIComponent(m[1]) })],
  [/^\/hra\/ai\/(pk|ld|px)$/, (m) => renderGame(root, { aiType: m[1], dmThreadId })],
  [/^\/hra\/([^/]+)$/, (m) => renderGame(root, { id: decodeURIComponent(m[1]), dmThreadId })]
];

function mount(key, fn, path = null) {
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  lastKey = key;
  const nav = navOut(root, path);
  root.innerHTML = '';
  if (path) window.scrollTo(0, 0);
  cleanup = fn() || null;
  navIn(root, nav);
  if (path) setTimeout(fixIosViewport, 420);
  runFocus();
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
    watchPendingMembers();
    fotky.watchNewAlbums();
    askPushOnInstall();
    consumePendingNav((h) => { if (location.hash !== h) location.hash = h; });
  }

  const path = (location.hash || '').replace(/^#/, '') || '/akce';
  for (const [re, fn] of ROUTES) {
    const m = path.match(re);
    if (m) {
      if (!force && lastKey === 'r:' + path) return;
      return mount('r:' + path, () => fn(m), path);
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

// Správce: odznak s počtem čekajících žádostí na záložce Parta.
function watchPendingMembers() {
  if (!isAdmin()) return;
  onSnapshot(query(collection(db, 'v2_members'), where('status', '==', 'pending')), (s) => {
    const n = s.size;
    const el = document.documentElement;
    if (n) { el.dataset.pending = '1'; el.style.setProperty('--pending-n', `"${n}"`); }
    else { delete el.dataset.pending; el.style.removeProperty('--pending-n'); }
  }, () => {});
}
