// Sudoku: závod s kamarádem (v2_games, type 'sd'), hra o samotě a sudoku dne.
// Chyby se ukážou až po vyplnění celé mřížky; každá chyba přidá k času 30 s.
// Závod: oba mají stejné zadání, každý si měří svůj čas, vyhrává nižší výsledný čas.
//   v2_games/{id}: { type:'sd', players, by, thread, level, puzzle, solution,
//                    st: { [jméno]: { cells, ms, done, wrong, total, hint, at } }, finished, winner }
// Sudoku dne: zadání se počítá z data (stejné pro celou partu),
//   výsledky jsou ve v2_sudoku/{YYYY-MM-DD}/times/{jméno}.
// Hra o samotě a rozehrané sudoku dne žijí jen v telefonu (localStorage).
import { db, collection, doc, onSnapshot, updateDoc, setDoc } from './firebase.js';
import { esc, icon } from './util.js';
import { avatar, toast, spinner } from './ui.js';
import { myName } from './auth.js';

export const LEVELS = { l: { name: 'Lehké', clues: 40 }, m: { name: 'Střední', clues: 32 }, h: { name: 'Těžké', clues: 26 } };
const PENALTY = 30000;
const norm = (s) => String(s || '').normalize('NFC').trim();

// ---------- generátor ----------
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const ROW = (i) => Math.floor(i / 9), COL = (i) => i % 9, BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.add(j);
  return [...s];
});

// Počet řešení (zastaví se na limitu). grid = pole 81 čísel, 0 = prázdné.
function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i]; rows[ROW(i)] |= b; cols[COL(i)] |= b; boxes[BOX(i)] |= b; }
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestCnt = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const mask = ~(rows[ROW(i)] | cols[COL(i)] | boxes[BOX(i)]) & 0x3FE;
      let c = 0; for (let m = mask; m; m &= m - 1) c++;
      if (c < bestCnt) { best = i; bestMask = mask; bestCnt = c; if (c <= 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    if (!bestCnt) return false;
    const r = ROW(best), c = COL(best), x = BOX(best);
    for (let d = 1; d <= 9; d++) {
      const b = 1 << d; if (!(bestMask & b)) continue;
      g[best] = d; rows[r] |= b; cols[c] |= b; boxes[x] |= b;
      if (rec()) return true;
      g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[x] &= ~b;
    }
    return false;
  };
  rec();
  return count;
}

function fullGrid(rnd) {
  const g = new Array(81).fill(0);
  const fill = (i) => {
    if (i === 81) return true;
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let k = 8; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [digits[k], digits[j]] = [digits[j], digits[k]]; }
    for (const d of digits) {
      if (PEERS[i].some((p) => g[p] === d)) continue;
      g[i] = d; if (fill(i + 1)) return true;
    }
    g[i] = 0; return false;
  };
  fill(0);
  return g;
}

// Zadání s jediným řešením. Vrací { puzzle, solution } jako řetězce 81 číslic (0 = prázdné).
export function generate(level = 'm', seed = null) {
  const rnd = mulberry32(seed == null ? Math.floor(Math.random() * 2 ** 32) : seed);
  const sol = fullGrid(rnd);
  const g = sol.slice();
  const order = Array.from({ length: 81 }, (_, i) => i);
  for (let k = 80; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  let clues = 81;
  const target = LEVELS[level] ? LEVELS[level].clues : 32;
  for (const i of order) {
    if (clues <= target) break;
    const v = g[i]; g[i] = 0;
    if (countSolutions(g) !== 1) g[i] = v; else clues--;
  }
  return { puzzle: g.join(''), solution: sol.join('') };
}

export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dailyPuzzle = (day = todayKey()) => generate('m', hashStr('kokrsnek-sudoku-' + day));

export const fmtMs = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};
export const filledCount = (cells) => [...String(cells || '')].filter((c) => c !== '0').length;
const chybyText = (n) => n === 1 ? '1 chyba' : n >= 2 && n <= 4 ? `${n} chyby` : `${n} chyb`;

// ---------- úložiště v telefonu ----------
const KEY = 'kokrsnek2Sudoku';
export const sdLoad = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
export const sdSave = (all) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* nic */ } };
function addStat(level, total) {
  const all = sdLoad(); const st = all.stats || { solved: 0, best: {} };
  st.solved = (st.solved || 0) + 1;
  if (level && (!st.best[level] || total < st.best[level])) st.best[level] = total;
  all.stats = st; sdSave(all);
}
export function newSolo(level) {
  const all = sdLoad();
  const { puzzle, solution } = generate(level);
  all.solo = { level, puzzle, solution, cells: puzzle, ms: 0, done: false, hint: false };
  sdSave(all);
  try { localStorage.removeItem('kokrsnek2SdNotes:sam'); } catch (e) { /* nic */ }
}

// Nový závod (dokument do v2_games).
export function newRaceState(level) {
  const { puzzle, solution } = generate(level);
  return { level, puzzle, solution, st: {}, moves: 0, turn: null };
}

// ---------- obrazovka hry ----------
// mode: 'race' (id), 'solo', 'daily'
export function renderSudoku(root, { mode, id = null }) {
  const me = myName();
  let game = null;          // závod: dokument hry
  let S = null;             // můj stav { cells, ms, done, wrong, total, hint }
  let P = null;             // { puzzle, solution, level }
  let sel = -1, notesMode = false, notes = new Array(81).fill(0), undo = [];
  let startT = null, saveT = null, tickT = null, dayTimes = [], unsubs = [];
  const notesKey = 'kokrsnek2SdNotes:' + (mode === 'race' ? id : mode === 'daily' ? 'den:' + todayKey() : 'sam');
  try { const n = JSON.parse(localStorage.getItem(notesKey) || 'null'); if (Array.isArray(n) && n.length === 81) notes = n; } catch (e) { /* nic */ }

  root.innerHTML = `<div class="screen game sd">
    <div class="top"><a class="ibtn" href="#/hry" data-back aria-label="Zpět">${icon('back')}</a>
      <div style="flex:1;min-width:0"><div class="h1">Sudoku</div><div class="sub" data-sub></div></div><div class="sdclock" data-clock>0:00</div></div>
    <div class="scroll" data-body>${spinner()}</div></div>`;
  const body = root.querySelector('[data-body]');
  const clock = root.querySelector('[data-clock]');
  const opp = () => game ? (game.players.find((p) => norm(p) !== norm(me)) || '') : '';

  const elapsed = () => (S ? S.ms : 0) + (startT ? Date.now() - startT : 0);
  const running = () => S && !S.done && !document.hidden;
  const startClock = () => { if (running() && !startT) startT = Date.now(); };
  const stopClock = () => { if (startT && S) { S.ms += Date.now() - startT; startT = null; } };
  const tick = () => { clock.textContent = fmtMs(S && S.done ? S.total : elapsed()); };

  // Uložení mého stavu (závod do Firestore s malým zpožděním, jinak hned do telefonu).
  function persist(now = false) {
    try { localStorage.setItem(notesKey, JSON.stringify(notes)); } catch (e) { /* nic */ }
    if (!S) return;
    const snap = { ...S, ms: elapsed(), at: new Date().toISOString() };
    if (mode === 'race') {
      clearTimeout(saveT);
      const go = () => updateDoc(doc(db, 'v2_games', id), { ['st.' + me]: snap, updatedAt: new Date().toISOString() }).catch((x) => { console.error(x); toast('Stav se nepodařilo uložit.'); });
      if (now) return go(); saveT = setTimeout(go, 1200);
    } else {
      const all = sdLoad();
      if (mode === 'solo') all.solo = { ...all.solo, ...snap };
      else all.daily = { ...(all.daily || {}), date: P.date, ...snap };
      sdSave(all);
    }
  }

  function header() {
    const sub = root.querySelector('[data-sub]');
    const lvl = LEVELS[P.level] ? LEVELS[P.level].name.toLowerCase() : '';
    if (mode === 'race') {
      sub.textContent = `závod s ${opp()} · ${lvl}`;
      if (game.thread) root.querySelector('[data-back]').href = '#/chat/' + encodeURIComponent(game.thread);
    } else if (mode === 'daily') { const [, m, d] = P.date.split('-'); sub.textContent = `sudoku dne · ${+d}. ${+m}.`; }
    else sub.textContent = `sám · ${lvl}`;
  }

  function raceBars() {
    if (mode !== 'race') return '';
    const row = (p) => {
      const st = (game.st || {})[p] || {};
      const n = filledCount(st.cells || P.puzzle), mine = norm(p) === norm(me);
      const right = st.done ? (game.finished || mine ? `${fmtMs(st.total)}` : 'hotovo') : `${n}/81`;
      return `<div class="sdrc">${avatar(p, 24)}<span class="nm">${mine ? 'Ty' : esc(p)}</span><div class="sdbar"><span style="width:${Math.round(n / 81 * 100)}%;background:${mine ? 'var(--accent-hi)' : '#E2664F'}"></span></div><small>${right}</small></div>`;
    };
    return `<div class="sdrace">${game.players.map(row).join('')}</div>`;
  }

  function boardHtml() {
    const cells = S.cells, done = S.done;
    const sv = sel >= 0 && cells[sel] !== '0' ? cells[sel] : null;
    let h = '';
    for (let i = 0; i < 81; i++) {
      const v = cells[i], given = P.puzzle[i] !== '0';
      let cl = '';
      if (COL(i) === 2 || COL(i) === 5) cl += ' r3';
      if (ROW(i) === 2 || ROW(i) === 5) cl += ' b3';
      if (sel >= 0 && !done && (ROW(i) === ROW(sel) || COL(i) === COL(sel) || BOX(i) === BOX(sel))) cl += ' hl';
      if (sv && v === sv && i !== sel) cl += ' same';
      if (i === sel && !done) cl += ' sel';
      if (!given && v !== '0') cl += ' u';
      if (done && !given && v !== P.solution[i]) cl += ' err';
      let inner = v !== '0' ? v : '';
      if (v === '0' && notes[i]) inner = `<span class="sdn">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${notes[i] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
      h += `<button class="${cl.trim()}" data-i="${i}">${inner}</button>`;
    }
    return `<div class="sdb">${h}</div>`;
  }

  function padHtml() {
    if (S.done) return '';
    const cnt = new Array(10).fill(0); for (const c of S.cells) cnt[+c]++;
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => { const left = 9 - cnt[d]; return `<button data-d="${d}" class="${left <= 0 ? 'dn' : ''}">${d}<small>${left <= 0 ? '✓' : left}</small></button>`; }).join('');
    return `<div class="sdpad">${keys}</div>
      <div class="sdtools"><button data-t="undo"><b>↶</b>Zpět</button><button data-t="erase"><b>⌫</b>Smazat</button>
      <button data-t="notes" class="${notesMode ? 'on' : ''}"><b>✎</b>Poznámky</button><button data-t="hint" ${S.hint ? 'class="used"' : ''}><b>💡</b>Nápověda (${S.hint ? 0 : 1})</button></div>
      <div class="gcap">${mode === 'race' ? 'Oba máte stejné zadání. Chyby se ukážou až na konci, každá přidá 30 s.' : 'Chyby se ukážou až po vyplnění celé mřížky, každá přidá 30 s.'}</div>`;
  }

  function endHtml() {
    if (!S.done) return '';
    const pen = S.wrong ? ` · ${chybyText(S.wrong)} (+${fmtMs(S.wrong * PENALTY)})` : ' · bez chyby 🎯';
    let res = `<div class="sdres"><span>Tvůj čas</span><b>${fmtMs(S.total)}</b><small>${fmtMs(S.ms)}${pen}</small></div>`;
    if (mode === 'race') {
      const o = opp(), os = (game.st || {})[o] || {};
      let head;
      if (!game.finished) head = `Hotovo! Čeká se, až ${esc(o)} dořeší.`;
      else head = !game.winner ? 'Remíza 🤝' : norm(game.winner) === norm(me) ? 'Vyhrál(a) jsi! 🏆' : `Vyhrál(a) ${esc(game.winner)}`;
      if (game.finished) res += `<div class="sdres"><span>${esc(o)}</span><b>${fmtMs(os.total)}</b><small>${fmtMs(os.ms)}${os.wrong ? ` · ${chybyText(os.wrong)}` : ' · bez chyby'}</small></div>`;
      return `<div class="gend"><b>${head}</b><div class="sdress">${res}</div>${game.finished ? '<button class="btn primary block" data-again>Odveta</button>' : ''}</div>`;
    }
    if (mode === 'daily') return `<div class="gend"><b>Sudoku dne vyřešeno ✅</b><div class="sdress">${res}</div>${boardTimes()}</div>`;
    return `<div class="gend"><b>Vyřešeno! 🎉</b><div class="sdress">${res}</div><button class="btn primary block" data-again>Nová hra · ${LEVELS[P.level].name.toLowerCase()}</button></div>`;
  }

  function boardTimes() {
    if (!dayTimes.length) return '<div class="sub">Zatím nikdo z party.</div>';
    const list = dayTimes.slice().sort((a, b) => a.total - b.total);
    return `<div class="sdlb">${list.map((t, k) => `<div class="${norm(t.name) === norm(me) ? 'me' : ''}"><span class="pos">${k + 1}.</span>${avatar(t.name, 26)}<span class="nm">${esc(t.name)}</span><small>${t.wrong ? chybyText(t.wrong) : ''}</small><b>${fmtMs(t.total)}</b></div>`).join('')}</div>`;
  }

  function draw() {
    if (!P || !S) { body.innerHTML = '<div class="empty">Hra nenalezena.</div>'; return; }
    header();
    const dailyInfo = mode === 'daily' && !S.done ? `<div class="gcap">${dayTimes.length ? `Dnes už vyřešili: ${dayTimes.map((t) => esc(t.name)).join(', ')}` : 'Dnes zatím nikdo z party.'}</div>` : '';
    body.innerHTML = raceBars() + boardHtml() + padHtml() + dailyInfo + endHtml();
    tick();
  }

  // ----- tahy -----
  const pushUndo = () => { undo.push({ cells: S.cells, notes: notes.slice() }); if (undo.length > 200) undo.shift(); };
  const editable = (i) => i >= 0 && P.puzzle[i] === '0' && !S.done;
  function setCell(i, v) {
    S.cells = S.cells.slice(0, i) + v + S.cells.slice(i + 1);
    if (v !== '0') { notes[i] = 0; for (const p of PEERS[i]) notes[p] &= ~(1 << +v); }
  }
  function afterMove() {
    if (!S.cells.includes('0')) return finish();
    persist(); draw();
  }
  function input(d) {
    if (!editable(sel)) { if (sel < 0) toast('Nejdřív klepni na prázdné pole.'); return; }
    pushUndo();
    if (notesMode) { if (S.cells[sel] !== '0') return; notes[sel] ^= 1 << d; persist(); draw(); return; }
    setCell(sel, S.cells[sel] === String(d) ? '0' : String(d));
    afterMove();
  }
  function finish() {
    stopClock();
    let wrong = 0; for (let i = 0; i < 81; i++) if (S.cells[i] !== P.solution[i]) wrong++;
    Object.assign(S, { done: true, wrong, total: S.ms + wrong * PENALTY });
    sel = -1;
    if (mode === 'race') {
      game.st = { ...(game.st || {}), [me]: S };
      persist(true).then(() => checkRaceEnd());
    } else persist(true);
    if (mode === 'daily') setDoc(doc(db, 'v2_sudoku', P.date, 'times', me), { name: me, ms: S.ms, wrong, total: S.total, at: new Date().toISOString() }).catch((x) => { console.error(x); toast('Výsledek se nepodařilo uložit.'); });
    addStat(mode === 'daily' ? null : P.level, S.total);
    if (mode === 'daily') { const all = sdLoad(); all.stats.best.den = Math.min(all.stats.best.den || Infinity, S.total); sdSave(all); }
    draw();
  }
  // Konec závodu dopočítá ten, kdo uvidí oba výsledky (i kdyby dořešili současně).
  function checkRaceEnd() {
    if (!game || game.finished) return;
    const [a, b] = game.players, sa = (game.st || {})[a], sb = (game.st || {})[b];
    if (!sa || !sb || !sa.done || !sb.done) return;
    const winner = sa.total === sb.total ? null : sa.total < sb.total ? a : b;
    updateDoc(doc(db, 'v2_games', id), { finished: true, winner, updatedAt: new Date().toISOString() }).catch(() => {});
  }

  body.addEventListener('click', async (e) => {
    if (!S) return;
    const c = e.target.closest('[data-i]');
    if (c) { if (S.done) return; sel = +c.dataset.i; draw(); return; }
    const d = e.target.closest('[data-d]'); if (d) return input(+d.dataset.d);
    const t = e.target.closest('[data-t]');
    if (t) {
      const k = t.dataset.t;
      if (k === 'notes') { notesMode = !notesMode; draw(); return; }
      if (k === 'undo') { const u = undo.pop(); if (!u) return toast('Není co vracet.'); S.cells = u.cells; notes = u.notes; persist(); draw(); return; }
      if (k === 'erase') {
        if (!editable(sel)) return;
        if (S.cells[sel] === '0' && !notes[sel]) return;
        pushUndo(); if (S.cells[sel] !== '0') setCell(sel, '0'); else notes[sel] = 0; persist(); draw(); return;
      }
      if (k === 'hint') {
        if (S.hint) return toast('Nápovědu už jsi v téhle hře použil(a).');
        let i = editable(sel) && S.cells[sel] !== P.solution[sel] ? sel : -1;
        if (i < 0) { const free = []; for (let j = 0; j < 81; j++) if (S.cells[j] === '0') free.push(j); if (!free.length) return; i = free[Math.floor(Math.random() * free.length)]; }
        pushUndo(); S.hint = true; sel = i; setCell(i, P.solution[i]); afterMove(); return;
      }
    }
    if (e.target.closest('[data-again]')) {
      if (mode === 'solo') { newSolo(P.level); load(); return; }
      if (mode === 'race') {
        try {
          const { challenge } = await import('./games.js');
          const { threadPath, dmThreadId } = await import('./chat.js');
          const nid = await challenge('sd', opp(), game.thread || dmThreadId(me, opp()), threadPath, { level: game.level });
          location.hash = '#/sudoku/' + encodeURIComponent(nid);
        } catch (x) { console.error(x); toast('Odvetu se nepodařilo založit.'); }
      }
    }
  });

  const onVis = () => { if (document.hidden) { stopClock(); persist(true); } else startClock(); };
  document.addEventListener('visibilitychange', onVis);
  tickT = setInterval(tick, 1000);

  function load() {
    sel = -1; undo = []; notesMode = false;
    if (mode === 'solo') {
      const s = sdLoad().solo;
      if (!s) { body.innerHTML = '<div class="empty">Žádná rozehraná hra.</div>'; return; }
      P = { puzzle: s.puzzle, solution: s.solution, level: s.level };
      S = { cells: s.cells, ms: s.ms || 0, done: !!s.done, wrong: s.wrong || 0, total: s.total || 0, hint: !!s.hint };
      try { const n = JSON.parse(localStorage.getItem(notesKey) || 'null'); notes = Array.isArray(n) && n.length === 81 ? n : new Array(81).fill(0); } catch (e) { notes = new Array(81).fill(0); }
      startT = null; startClock(); draw();
    } else if (mode === 'daily') {
      const day = todayKey(); const all = sdLoad();
      const pz = dailyPuzzle(day);
      P = { ...pz, level: 'm', date: day };
      const s = all.daily && all.daily.date === day ? all.daily : null;
      S = s ? { cells: s.cells, ms: s.ms || 0, done: !!s.done, wrong: s.wrong || 0, total: s.total || 0, hint: !!s.hint } : { cells: pz.puzzle, ms: 0, done: false, wrong: 0, total: 0, hint: false };
      startClock(); draw();
      unsubs.push(onSnapshot(collection(db, 'v2_sudoku', day, 'times'), (sn) => { dayTimes = sn.docs.map((x) => x.data()); draw(); }, () => {}));
    }
  }

  if (mode === 'race') {
    unsubs.push(onSnapshot(doc(db, 'v2_games', id), (snap) => {
      if (!snap.exists()) { P = null; S = null; draw(); return; }
      game = { id: snap.id, ...snap.data() };
      if (!P) {
        P = { puzzle: game.puzzle, solution: game.solution, level: game.level };
        const mine = (game.st || {})[me];
        S = mine ? { cells: mine.cells, ms: mine.ms || 0, done: !!mine.done, wrong: mine.wrong || 0, total: mine.total || 0, hint: !!mine.hint } : { cells: game.puzzle, ms: 0, done: false, wrong: 0, total: 0, hint: false };
        startClock();
      } else if (game.st && game.st[me] && game.st[me].done && !S.done) {
        // dořešeno na jiném zařízení
        const m = game.st[me]; Object.assign(S, m); stopClock();
      }
      checkRaceEnd();
      draw();
    }, () => { P = null; S = null; draw(); }));
  } else load();

  return () => {
    const wasDone = !S || S.done; stopClock(); if (!wasDone) persist(true);
    clearInterval(tickT); clearTimeout(saveT);
    unsubs.forEach((u) => u());
    document.removeEventListener('visibilitychange', onVis);
  };
}
