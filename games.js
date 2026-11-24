// Hry v chatu: piškvorky (15×15, pět v řadě), lodě (10×10), pexeso (emoji party) a sudoku (sudoku.js).
// Online hry jsou ve v2_games/{id}: { type: 'pk'|'ld'|'px'|'sd', players: [vyzývatel, soupeř],
// thread, turn, finished, winner, … stav hry }. Hry proti počítači žijí jen v telefonu.
// Cloudová funkce onV2GameWritten posílá upozornění „Jsi na tahu“ / „Vyzývá tě…“.
import { db, collection, doc, query, where, onSnapshot, addDoc, updateDoc, getDoc, setDoc } from './firebase.js';
import { esc, icon } from './util.js';
import { avatar, toast, spinner, confirmDanger } from './ui.js';
import { myName } from './auth.js';
import { PARTY_NAMES } from './config.js';
import { CUSTOM } from './emoji-data.js';
import { LEVELS, newRaceState, newSolo, sdLoad, sdSave, fmtMs, filledCount, todayKey } from './sudoku.js';

export const GAME_NAMES = { pk: 'Piškvorky', ld: 'Lodě', px: 'Pexeso', sd: 'Sudoku' };
export const GAME_ICONS = { pk: '✕○', ld: '⚓', px: '🃏', sd: '🔢' };
const TAB_KEY = 'kokrsnek2GamesTab';
const N_PK = 15, N_LD = 10, FLEET = [5, 4, 3, 3, 2];
const PX_FACES = ['pivo', 'gril', 'taborak', 'kokrsnek', 'vodnik', 'kytara', 'chata', 'lod', 'stan', 'panak'];
const norm = (s) => String(s || '').normalize('NFC').trim();
const other = (g, me) => g.players.find((p) => norm(p) !== norm(me)) || '';
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const emoSvg = (id, s) => { const e = CUSTOM.find((x) => x.id === id); return e ? `<svg viewBox="0 0 64 64" width="${s}" height="${s}">${e.svg}</svg>` : ''; };

// ---------- pravidla ----------
function pkWin(board, i) {
  const n = N_PK, s = board[i], r = Math.floor(i / n), c = i % n;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [i];
    for (const k of [1, -1]) {
      let rr = r + dr * k, cc = c + dc * k;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === s) { line.push(rr * n + cc); rr += dr * k; cc += dc * k; }
    }
    if (line.length >= 5) return line;
  }
  return null;
}
// Náhodné rozmístění flotily (lodě se nesmí dotýkat ani rohem).
export function randomFleet() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const taken = new Set(), ships = [];
    let ok = true;
    for (const len of FLEET) {
      let placed = false;
      for (let t = 0; t < 300 && !placed; t++) {
        const hor = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (hor ? N_LD : N_LD - len + 1)), c = Math.floor(Math.random() * (hor ? N_LD - len + 1 : N_LD));
        const cells = Array.from({ length: len }, (_, k) => (hor ? r * N_LD + c + k : (r + k) * N_LD + c));
        const near = (x) => { const xr = Math.floor(x / N_LD), xc = x % N_LD; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = xr + a, cc = xc + b; if (rr >= 0 && rr < N_LD && cc >= 0 && cc < N_LD && taken.has(rr * N_LD + cc)) return true; } return false; };
        if (cells.some(near)) continue;
        cells.forEach((x) => taken.add(x)); ships.push(cells); placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return ships;
  }
  return [];
}
const ldSunk = (ship, shots) => ship.every((x) => shots.includes(x));
const ldAllSunk = (fleet, shots) => fleet.every((s) => ldSunk(s, shots));

// ---------- počítač ----------
function pkAi(board, me, ai) {
  const n = N_PK;
  if (!board.includes('x') && !board.includes('o')) return Math.floor(n * n / 2);
  let best = -1, bestScore = -1;
  const score = (i, s) => {
    const r = Math.floor(i / n), c = i % n; let tot = 0;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let cnt = 1, open = 0;
      for (const k of [1, -1]) {
        let rr = r + dr * k, cc = c + dc * k;
        while (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === s) { cnt++; rr += dr * k; cc += dc * k; }
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] === '.') open++;
      }
      tot += cnt >= 5 ? 100000 : Math.pow(10, cnt - 1) * (open || 0.1);
    }
    return tot;
  };
  for (let i = 0; i < n * n; i++) {
    if (board[i] !== '.') continue;
    const r = Math.floor(i / n), c = i % n;
    let near = false;
    for (let a = -2; a <= 2 && !near; a++) for (let b = -2; b <= 2; b++) { const rr = r + a, cc = c + b; if (rr >= 0 && rr < n && cc >= 0 && cc < n && board[rr * n + cc] !== '.') { near = true; break; } }
    if (!near) continue;
    const sc = score(i, ai) * 1.1 + score(i, me) + Math.random();
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  return best;
}
function ldAi(shots, fleet) {
  // Lov kolem zásahů nepotopené lodi, jinak náhodně (šachovnicově).
  const hitsOpen = shots.filter((x) => fleet.some((s) => s.includes(x) && !ldSunk(s, shots)));
  const free = (x) => x >= 0 && x < 100 && !shots.includes(x);
  for (const h of hitsOpen) {
    const r = Math.floor(h / 10), c = h % 10;
    const cand = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < 10 && b >= 0 && b < 10).map(([a, b]) => a * 10 + b).filter(free);
    if (cand.length) return cand[Math.floor(Math.random() * cand.length)];
  }
  const all = []; for (let i = 0; i < 100; i++) if (free(i) && (Math.floor(i / 10) + i) % 2 === 0) all.push(i);
  const pool = all.length ? all : Array.from({ length: 100 }, (_, i) => i).filter(free);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- uložení her proti počítači ----------
const AI_KEY = 'kokrsnek2AiGames';
const aiLoad = () => { try { return JSON.parse(localStorage.getItem(AI_KEY) || '{}'); } catch (e) { return {}; } };
const aiSave = (all) => { try { localStorage.setItem(AI_KEY, JSON.stringify(all)); } catch (e) { /* nic */ } };
const AI = 'Počítač';

function newState(type, players, extra = {}) {
  const [a, b] = players;
  if (type === 'sd') return { type, players, ...newRaceState(extra.level || 'm'), ...extra };
  if (type === 'pk') return { type, players, turn: a, board: '.'.repeat(N_PK * N_PK), moves: 0, last: -1, ...extra };
  if (type === 'ld') return { type, players, turn: a, phase: 'place', fleets: {}, shots: { [a]: [], [b]: [] }, moves: 0, ...extra };
  const deck = shuffle([...PX_FACES, ...PX_FACES]);
  return { type, players, turn: a, deck, found: {}, open: [], scores: { [a]: 0, [b]: 0 }, moves: 0, ...extra };
}

// Výzva kamarádovi: hra + karta do soukromé konverzace.
export async function challenge(type, opponent, threadId, threadPathFn, opts = {}) {
  const me = myName();
  const g = newState(type, [me, opponent], { ...opts, thread: threadId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), finished: false, winner: null, by: me });
  const ref = await addDoc(collection(db, 'v2_games'), g);
  const verb = { pk: 'na piškvorky', ld: 'na lodě', px: 'na pexeso', sd: 'na závod v sudoku' }[type];
  await addDoc(collection(db, ...threadPathFn(threadId)), { from: me, text: `🎮 Vyzývám tě ${verb}`, game: { id: ref.id, type }, at: new Date().toISOString(), via: 'v2' });
  return ref.id;
}

// ---------- přehled her ----------
export function renderHub(root, { with: withName = '', tab = null, dmThreadId, threadPath }) {
  const me = myName();
  try { tab = tab || sessionStorage.getItem(TAB_KEY) || 'pk'; } catch (e) { tab = tab || 'pk'; }
  if (!GAME_NAMES[tab]) tab = 'pk';
  let sdLevel = sdLoad().lastLevel || 'm';
  let games = [];
  const ai = aiLoad();
  root.innerHTML = `<div class="screen">
    <div class="top"><a class="ibtn" href="${withName ? '#/chat/' + encodeURIComponent(dmThreadId(me, withName)) : '#/chat'}" aria-label="Zpět">${icon('back')}</a>
      <div style="flex:1;min-width:0"><div class="h1">Hry</div><div class="sub" data-sub></div></div></div>
    <div class="scroll" data-body>${spinner()}</div></div>`;
  const body = root.querySelector('[data-body]');
  const draw = () => {
    const mine = games.filter((g) => g.players.some((p) => norm(p) === norm(me)));
    const onTurn = mine.filter((g) => !g.finished && (g.type === 'sd' ? !((g.st || {})[me] || {}).done : g.type === 'ld' && g.phase === 'place' ? !(g.fleets || {})[me] : norm(g.turn) === norm(me))).length;
    root.querySelector('[data-sub]').textContent = onTurn ? `jsi na tahu v ${onTurn} ${onTurn === 1 ? 'hře' : 'hrách'}` : 'piškvorky, lodě, pexeso, sudoku';
    if (tab === 'sd') return drawSd(mine);
    const list = mine.filter((g) => g.type === tab && !g.finished).sort((a, b) => (b.updatedAt || '') > (a.updatedAt || '') ? 1 : -1);
    const done = mine.filter((g) => g.type === tab && g.finished);
    const w = done.filter((g) => g.winner && norm(g.winner) === norm(me)).length, d = done.filter((g) => !g.winner).length, l = done.length - w - d;
    const aiG = ai[tab];
    const status = (g) => {
      if (g.type === 'ld' && g.phase === 'place') return (g.fleets || {})[me] ? 'čeká na soupeře' : 'rozmísti lodě';
      return norm(g.turn) === norm(me) ? 'jsi na tahu' : 'čeká';
    };
    body.innerHTML = `
      <div class="gtabs">${['pk', 'ld', 'px', 'sd'].map((k) => `<button class="${tab === k ? 'on' : ''}" data-gt="${k}"><i>${GAME_ICONS[k]}</i>${GAME_NAMES[k]}</button>`).join('')}</div>
      <div class="section-h">Rozehrané</div>
      ${list.map((g) => { const o = other(g, me), my = status(g) === 'jsi na tahu' || status(g) === 'rozmisti lodě';
        return `<a class="row" href="#/hra/${encodeURIComponent(g.id)}">${avatar(o, 36)}<div style="flex:1;min-width:0"><div class="t">${esc(o)}</div><div class="s">${g.moves ? (g.type === 'ld' ? 'výstřel ' : 'tah ') + g.moves + ' · ' : ''}${status(g)}</div></div><span class="pill ${my ? 'hot' : ''}">${my ? 'hraj!' : 'čeká'}</span></a>`; }).join('')}
      ${aiG && !aiG.finished ? `<a class="row" href="#/hra/ai/${tab}"><span class="av" style="width:36px;height:36px;background:var(--surface);font-size:18px">🖥</span><div style="flex:1"><div class="t">Počítač</div><div class="s">${aiG.moves ? 'tah ' + aiG.moves : 'nová hra'}</div></div><span class="pill hot">hraj!</span></a>` : ''}
      ${!list.length && !(aiG && !aiG.finished) ? '<div class="sub" style="padding:0 2px 8px">Žádná rozehraná hra.</div>' : ''}
      <div class="section-h">Nová hra</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn primary big block" data-ch>${GAME_ICONS[tab]} ${withName ? 'Vyzvat: ' + esc(withName) : 'Vyzvat kamaráda'}</button>
        <button class="btn big block" data-ai>🖥 Hrát proti počítači</button></div>
      <div class="section-h">Tvoje statistiky · ${GAME_NAMES[tab]}</div>
      <div class="gstats"><div><b>${w}</b><small>výher</small></div><div><b>${l}</b><small>proher</small></div><div><b>${d}</b><small>remíz</small></div></div>`;
  };
  // Sudoku: závody, hra o samotě, sudoku dne.
  const drawSd = (mine) => {
    const races = mine.filter((g) => g.type === 'sd' && !g.finished).sort((a, b) => (b.updatedAt || '') > (a.updatedAt || '') ? 1 : -1);
    const done = mine.filter((g) => g.type === 'sd' && g.finished);
    const wins = done.filter((g) => g.winner && norm(g.winner) === norm(me)).length;
    const loc = sdLoad(), solo = loc.solo, st = loc.stats || { solved: 0, best: {} };
    const daily = loc.daily && loc.daily.date === todayKey() ? loc.daily : null;
    const lvName = (l) => (LEVELS[l] ? LEVELS[l].name.toLowerCase() : '');
    const raceRow = (g) => {
      const o = other(g, me), ms = (g.st || {})[me] || {}, os = (g.st || {})[o] || {};
      const my = !ms.done;
      const line = ms.done ? `hotovo za ${fmtMs(ms.total)} · čeká se na soupeře` : `${lvName(g.level)} · ty ${filledCount(ms.cells || g.puzzle)}/81 · ${esc(o)} ${os.done ? 'hotovo' : filledCount(os.cells || g.puzzle) + '/81'}`;
      return `<a class="row" href="#/sudoku/${encodeURIComponent(g.id)}">${avatar(o, 36)}<div style="flex:1;min-width:0"><div class="t">Závod s ${esc(o)}</div><div class="s">${line}</div></div><span class="pill ${my ? 'hot' : ''}">${my ? 'hraj!' : 'čeká'}</span></a>`;
    };
    const soloRow = solo && !solo.done ? `<a class="row" href="#/sudoku/sam"><span class="av" style="width:36px;height:36px;background:var(--surface);font-size:18px">🧩</span><div style="flex:1;min-width:0"><div class="t">Sám</div><div class="s">${lvName(solo.level)} · ${fmtMs(solo.ms)} · ${filledCount(solo.cells)}/81</div></div><span class="pill hot">pokračuj</span></a>` : '';
    const best = st.best && st.best[sdLevel];
    body.innerHTML = `
      <div class="gtabs">${['pk', 'ld', 'px', 'sd'].map((k) => `<button class="${tab === k ? 'on' : ''}" data-gt="${k}"><i>${GAME_ICONS[k]}</i>${GAME_NAMES[k]}</button>`).join('')}</div>
      <div class="section-h">Rozehrané</div>
      ${races.map(raceRow).join('')}${soloRow}
      ${!races.length && !soloRow ? '<div class="sub" style="padding:0 2px 8px">Žádná rozehraná hra.</div>' : ''}
      <div class="section-h">Nová hra</div>
      <div class="sdlv">${Object.entries(LEVELS).map(([k, v]) => `<button class="${k === sdLevel ? 'on' : ''}" data-lv="${k}">${v.name}</button>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn primary big block" data-ch>🔢 ${withName ? 'Závod s: ' + esc(withName) : 'Závod s kamarádem'}</button>
        <button class="btn big block" data-solo>🧩 Hrát sám</button>
        <a class="btn big block sdday" href="#/sudoku/den">📅 Sudoku dne pro celou partu<small>${daily && daily.done ? 'vyřešeno · ' + fmtMs(daily.total) : daily ? 'rozehráno · ' + filledCount(daily.cells) + '/81' : 'každý den nové, stejné pro všechny'}</small></a></div>
      <div class="section-h">Tvoje statistiky · Sudoku</div>
      <div class="gstats"><div><b>${st.solved || 0}</b><small>vyřešeno</small></div><div><b>${best ? fmtMs(best) : '–'}</b><small>nejlepší · ${lvName(sdLevel)}</small></div><div><b>${wins}</b><small>vyhraných závodů</small></div></div>`;
  };
  body.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-gt]');
    if (t) { tab = t.dataset.gt; try { sessionStorage.setItem(TAB_KEY, tab); } catch (x) { /* nic */ } draw(); return; }
    const lv = e.target.closest('[data-lv]');
    if (lv) { sdLevel = lv.dataset.lv; const all = sdLoad(); all.lastLevel = sdLevel; sdSave(all); draw(); return; }
    if (e.target.closest('[data-solo]')) {
      const cur = sdLoad().solo;
      if (!cur || cur.done || await confirmDanger('Nová hra sudoku?', 'Rozehraná hra o samotě se zahodí.', 'Nová hra')) newSolo(sdLevel);
      location.hash = '#/sudoku/sam';
      return;
    }
    if (e.target.closest('[data-ai]')) {
      const all = aiLoad();
      if (!all[tab] || all[tab].finished || await confirmDanger('Nová hra proti počítači?', 'Rozehraná hra se zahodí.', 'Nová hra')) {
        all[tab] = { ...newState(tab, [me, AI]), ai: true };
        if (tab === 'ld') { all[tab].fleets[AI] = randomFleet(); }
        aiSave(all);
      }
      location.hash = '#/hra/ai/' + tab;
      return;
    }
    if (e.target.closest('[data-ch]')) {
      const go = async (name) => {
        try { const id = await challenge(tab, name, dmThreadId(me, name), threadPath, tab === 'sd' ? { level: sdLevel } : {}); location.hash = (tab === 'sd' ? '#/sudoku/' : '#/hra/') + encodeURIComponent(id); }
        catch (x) { console.error(x); toast('Výzvu se nepodařilo poslat.'); }
      };
      if (withName) return go(withName);
      const bd = document.createElement('div');
      bd.className = 'backdrop';
      bd.innerHTML = `<div class="sheet"><div class="grab"></div><h3>Koho vyzveš?</h3><div class="chips">${PARTY_NAMES.filter((n) => norm(n) !== norm(me)).map((n) => `<button class="chip" data-n="${esc(n)}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(n, 22)}${esc(n)}</button>`).join('')}</div><button class="btn block" data-x style="margin-top:12px">Zrušit</button></div>`;
      bd.addEventListener('click', (ev) => { if (ev.target === bd || ev.target.closest('[data-x]')) return bd.remove(); const c = ev.target.closest('[data-n]'); if (c) { bd.remove(); go(c.dataset.n); } });
      document.body.appendChild(bd);
    }
  });
  const unsub = onSnapshot(query(collection(db, 'v2_games'), where('players', 'array-contains', me)), (s) => { games = s.docs.map((d) => ({ id: d.id, ...d.data() })); draw(); }, () => { games = []; draw(); });
  return unsub;
}

// ---------- jedna hra ----------
export function renderGame(root, { id, aiType = null, dmThreadId }) {
  const me = myName();
  let g = null, unsub = () => {}, busy = false, sel = null, pxHide = null;
  const isAi = !!aiType;
  // Dokud máš hru otevřenou, server ti o ní neposílá upozornění
  // (presence/{jméno}.viewingGame + čas, obnovuje se každých 20 s).
  const view = (on) => { if (isAi || !id || !me) return; setDoc(doc(db, 'presence', me), on ? { viewingGame: id, viewingAt: new Date().toISOString() } : { viewingGame: '', viewingAt: '' }, { merge: true }).catch(() => {}); };
  const onVis = () => view(!document.hidden);
  view(true);
  const viewTick = setInterval(() => { if (!document.hidden) view(true); }, 20000);
  document.addEventListener('visibilitychange', onVis);
  root.innerHTML = `<div class="screen game">
    <div class="top"><a class="ibtn" href="#/hry" data-back aria-label="Zpět">${icon('back')}</a><div style="flex:1;min-width:0"><div class="h1" data-title>Hra</div><div class="sub" data-sub></div></div></div>
    <div class="scroll" data-body>${spinner()}</div></div>`;
  const body = root.querySelector('[data-body]');
  const save = async (patch) => {
    Object.assign(g, patch, { updatedAt: new Date().toISOString() });
    if (isAi) { const all = aiLoad(); all[aiType] = g; aiSave(all); draw(); return; }
    draw();
    const { id: _i, ...data } = g;
    try { await updateDoc(doc(db, 'v2_games', id), data); } catch (x) { console.error(x); toast('Tah se nepodařilo uložit.'); }
  };
  const opp = () => other(g, me);
  const myTurn = () => !g.finished && norm(g.turn) === norm(me);

  function header() {
    root.querySelector('[data-title]').textContent = GAME_NAMES[g.type] + (isAi ? ' · počítač' : '');
    root.querySelector('[data-sub]').textContent = (isAi ? '' : 's ' + opp() + ' · ') + (g.type === 'ld' ? 'výstřel ' : 'tah ') + (g.moves || 0);
    if (!isAi && g.thread) root.querySelector('[data-back]').href = '#/chat/' + encodeURIComponent(g.thread);
  }
  function endBox() {
    if (!g.finished) return '';
    const t = !g.winner ? 'Remíza 🤝' : norm(g.winner) === norm(me) ? 'Vyhrál(a) jsi! 🏆' : `Vyhrál(a) ${esc(g.winner)}`;
    return `<div class="gend"><b>${t}</b><button class="btn primary block" data-again>${isAi ? 'Hrát znovu' : 'Odveta'}</button></div>`;
  }
  function players(extra = '') {
    return `<div class="gplayers">${g.players.map((p) => `<span class="gp ${!g.finished && norm(g.turn) === norm(p) ? 'on' : ''}">${p === AI ? '<span class="av" style="width:28px;height:28px;background:var(--surface)">🖥</span>' : avatar(p, 28)}${norm(p) === norm(me) ? 'Ty' : esc(p)}${extra ? extra(p) : ''}</span>`).join('<b class="vs">vs</b>')}</div>`;
  }

  function draw() {
    if (!g) { body.innerHTML = '<div class="empty">Hra nenalezena.</div>'; return; }
    header();
    if (g.type === 'pk') drawPk(); else if (g.type === 'ld') drawLd(); else drawPx();
  }

  // ----- piškvorky -----
  function drawPk() {
    const mark = (p) => (norm(p) === norm(g.players[0]) ? '✕' : '○');
    const win = new Set(g.winLine || []);
    let cells = '';
    for (let i = 0; i < N_PK * N_PK; i++) { const v = g.board[i]; cells += `<button class="${v === 'o' ? 'o' : ''}${i === g.last ? ' last' : ''}${win.has(i) ? ' win' : ''}" data-c="${i}" ${v !== '.' || !myTurn() ? 'tabindex="-1"' : ''}>${v === 'x' ? '✕' : v === 'o' ? '○' : ''}</button>`; }
    body.innerHTML = `${players((p) => ' ' + mark(p))}<div class="pkb" style="grid-template-columns:repeat(${N_PK},1fr)">${cells}</div>
      <div class="gcap">${g.finished ? '' : myTurn() ? 'Jsi na tahu · pět v řadě vyhrává' : isAi ? 'Počítač přemýšlí…' : `Na tahu je ${esc(g.turn)} — přijde ti upozornění`}</div>${endBox()}`;
  }
  async function pkMove(i) {
    if (!myTurn() || g.board[i] !== '.' || busy) return;
    const s = norm(me) === norm(g.players[0]) ? 'x' : 'o';
    const b = g.board.slice(0, i) + s + g.board.slice(i + 1);
    const line = pkWin(b, i);
    const full = !b.includes('.');
    await save({ board: b, last: i, moves: (g.moves || 0) + 1, turn: opp(), finished: !!line || full, winner: line ? me : null, winLine: line || null });
    if (isAi && !g.finished) {
      busy = true;
      setTimeout(async () => {
        const j = pkAi(g.board, s, s === 'x' ? 'o' : 'x');
        const b2 = g.board.slice(0, j) + (s === 'x' ? 'o' : 'x') + g.board.slice(j + 1);
        const l2 = pkWin(b2, j);
        busy = false;
        await save({ board: b2, last: j, moves: g.moves + 1, turn: me, finished: !!l2 || !b2.includes('.'), winner: l2 ? AI : null, winLine: l2 || null });
      }, 450);
    }
  }

  // ----- lodě -----
  // fleet = co se ukáže (u soupeře jen zasažená pole), full = celé lodě pro „potopeno“.
  function sea(fleet, shots, own, full = fleet) {
    let h = '';
    for (let i = 0; i < 100; i++) {
      const ship = full && full.find((s) => s.includes(i)) && (own || (fleet && fleet.some((s) => s.includes(i)))) ? full.find((s) => s.includes(i)) : null;
      const shot = shots.includes(i);
      let cls = '', t = '';
      if (shot && ship) { cls = ldSunk(ship, shots) ? 's' : 'h'; t = ldSunk(ship, shots) ? '🔥' : '✕'; }
      else if (shot) { cls = 'mi'; t = '•'; }
      else if (own && ship) cls = 'sh';
      h += `<button class="${cls}" ${own ? 'tabindex="-1"' : `data-s="${i}"`}>${t}</button>`;
    }
    return h;
  }
  function drawLd() {
    const myFleet = (g.fleets || {})[me];
    if (g.phase === 'place' && !myFleet) {
      if (!sel) sel = randomFleet();
      body.innerHTML = `${players()}<div class="gcap" style="text-align:left">Rozmísti flotilu: 5 lodí (5, 4, 3, 3, 2), nesmí se dotýkat ani rohem. Zamíchej, dokud se ti rozmístění nelíbí.</div>
        <div class="ldsea own big">${sea(sel, [], true)}</div>
        <div class="two"><button class="btn" data-shuffle>🔀 Zamíchat</button><button class="btn primary" data-ready>✓ Hotovo</button></div>`;
      return;
    }
    if (g.phase === 'place') {
      body.innerHTML = `${players()}<div class="ldsea own big">${sea(myFleet, [], true)}</div><div class="gcap">Tvoje flotila je připravená. Až ${esc(opp())} rozmístí lodě, hra začne a přijde ti upozornění.</div>`;
      return;
    }
    const o = opp();
    const myShots = g.shots[me] || [], theirShots = g.shots[o] || [];
    const oppFleet = g.fleets[o] || [];
    const sunkMe = myFleet.filter((s) => ldSunk(s, theirShots)).length, sunkO = oppFleet.filter((s) => ldSunk(s, myShots)).length;
    const hits = myShots.filter((x) => oppFleet.some((s) => s.includes(x))).length;
    // Lodě soupeře ukazujeme až po konci hry.
    const hidden = g.finished ? oppFleet : oppFleet.map((s) => (ldSunk(s, myShots) ? s : s.filter((x) => myShots.includes(x))));
    body.innerHTML = `${players()}
      <div class="ldcoords">${'ABCDEFGHIJ'.split('').map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="ldsea">${sea(hidden, myShots, false, oppFleet)}</div>
      <div class="gcap">${g.finished ? '' : myTurn() ? 'Střílíš ty · trefa = střílíš znovu' : isAi ? 'Počítač míří…' : `Střílí ${esc(o)}`}</div>
      <div class="ldme"><div class="ldsea own sm">${sea(myFleet, theirShots, true)}</div><div><b>Tvoje flotila</b><br>Zásahy soupeře: ${theirShots.filter((x) => myFleet.some((s) => s.includes(x))).length}<br>Potopeno: ${sunkMe} z 5<br><span class="sub">Soupeři zbývá: ${5 - sunkO} · přesnost ${myShots.length ? Math.round(hits / myShots.length * 100) : 0} %</span></div></div>${endBox()}`;
  }
  async function ldShoot(i) {
    if (!myTurn() || busy || g.phase !== 'play') return;
    const o = opp(), shots = { ...g.shots, [me]: [...(g.shots[me] || [])] };
    if (shots[me].includes(i)) return;
    shots[me].push(i);
    const hit = g.fleets[o].some((s) => s.includes(i));
    const won = ldAllSunk(g.fleets[o], shots[me]);
    await save({ shots, moves: (g.moves || 0) + 1, turn: hit && !won ? me : o, finished: won, winner: won ? me : null });
    if (isAi && !g.finished && norm(g.turn) === norm(AI)) aiShootLoop();
  }
  function aiShootLoop() {
    busy = true;
    setTimeout(async () => {
      const s2 = { ...g.shots, [AI]: [...(g.shots[AI] || [])] };
      const j = ldAi(s2[AI], g.fleets[me]);
      s2[AI].push(j);
      const hit = g.fleets[me].some((s) => s.includes(j));
      const won = ldAllSunk(g.fleets[me], s2[AI]);
      busy = false;
      await save({ shots: s2, turn: hit && !won ? AI : me, finished: won, winner: won ? AI : null });
      if (hit && !won) aiShootLoop();
    }, 650);
  }

  // ----- pexeso -----
  function drawPx() {
    const open = g.open || [];
    const cards = g.deck.map((f, i) => {
      if (g.found && g.found[i] != null) return `<button class="done" tabindex="-1">${emoSvg(f, 38)}</button>`;
      if (open.includes(i)) return `<button class="f ${open.length === 2 ? 'sel' : ''}" tabindex="-1">${emoSvg(f, 52)}</button>`;
      return `<button class="b" data-p="${i}" aria-label="Karta"></button>`;
    }).join('');
    const sc = g.scores || {};
    body.innerHTML = `<div class="pxscore">${g.players.map((p) => `<div class="${!g.finished && norm(g.turn) === norm(p) ? 'on' : ''}">${p === AI ? '<span class="av" style="width:28px;height:28px;background:var(--surface)">🖥</span>' : avatar(p, 28)}${norm(p) === norm(me) ? 'Ty' : esc(p)}<b>${sc[p] || 0}</b></div>`).join('')}</div>
      <div class="pxgrid">${cards}</div>
      <div class="gcap">${g.finished ? '' : g.lastMatch && norm(g.turn) === norm(me) ? '🎉 Dvojice! Hraješ znovu.' : myTurn() ? 'Jsi na tahu · otoč dvě karty' : isAi ? 'Počítač hraje…' : `Hraje ${esc(g.turn)}`}</div>${endBox()}`;
  }
  async function pxFlip(i) {
    if (!myTurn() || busy) return;
    const open = g.open || [];
    if (open.length >= 2 || open.includes(i)) return;
    if (!open.length) { await save({ open: [i], lastMatch: false }); return; }
    const [a] = open, match = g.deck[a] === g.deck[i];
    if (match) {
      const found = { ...(g.found || {}), [a]: me, [i]: me };
      const scores = { ...g.scores, [me]: (g.scores[me] || 0) + 1 };
      const over = Object.keys(found).length === g.deck.length;
      const [p0, p1] = g.players;
      const winner = over ? (scores[p0] === scores[p1] ? null : scores[p0] > scores[p1] ? p0 : p1) : null;
      await save({ open: [a, i], found, scores, moves: (g.moves || 0) + 1, lastMatch: true, finished: over, winner });
      setTimeout(() => { if (g.open && g.open.length === 2) save({ open: [] }); }, 700);
    } else {
      await save({ open: [a, i], moves: (g.moves || 0) + 1, lastMatch: false });
      busy = true;
      setTimeout(async () => { busy = false; await save({ open: [], turn: opp() }); if (isAi && !g.finished) aiPxLoop(); }, 1300);
    }
  }
  // Počítač si pamatuje část otočených karet (náhodně zapomíná).
  const pxMemory = new Map();
  function aiPxLoop() {
    if (!isAi || g.finished || norm(g.turn) !== norm(AI)) return;
    busy = true;
    const closed = g.deck.map((_, i) => i).filter((i) => !(g.found && g.found[i] != null));
    const known = [...pxMemory.entries()].filter(([i]) => closed.includes(i));
    let a = null, b = null;
    for (const [i, f] of known) { const pair = known.find(([j, f2]) => j !== i && f2 === f); if (pair) { a = i; b = pair[0]; break; } }
    if (a == null) a = closed.filter((i) => !pxMemory.has(i))[0] ?? closed[0];
    setTimeout(async () => {
      pxMemory.set(a, g.deck[a]);
      if (b == null) { const m = known.find(([j, f]) => j !== a && f === g.deck[a]); b = m ? m[0] : closed.filter((i) => i !== a && !pxMemory.has(i))[0] ?? closed.find((i) => i !== a); }
      await save({ open: [a] });
      setTimeout(async () => {
        pxMemory.set(b, g.deck[b]);
        const match = g.deck[a] === g.deck[b];
        if (match) {
          const found = { ...(g.found || {}), [a]: AI, [b]: AI }, scores = { ...g.scores, [AI]: (g.scores[AI] || 0) + 1 };
          const over = Object.keys(found).length === g.deck.length;
          const winner = over ? (scores[me] === scores[AI] ? null : scores[me] > scores[AI] ? me : AI) : null;
          await save({ open: [a, b], found, scores, moves: g.moves + 1, finished: over, winner });
          setTimeout(async () => { await save({ open: [] }); busy = false; aiPxLoop(); }, 800);
        } else {
          await save({ open: [a, b], moves: g.moves + 1 });
          setTimeout(async () => { busy = false; if (Math.random() < 0.25) pxMemory.delete(a); await save({ open: [], turn: me }); }, 1300);
        }
      }, 700);
    }, 600);
  }

  body.addEventListener('click', async (e) => {
    if (!g) return;
    const c = e.target.closest('[data-c]'); if (c && g.type === 'pk') return pkMove(+c.dataset.c);
    const s = e.target.closest('[data-s]'); if (s && g.type === 'ld') return ldShoot(+s.dataset.s);
    const p = e.target.closest('[data-p]'); if (p && g.type === 'px') { if (isAi) pxMemory.set(+p.dataset.p, g.deck[+p.dataset.p]); return pxFlip(+p.dataset.p); }
    if (e.target.closest('[data-shuffle]')) { sel = randomFleet(); draw(); return; }
    if (e.target.closest('[data-ready]')) {
      const fleets = { ...(g.fleets || {}), [me]: sel };
      const both = g.players.every((pl) => fleets[pl]);
      await save({ fleets, phase: both ? 'play' : 'place' });
      return;
    }
    if (e.target.closest('[data-again]')) {
      if (isAi) {
        const all = aiLoad(); all[aiType] = { ...newState(aiType, [me, AI]), ai: true };
        if (aiType === 'ld') all[aiType].fleets[AI] = randomFleet();
        aiSave(all); g = all[aiType]; sel = null; pxMemory.clear(); draw();
      } else {
        try {
          const { threadPath } = await import('./chat.js');
          const nid = await challenge(g.type, opp(), g.thread || dmThreadId(me, opp()), threadPath);
          location.hash = '#/hra/' + encodeURIComponent(nid);
        } catch (x) { toast('Odvetu se nepodařilo založit.'); }
      }
    }
  });

  if (isAi) {
    g = aiLoad()[aiType] || null;
    draw();
    if (g && !g.finished && norm(g.turn) === norm(AI)) { if (g.type === 'ld') aiShootLoop(); else if (g.type === 'px') aiPxLoop(); }
  } else {
    unsub = onSnapshot(doc(db, 'v2_games', id), (snap) => {
      if (busy) return;
      g = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      if (g && g.type === 'sd') { location.replace('#/sudoku/' + encodeURIComponent(g.id)); return; }
      draw();
      // Pexeso: kdyby hráč po otočení dvou karet zavřel aplikaci, karty se po chvíli otočí zpět samy.
      clearTimeout(pxHide);
      if (g && g.type === 'px' && (g.open || []).length === 2 && !g.finished) {
        pxHide = setTimeout(() => {
          if (!g || (g.open || []).length !== 2) return;
          const stale = Date.now() - new Date(g.updatedAt || 0).getTime() > 3500;
          if (stale && norm(g.turn) !== norm(me)) save({ open: [], turn: g.lastMatch ? g.turn : me });
        }, 4000);
      }
    }, () => { g = null; draw(); });
  }
  return () => { unsub(); clearTimeout(pxHide); clearInterval(viewTick); document.removeEventListener('visibilitychange', onVis); view(false); };
}

// Stav hry pro kartu ve zprávě.
export function gameCardHtml(game, g, me) {
  const type = (g && g.type) || game.type;
  const name = GAME_NAMES[type] || 'Hra';
  let line = 'Hra se načítá…', title = `${GAME_ICONS[type] || '🎮'} ${name}`, btn = 'Otevřít hru';
  if (g) {
    const o = other(g, me);
    if (g.finished) { title += ' – konec'; line = !g.winner ? 'Remíza' : norm(g.winner) === norm(me) ? 'Vyhrál(a) jsi 🏆' : `Vyhrál(a) ${esc(g.winner)}`; }
    else if (type === 'ld' && g.phase === 'place') { title += ' – výzva'; line = (g.fleets || {})[me] ? `Čeká se, až ${esc(o)} rozmístí lodě` : 'Rozmísti flotilu a hra začne'; if (!(g.fleets || {})[me]) btn = 'Přijmout výzvu'; }
    else {
      if (g.moves) title += type === 'px' ? ` · ${(g.scores || {})[g.players[0]] || 0} : ${(g.scores || {})[g.players[1]] || 0}` : ` · tah ${g.moves}`;
      else title += ' – výzva';
      line = norm(g.turn) === norm(me) ? 'Jsi na tahu' : `Na tahu je ${esc(g.turn)}`;
    }
  }
  if (type === 'sd') {
    title = `🔢 Sudoku${g && g.level && LEVELS[g.level] ? ' · ' + LEVELS[g.level].name.toLowerCase() : ''}`; btn = 'Hrát';
    if (g) {
      const o = other(g, me), ms = (g.st || {})[me] || {};
      if (g.finished) { title += ' – konec'; line = !g.winner ? 'Remíza' : norm(g.winner) === norm(me) ? 'Vyhrál(a) jsi 🏆' : `Vyhrál(a) ${esc(g.winner)}`; btn = 'Výsledky'; }
      else if (ms.done) { line = `Tvůj čas ${fmtMs(ms.total)} · čeká se na ${esc(o)}`; btn = 'Otevřít'; }
      else { title += ' – závod'; line = 'Stejné zadání, vyhraje rychlejší'; }
    }
    return `<div class="gcard"><b>${title}</b><small>${line}</small><a class="gbtn" href="#/sudoku/${encodeURIComponent(game.id)}">${btn}</a></div>`;
  }
  let mini = '';
  if (g && type === 'pk' && g.moves) {
    // výřez 6×6 kolem posledního tahu
    const r0 = Math.max(0, Math.min(N_PK - 6, Math.floor(g.last / N_PK) - 3)), c0 = Math.max(0, Math.min(N_PK - 6, (g.last % N_PK) - 3));
    let c = '';
    for (let r = r0; r < r0 + 6; r++) for (let k = c0; k < c0 + 6; k++) { const v = g.board[r * N_PK + k]; c += `<i class="${v === 'o' ? 'o' : ''}">${v === 'x' ? '✕' : v === 'o' ? '○' : ''}</i>`; }
    mini = `<div class="gcmini">${c}</div>`;
  }
  return `<div class="gcard"><b>${title}</b>${mini}<small>${line}</small><a class="gbtn" href="#/hra/${encodeURIComponent(game.id)}">${btn}</a></div>`;
}

export async function loadGame(id) {
  try { const s = await getDoc(doc(db, 'v2_games', id)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch (e) { return null; }
}
