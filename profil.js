// Profil člena party: všechny jeho stopy v aplikaci na jedné časové ose,
// nejnovější nahoře, starší se načítají při posouvání dolů.
// Zdroje (sdílené se starou aplikací):
//   events/{id}/attendees|declines|likes|comments|checkins, bringLists/{id}/items,
//   placeCheckins (+ jejich comments), chats/parta-vsichni/messages, polls,
//   v2_akce (založené akce, přidaná alba), v2_games, v2_sudoku/{den}/times,
//   v2_attendLog (zrušené účasti – zapisuje se od verze 1.64).
// Podkolekce akcí se čtou jednou pro všechny profily (collectionGroup) a drží se v paměti.
import { db, collection, collectionGroup, query, where, getDocs } from './firebase.js';
import { esc, icon, toDate, looseName, MONTHS_NOM } from './util.js';
import { avatar, spinner, goFocus } from './ui.js';
import { myName } from './auth.js';
import { watchEvents, events } from './store.js';
import { PARTY_PEOPLE } from './people.js';
import { GAME_NAMES } from './games.js';
import { fmtMs, todayKey } from './sudoku.js';

const PARTY_THREAD = 'parta-vsichni';
const PAGE = 50;
const same = (a, b) => looseName(a) === looseName(b);
const FILTERS = [['all', 'Vše'], ['akce', 'Akce'], ['kde', 'Kde jsi?'], ['kom', 'Komentáře'], ['chat', 'Chat party'], ['foto', 'Fotky'], ['hry', 'Hry']];

// ---------- společná data (jednou za relaci, max. 5 minut stará) ----------
let shared = null, sharedAt = 0;
function loadShared() {
  if (shared && Date.now() - sharedAt < 300000) return shared;
  sharedAt = Date.now();
  const cg = (name) => getDocs(collectionGroup(db, name)).then((s) => s.docs.map((d) => ({ id: d.id, path: d.ref.path.split('/'), ...d.data() }))).catch((e) => { console.error(name, e); return []; });
  shared = Promise.all(['attendees', 'declines', 'likes', 'comments', 'checkins', 'items', 'times'].map(cg))
    .then(([attendees, declines, likes, comments, checkins, items, times]) => ({ attendees, declines, likes, comments, checkins, items, times }));
  shared.catch(() => { shared = null; });
  return shared;
}
const evLoaded = () => new Promise((res) => { const u = watchEvents((e) => { if (e.loaded) { setTimeout(() => u(), 0); res(); } }); });

async function collect(name) {
  const [sh, place, chat, games, polls, log] = await Promise.all([
    loadShared(),
    getDocs(query(collection(db, 'placeCheckins'), where('user', '==', name))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
    getDocs(query(collection(db, 'chats', PARTY_THREAD, 'messages'), where('from', '==', name))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
    getDocs(query(collection(db, 'v2_games'), where('players', 'array-contains', name))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
    getDocs(collection(db, 'polls')).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
    getDocs(query(collection(db, 'v2_attendLog'), where('user', '==', name))).then((s) => s.docs.map((d) => d.data())).catch(() => []),
    evLoaded()
  ]);
  const evById = new Map(events.list.map((e) => [e.id, e]));
  const evOf = (path, d) => {
    const id = path[1], ev = evById.get(id);
    return { id, title: (ev && ev.title) || d.eventTitle || 'akce', start: ev ? ev.start : toDate(d.eventStart), link: ev ? '#/akce/' + encodeURIComponent(id) : '' };
  };
  const out = [];
  const add = (when, kinds, ic, html, extra = {}) => { const d = toDate(when); if (d && d.getTime() > 0) out.push({ when: d, kinds, ic, html, ...extra }); };
  const evB = (e) => `<b>${esc(e.title)}</b>`;
  // Kam vede klepnutí: [adresa, selektor místa, co rozkliknout].
  const toEv = (e, sel = '') => (e.link ? { go: [e.link, sel] } : {});
  const sq = (v) => String(v).replace(/["\\]/g, '\\$&');
  const isEv = (p) => p[0] === 'events' || p[0] === 'v2_akce';
  const who = (d) => d.user || d.name || d.id;

  sh.attendees.filter((d) => isEv(d.path) && same(who(d), name)).forEach((d) => { const e = evOf(d.path, d); add(d.at || e.start, ['akce'], '✅', `Jde na ${evB(e)}`, { att: e.id, ...toEv(e, '[data-attsec]') }); });
  sh.declines.filter((d) => isEv(d.path) && same(who(d), name)).forEach((d) => { const e = evOf(d.path, d); add(d.at || e.start, ['akce'], '🛋️', `Nejde na ${evB(e)}`, { off: true, ...toEv(e, '[data-attsec]') }); });
  log.forEach((d) => add(d.at, ['akce'], '↩️', `Zrušil(a) účast na <b>${esc(d.eventTitle || 'akce')}</b> · předtím šel/šla`, { off: true, ...(evById.has(d.eventId) ? { go: ['#/akce/' + encodeURIComponent(d.eventId), '[data-attsec]'] } : {}) }));
  sh.likes.filter((d) => isEv(d.path) && same(who(d), name)).forEach((d) => { const e = evOf(d.path, d); add(d.at, ['akce'], '❤️', `Lajk ${evB(e)}`, toEv(e, '[data-likes]')); });
  sh.checkins.filter((d) => isEv(d.path) && same(who(d), name)).forEach((d) => { const e = evOf(d.path, d); add(d.at, ['akce', 'kde'], '📍', `Na místě: ${evB(e)}${d.verified ? ' · ověřeno polohou' : ''}`, { ci: true, ...toEv(e, '[data-attsec]') }); });
  sh.comments.filter((d) => same(d.user, name)).forEach((d) => {
    const q = d.text ? `<q>${esc(String(d.text).slice(0, 140))}</q>` : '';
    if (isEv(d.path)) { const e = evOf(d.path, d); add(d.at, ['kom', 'akce'], '💬', `${d.parentId ? 'Odpověď' : 'Komentář'} u ${evB(e)}${q}`, { com: true, ...toEv(e, `[data-cid="${sq(d.id)}"]`) }); }
    else if (d.path[0] === 'placeCheckins' || d.path[0] === 'v2_checkins') add(d.at, ['kom', 'kde'], '💬', `Komentář u check-inu${q}`, { com: true, go: ['#/kde/c/' + encodeURIComponent(d.path[1])] });
  });
  sh.items.filter((d) => d.path[0] === 'bringLists' || d.path[0] === 'v2_akce').forEach((d) => {
    const e = evOf(d.path, d);
    if (same(d.takenBy, name)) add(d.at, ['akce'], '🎒', `Přinese <b>${esc(d.name || 'věc')}</b> · ${evB(e)}`, toEv(e, '[data-itemsec]'));
    else if (same(d.addedBy, name)) add(d.at, ['akce'], '📝', `Přidal(a) do „Co přinést“ <b>${esc(d.name || 'věc')}</b> · ${evB(e)}`, toEv(e, '[data-itemsec]'));
  });
  events.list.filter((e) => !e.isTest && e.source !== 'gcal' && same(e.createdBy, name)).forEach((e) => add(e.createdAt, ['akce'], '🗓️', `Založil(a) akci ${evB(e)}`, { go: ['#/akce/' + encodeURIComponent(e.id), ''] }));
  place.forEach((d) => {
    add(d.at, ['kde'].concat(d.photo ? ['foto'] : []), '📍', `Check-in <b>${esc(d.place || 'místo')}</b>${d.note ? `<q>${esc(d.note)}</q>` : ''}${d.photo ? `<img class="pfimg" src="${esc(d.photo)}" alt="" loading="lazy">` : ''}`, { ci: true, go: ['#/kde/c/' + encodeURIComponent(d.id)] });
  });
  // Zprávy v chatu party; více fotek poslaných najednou = jeden záznam.
  const batches = new Map();
  chat.forEach((m) => {
    if (m.image && m.batch) { const b = batches.get(m.batch) || { at: m.at, n: 0, img: m.image, id: m.id }; b.n++; batches.set(m.batch, b); return; }
    const toMsg = { go: ['#/chat/' + PARTY_THREAD, `[data-id="${sq(m.id)}"], [data-photo-id="${sq(m.id)}"]`] };
    if (m.image) return add(m.at, ['chat', 'foto'], '📷', `Fotka v <b>chatu party</b><img class="pfimg" src="${esc(m.image)}" alt="" loading="lazy">`, { msg: true, ...toMsg });
    if (m.audio) return add(m.at, ['chat'], '🎙️', 'Hlasovka v <b>chatu party</b>', { msg: true, ...toMsg });
    if (m.game) return;
    if (m.text) add(m.at, ['chat'], '💭', `Zpráva v <b>chatu party</b><q>${esc(String(m.text).slice(0, 160))}</q>`, { msg: true, ...toMsg });
  });
  batches.forEach((b) => add(b.at, ['chat', 'foto'], '📷', `${b.n} ${b.n < 5 ? 'fotky' : 'fotek'} v <b>chatu party</b><img class="pfimg" src="${esc(b.img)}" alt="" loading="lazy">`, { msg: true, go: ['#/chat/' + PARTY_THREAD, `[data-photo-id="${sq(b.id)}"]`] }));
  polls.forEach((p) => {
    const toPoll = { go: ['#/anketa/' + encodeURIComponent(p.id), ''] };
    if (same(p.createdBy, name)) add(p.createdAt, ['chat'], '📊', `Založil(a) anketu <b>${esc(p.question || '')}</b>`, toPoll);
    const v = Object.entries(p.votes || {}).find(([k]) => same(k, name));
    if (v && !same(p.createdBy, name)) { const opt = (p.options || [])[v[1]]; add(p.createdAt, ['chat'], '🗳️', `Hlasoval(a) v anketě <b>${esc(p.question || '')}</b>${opt != null ? `<q>${esc(typeof opt === 'string' ? opt : opt.text || '')}</q>` : ''}`, toPoll); }
  });
  events.list.filter((e) => same(e.albumBy, name)).forEach((e) => add(e.albumAt, ['foto', 'akce'], '🖼️', `Přidal(a) fotoalbum k ${evB(e)}`, { go: ['#/akce/' + encodeURIComponent(e.id), '[data-albumrow]'] }));
  games.forEach((g) => {
    const o = (g.players || []).find((p) => !same(p, name)) || '';
    const gn = (GAME_NAMES[g.type] || 'hra').toLowerCase();
    let res = '';
    if (g.finished) res = !g.winner ? ' · remíza' : same(g.winner, name) ? ' · výhra 🏆' : ' · prohra';
    add(g.createdAt, ['hry'], g.type === 'sd' ? '🔢' : '🎮', `${g.type === 'sd' ? 'Závod v sudoku' : 'Hra ' + gn} s <b>${esc(o)}</b>${res}`, { go: [(g.type === 'sd' ? '#/sudoku/' : '#/hra/') + encodeURIComponent(g.id), ''] });
  });
  const byDay = new Map();
  sh.times.filter((t) => t.path[0] === 'v2_sudoku').forEach((t) => { const l = byDay.get(t.path[1]) || []; l.push(t); byDay.set(t.path[1], l); });
  byDay.forEach((l) => {
    l.sort((a, b) => a.total - b.total);
    const i = l.findIndex((t) => same(t.name || t.id, name));
    if (i >= 0) add(l[i].at, ['hry'], '🔢', `Sudoku dne za <b>${fmtMs(l[i].total)}</b> · ${i + 1}. místo`, { go: [l[i].path[1] === todayKey() ? '#/sudoku/den' : '#/hry', ''] });
  });
  out.sort((a, b) => b.when - a.when);
  return out;
}

// ---------- obrazovka ----------
export function render(root, { name }) {
  const me = myName();
  let all = null, filter = 'all', shown = PAGE, alive = true;
  const person = PARTY_PEOPLE.find((p) => p.app && same(p.app, name));
  root.innerHTML = `<div class="screen profil">
    <div class="top"><button class="ibtn" data-back aria-label="Zpět">${icon('back')}</button><div style="flex:1"></div>
      ${!same(name, me) ? `<a class="ibtn" href="#/s/chat/${encodeURIComponent(name)}" aria-label="Napsat">${icon('chat')}</a>` : ''}</div>
    <div class="scroll" data-body>
      <div class="pfhead">${avatar(name, 76)}<div class="pfname">${esc(name)}</div><div class="sub" data-since>${person && person.day ? `narozeniny ${person.day}. ${person.month}.` : ''}</div></div>
      <div data-rest>${spinner()}</div>
    </div>
    <button class="pfup" data-up aria-label="Nahoru">↑ Nahoru</button></div>`;
  const rest = root.querySelector('[data-rest]'), up = root.querySelector('[data-up]');
  root.querySelector('[data-back]').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/akce'; };

  const list = () => (filter === 'all' ? all : all.filter((x) => x.kinds.includes(filter)));
  function draw() {
    if (!alive) return;
    const l = list(), part = l.slice(0, shown);
    const oldest = all.length ? all[all.length - 1].when : null;
    root.querySelector('[data-since]').textContent = [oldest ? `v aplikaci od ${oldest.getDate()}. ${oldest.getMonth() + 1}. ${oldest.getFullYear()}` : '', person && person.day ? `narozeniny ${person.day}. ${person.month}.` : ''].filter(Boolean).join(' · ');
    const akci = new Set(all.filter((x) => x.att).map((x) => x.att)).size;
    const stats = [[akci, 'akcí'], [all.filter((x) => x.ci).length, 'check-inů'], [all.filter((x) => x.com).length, 'komentářů'], [all.filter((x) => x.msg).length, 'zpráv']];
    let h = `<div class="pfstats">${stats.map(([n, t]) => `<div><b>${n}</b><small>${t}</small></div>`).join('')}</div>
      <div class="pffilt">${FILTERS.map(([k, t]) => `<button class="${k === filter ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>`;
    if (!l.length) h += '<div class="sub" style="text-align:center;padding:20px 0">Tady zatím nic není.</div>';
    let month = '';
    let open = false;
    const now = new Date();
    part.forEach((x, k) => {
      const m = `${MONTHS_NOM[x.when.getMonth()]} ${x.when.getFullYear()}`;
      if (m !== month) { if (open) h += '</div>'; month = m; h += `<div class="pfmo">${m.toUpperCase()}</div><div class="pftl">`; open = true; }
      const today = x.when.toDateString() === now.toDateString();
      const dt = today ? `dnes ${x.when.getHours()}:${String(x.when.getMinutes()).padStart(2, '0')}` : `${x.when.getDate()}. ${x.when.getMonth() + 1}.`;
      h += `<div class="pfit${x.off ? ' off' : ''}"${x.go ? ` data-go="${k}"` : ''}><span class="pfic">${x.ic}</span><div class="pftx">${x.html}</div><span class="pfdt">${dt}</span></div>`;
    });
    if (open) h += '</div>';
    if (part.length < l.length) h += '<div class="pfmore" data-more>↓ starší se načítají…</div>';
    else if (filter === 'all' && oldest) h += `<div class="pftl pfend"><div class="pfit"><span class="pfic">🐌</span><div class="pftx"><b>První stopa v aplikaci</b><q>tady to všechno začalo</q></div><span class="pfdt">${oldest.getDate()}. ${oldest.getMonth() + 1}. ${oldest.getFullYear()}</span></div></div>`;
    rest.innerHTML = h;
  }
  rest.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; shown = PAGE; draw(); return; }
    const g = e.target.closest('[data-go]');
    if (g) { const x = list()[+g.dataset.go]; if (x && x.go) goFocus(...x.go); }
  });
  const onScroll = () => {
    up.classList.toggle('on', window.scrollY > 700);
    if (!all) return;
    if (window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 700 && shown < list().length) { shown += PAGE; draw(); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  up.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  collect(name).then((l) => { all = l; draw(); }).catch((e) => { console.error(e); if (alive) rest.innerHTML = '<div class="empty">Historii se nepodařilo načíst.</div>'; });
  return () => { alive = false; window.removeEventListener('scroll', onScroll); };
}
