// Fotky: fotoalba z akcí party (odkaz na Google Fotky u akce).
// Zdroj jako ve staré aplikaci: odkaz u akce (v2_akce.photoAlbum/photoAlbumApp)
// a starší záznamy v kolekci photoAlbums/{id akce}.
// Zobrazení: galerie dlaždic, filtr podle roku a „Podle akce“ (stejné akce
// napříč roky — číslovka na začátku názvu se ignoruje).
import { db, collection, getDocs } from './firebase.js';
import { esc, icon } from './util.js';
import { tabbar, spinner } from './ui.js';
import { watchEvents, events, isPast, loadCover, cachedCover } from './store.js';
import { coverArt } from './coverart.js';

const SEEN = 'kokrsnek2AlbumsSeen';
const PRIORITY = ['Rolf', 'Velkopáteční pochod', 'Pálení čarodějnic', 'Výroční oheň', 'Zakončení léta', 'Mikuláš u Hastrmana', 'Vánoční pochod', 'Silvestrovský výšlap'];

export const groupTitle = (t) => { const s = String(t || '').replace(/^\d+\.\s*/, '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const fmt = (d) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;

// ---------- seznam alb (sdílený, načte se jednou) ----------
let oldAlbums = null; // Map id → url z kolekce photoAlbums
let oldLoading = null;
function loadOld() {
  if (oldAlbums) return Promise.resolve(oldAlbums);
  if (!oldLoading) {
    oldLoading = getDocs(collection(db, 'photoAlbums')).then((s) => {
      oldAlbums = new Map();
      s.docs.forEach((d) => { const u = (d.data().photoAlbum || '').trim(); if (u) oldAlbums.set(d.id, u); });
      return oldAlbums;
    }).catch(() => (oldAlbums = new Map()));
  }
  return oldLoading;
}

export function albumList() {
  const now = new Date();
  return events.list
    .map((ev) => ({ ev, url: ev.photoAlbum || (oldAlbums && oldAlbums.get(ev.id)) || '' }))
    .filter((a) => a.url && !a.ev.isTest && (isPast(a.ev, now) || a.ev.start <= now))
    .sort((a, b) => b.ev.start - a.ev.start);
}

// ---------- „NOVÉ“: album, které jsi ještě neotevřel ----------
function seenSet() {
  try { const v = JSON.parse(localStorage.getItem(SEEN) || 'null'); return v ? new Set(v) : null; } catch (e) { return null; }
}
function saveSeen(set) { try { localStorage.setItem(SEEN, JSON.stringify([...set])); } catch (e) { /* nic */ } }
function newIds(list) {
  let seen = seenSet();
  if (!seen) { seen = new Set(list.map((a) => a.ev.id)); saveSeen(seen); } // první spuštění: nic není nové
  return new Set(list.filter((a) => !seen.has(a.ev.id)).map((a) => a.ev.id));
}
function markSeen(id) { const s = seenSet() || new Set(); s.add(id); saveSeen(s); refreshBadge(); }

// Počet nových alb na záložce Fotky (odznak).
function refreshBadge() {
  if (!events.loaded || !oldAlbums) return;
  const n = newIds(albumList()).size;
  const el = document.documentElement;
  if (n) { el.dataset.newalbums = '1'; el.style.setProperty('--newalbums-n', `"${n}"`); }
  else { delete el.dataset.newalbums; el.style.removeProperty('--newalbums-n'); }
}
export function watchNewAlbums() {
  loadOld().then(refreshBadge);
  watchEvents(() => refreshBadge());
}

function openAlbum(a) {
  markSeen(a.ev.id);
  const l = document.createElement('a');
  l.href = a.url; l.target = '_blank'; l.rel = 'noopener';
  document.body.appendChild(l); l.click(); l.remove();
}

// ---------- obrazovka ----------
export function render(root, { group = null } = {}) {
  let filter = 'all'; // 'all' | rok | 'akce'
  root.innerHTML = `<div class="screen fotky">
    <div class="top">${group ? `<a class="ibtn" href="#/fotky" aria-label="Zpět">${icon('back')}</a>` : ''}<div style="flex:1;min-width:0"><div class="h1">${group ? esc(group) : 'Fotky'}</div><div class="sub" data-sub></div></div></div>
    <div class="scroll" data-body>${spinner()}</div>
    ${tabbar('fotky')}
  </div>`;
  const body = root.querySelector('[data-body]');
  const sub = root.querySelector('[data-sub]');
  let list = [];

  const art = (a) => {
    const img = cachedCover(a.ev.id);
    return `<div class="ftart" data-art="${esc(a.ev.id)}">${coverArt(a.ev)}${img ? `<img src="${img}" alt="">` : ''}</div>`;
  };
  const tile = (a, nw, big = false) => `<button class="fttile${big ? ' big' : ''}" data-open="${esc(a.ev.id)}">
      <div class="ftpic">${art(a)}${nw.has(a.ev.id) ? '<span class="ftnew">NOVÉ</span>' : ''}
        ${big ? `<div class="ftover"><b>${esc(a.ev.title)}</b><small>${fmt(a.ev.start)}</small></div>` : ''}</div>
      ${big ? '' : `<div class="ftt">${esc(a.ev.title)}</div><div class="ftd">${fmt(a.ev.start)}</div>`}
    </button>`;

  const draw = () => {
    list = albumList();
    if (group) list = list.filter((a) => groupTitle(a.ev.title) === group);
    if (!events.loaded || !oldAlbums) { body.innerHTML = spinner(); return; }
    const nw = newIds(albumList());
    refreshBadge();
    if (!list.length) { sub.textContent = ''; body.innerHTML = '<div class="empty">Zatím žádná fotoalba.</div>'; return; }
    const n = list.length;
    sub.textContent = group ? `${n}× v historii` : `${n} ${n === 1 ? 'album' : n >= 2 && n <= 4 ? 'alba' : 'alb'} z akcí party`;
    const years = [...new Set(list.map((a) => a.ev.start.getFullYear()))];
    let html = '';
    if (!group) {
      html += `<div class="ftchips">${[['all', 'Vše'], ...years.map((y) => [String(y), String(y)]), ['akce', 'Podle akce']]
        .map(([k, l]) => `<button class="chip${filter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>`;
    }
    if (filter === 'akce' && !group) {
      const by = new Map();
      list.forEach((a) => { const k = groupTitle(a.ev.title); if (!by.has(k)) by.set(k, []); by.get(k).push(a); });
      const keys = [...by.keys()].sort((a, b) => {
        const ia = PRIORITY.indexOf(a), ib = PRIORITY.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return by.get(b)[0].ev.start - by.get(a)[0].ev.start;
      });
      html += `<div class="ftgrid">${keys.map((k) => {
        const g = by.get(k), a = g[0], hasNew = g.some((x) => nw.has(x.ev.id));
        return `<button class="fttile${g.length > 1 ? ' stack' : ''}" ${g.length > 1 ? `data-group="${esc(k)}"` : `data-open="${esc(a.ev.id)}"`}>
          <div class="ftpic">${art(a)}${hasNew ? '<span class="ftnew">NOVÉ</span>' : ''}${g.length > 1 ? `<span class="ftcnt">${g.length}×</span>` : ''}</div>
          <div class="ftt">${esc(k)}</div><div class="ftd">${g.length > 1 ? `${g.length}× · naposledy ${a.ev.start.getFullYear()}` : fmt(a.ev.start)}</div></button>`;
      }).join('')}</div>`;
    } else {
      const shown = filter === 'all' || group ? list : list.filter((a) => String(a.ev.start.getFullYear()) === filter);
      const [first, ...rest] = shown;
      html += (first ? tile(first, nw, true) : '') + `<div class="ftgrid">${rest.map((a) => tile(a, nw)).join('')}</div>`;
    }
    body.innerHTML = html;
    // Vlastní fotky z hlavičky akce se donačtou postupně.
    body.querySelectorAll('[data-art]').forEach((el) => {
      const id = el.dataset.art;
      if (cachedCover(id) !== undefined) return;
      loadCover(id).then((img) => { if (img && el.isConnected && !el.querySelector('img')) el.insertAdjacentHTML('beforeend', `<img src="${img}" alt="">`); });
    });
  };

  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; draw(); body.scrollTop = 0; return; }
    const g = e.target.closest('[data-group]');
    if (g) { location.hash = '#/fotky/akce/' + encodeURIComponent(g.dataset.group); return; }
    const o = e.target.closest('[data-open]');
    if (o) { const a = list.find((x) => x.ev.id === o.dataset.open); if (a) { openAlbum(a); draw(); } }
  });

  const unsub = watchEvents(() => draw());
  loadOld().then(draw);
  draw();
  return () => unsub();
}
