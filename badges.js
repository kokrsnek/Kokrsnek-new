// Odznaky: počty nepřečtených v dolní liště a číslo na ikoně aplikace na ploše.
//  • Chat  – počet nepřečtených zpráv (podle chats/{id}.lastSeen, ztlumená vlákna se nepočítají)
//  • Kde jsi? – tečka, když od poslední návštěvy přibyl check-in od někoho jiného
//  • Akce  – tečka, když přibyla akce nebo se změnila akce, na kterou jdeš
//  • Fotky – nová alba (počítá fotky.js a předá sem přes setFotky)
// Na ikoně na ploše je součet (tečka = 1). Service worker číslo při notifikaci zvýší o jedna,
// po otevření aplikace se zase srovná podle skutečného stavu.
import { db, collection, query, where, orderBy, limit, onSnapshot } from './firebase.js';
import { myName } from './auth.js';
import { PARTY_NAMES } from './config.js';
import { toDate } from './util.js';
import { watchEvents, events, cachedAttendance, isPast } from './store.js';
import { PARTY_THREAD, dmThreadId, threadPath } from './chat.js';

const KEY = 'kokrsnek2Seen';
const norm = (s) => String(s || '').normalize('NFC').trim();
const iso = (x) => { const d = toDate(x); return d ? d.toISOString() : ''; };
let seen = {};
try { seen = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { seen = {}; }
if (!seen.since) seen.since = new Date().toISOString();   // první spuštění: nic staršího není „nové“
const saveSeen = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) { /* nic */ } };
saveSeen();

const st = { chat: 0, kde: false, akce: false, fotky: 0 };
let started = false, kdeList = [], me = '';
const unread = new Map(), subs = new Map();
let metas = {};

const here = () => location.hash || '#/akce';
const onKde = () => /^#\/kde(\/mapa)?$/.test(here());
const onAkce = () => here() === '#/akce' || here() === '#/' || here() === '#';
const openThread = () => { const m = here().match(/^#\/chat\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

export function setFotky(n) { st.fotky = n; paint(); }

function mark(k) { seen[k] = new Date().toISOString(); saveSeen(); }

function computeKde() {
  if (onKde() && !document.hidden) mark('kde');
  const since = seen.kde && seen.kde > seen.since ? seen.kde : seen.since;
  st.kde = kdeList.some((c) => norm(c.user) !== norm(me) && iso(c.at) > since);
}
function computeAkce() {
  if (onAkce() && !document.hidden) mark('akce');
  const since = seen.akce && seen.akce > seen.since ? seen.akce : seen.since;
  st.akce = events.list.some((ev) => {
    if (isPast(ev)) return false;
    if (ev.createdAt && iso(ev.createdAt) > since && norm(ev.createdBy) !== norm(me)) return true;
    if (ev.updatedAt && iso(ev.updatedAt) > since && norm(ev.updatedBy) !== norm(me)) {
      const a = cachedAttendance(ev.id);
      return !!(a && (a.going || []).some((n) => norm(n) === norm(me)));
    }
    return false;
  });
}
function computeChat() {
  const open = openThread();
  let n = 0;
  unread.forEach((v, id) => {
    if (id === open) return;
    if (((metas[id] || {}).muted || {})[me]) return;
    n += v;
  });
  st.chat = n;
}

function paint() {
  const el = document.documentElement;
  const set = (k, on, txt) => {
    if (on) { el.dataset[k] = '1'; if (txt != null) el.style.setProperty(`--${k}-n`, `"${txt}"`); }
    else { delete el.dataset[k]; el.style.removeProperty(`--${k}-n`); }
  };
  set('bchat', st.chat > 0, st.chat > 99 ? '99+' : st.chat);
  set('bkde', st.kde);
  set('bakce', st.akce);
  const total = st.chat + st.fotky + (st.kde ? 1 : 0) + (st.akce ? 1 : 0);
  try {
    if (total && navigator.setAppBadge) navigator.setAppBadge(total).catch(() => {});
    else if (!total && navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  } catch (e) { /* prohlížeč odznaky neumí */ }
  saveBadgeForSw(total);
}
// Počet pro service worker (ten při notifikaci přičte jedničku).
function saveBadgeForSw(n) {
  try {
    const r = indexedDB.open('kokrsnek2Badge', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('b');
    r.onsuccess = () => { try { r.result.transaction('b', 'readwrite').objectStore('b').put(n, 'n'); } catch (e) { /* nic */ } };
  } catch (e) { /* nic */ }
}

function recompute() { computeKde(); computeAkce(); computeChat(); paint(); }

// Vlákno chatu: posloucháme jen zprávy novější než „naposledy viděno“ (nebo smazání chatu).
function subThread(id) {
  const m = metas[id] || {};
  const from = [iso((m.lastSeen || {})[me]), iso((m.hiddenBy || {})[me]), seen.since].filter(Boolean).sort().pop();
  const cur = subs.get(id);
  if (cur && cur.from === from) return;
  if (cur) cur.unsub();
  const unsub = onSnapshot(query(collection(db, ...threadPath(id)), where('at', '>', from), limit(100)), (s) => {
    unread.set(id, s.docs.filter((d) => norm(d.data().from) !== norm(me)).length);
    computeChat(); paint();
  }, () => {});
  subs.set(id, { from, unsub });
}

export function startBadges() {
  if (started) return;
  started = true;
  me = myName();
  const threads = [PARTY_THREAD, ...PARTY_NAMES.filter((n) => norm(n) !== norm(me)).map((n) => dmThreadId(me, n))];
  onSnapshot(collection(db, 'chats'), (s) => {
    metas = {}; s.docs.forEach((d) => { metas[d.id] = d.data(); });
    threads.forEach(subThread);
    computeChat(); paint();
  }, () => { threads.forEach(subThread); });
  onSnapshot(query(collection(db, 'placeCheckins'), orderBy('at', 'desc'), limit(10)), (s) => {
    kdeList = s.docs.map((d) => d.data()); computeKde(); paint();
  }, () => {});
  watchEvents(() => { computeAkce(); paint(); });
  window.addEventListener('hashchange', () => setTimeout(recompute, 50));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recompute(); });
  // Účast se načítá postupně (na obrazovce Akce) — občas přepočítat.
  setInterval(() => { if (!document.hidden) recompute(); }, 30000);
  recompute();
}
