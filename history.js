// Historie akce: předchozí ročníky stejné akce (stejně jako „Podle akce“ ve Fotkách —
// vlastní skupina photoGroup, jinak název bez číslovky na začátku).
// Karta v Akcích: malý graf účasti po letech. Detail akce: časová osa ročníků
// (rok, kdo tam byl, počet lidí, album), klepnutím na ročník se otevře jeho akce.
import { esc, icon, looseName } from './util.js';
import { faces } from './ui.js';
import { events, isPast, cachedAttendance, loadAttendance, cachedAlbum, loadAlbum } from './store.js';

const seriesKey = (ev) => looseName(ev.photoGroup || String(ev.title || '').replace(/^\d+\.\s*/, '')).replace(/[^a-z0-9]+/g, ' ').trim();

// Minulé ročníky (od nejnovějšího), bez testovacích akcí.
export function pastEditions(ev) {
  const k = seriesKey(ev);
  if (!k) return [];
  return events.list
    .filter((e) => e.id !== ev.id && !e.isTest && e.start < ev.start && isPast(e) && seriesKey(e) === k)
    .sort((a, b) => b.start - a.start);
}

// Ročník: číslo z názvu („32. výroční oheň“, „Osada 33. výročí“), jinak počet ročníků v aplikaci.
export function ordinalOf(ev, list) {
  const t = String(ev.title || '');
  const m = t.match(/^\s*(\d{1,3})\.\s/) || t.match(/(\d{1,3})\.\s*(?:výročí|ročník)/i);
  if (m) return +m[1];
  return list.length ? list.length + 1 : 0;
}

const loading = new Map();
function loadAll(list) {
  return Promise.all(list.map((e) => {
    if (cachedAttendance(e.id)) return null;
    if (!loading.has(e.id)) loading.set(e.id, loadAttendance(e).catch(() => null));
    return loading.get(e.id);
  }));
}
const lidi = (n) => `${n} ${n === 1 ? 'člověk' : n >= 2 && n <= 4 ? 'lidé' : 'lidí'}`;

// ---------- karta v Akcích ----------
function sparkHtml(ev, list) {
  const rows = list.slice(0, 10).reverse().map((e) => ({ y: e.start.getFullYear(), n: (cachedAttendance(e.id)?.going || []).length }));
  const max = Math.max(...rows.map((r) => r.n), 0);
  const last = list[0], lastN = last ? (cachedAttendance(last.id)?.going || []).length : 0;
  const ord = ordinalOf(ev, list);
  // graf jen když je z čeho (aspoň dva ročníky a někde zapsaná účast)
  const bars = rows.length >= 2 && max > 0
    ? `<span class="evspark-b" aria-hidden="true">${rows.map((r) => `<i style="height:${Math.max(8, Math.round((r.n / max) * 100))}%" title="${r.y}: ${r.n}"></i>`).join('')}</span>` : '';
  return `${bars}<span class="evspark-t">${icon('history', 14)}${ord}. ročník${lastN ? ` · ${last.start.getFullYear() === ev.start.getFullYear() - 1 ? 'loni' : last.start.getFullYear()} ${lidi(lastN)}` : ''}</span>`;
}
// Vyplní všechny [data-spark] v kontejneru (karta se často překresluje — z mezipaměti hned).
export function fillSparks(box) {
  box.querySelectorAll('[data-spark]').forEach((el) => {
    const ev = events.list.find((e) => e.id === el.dataset.spark);
    if (!ev) return;
    const list = pastEditions(ev);
    if (!list.length && !ordinalOf(ev, list)) { el.remove(); return; }
    const draw = () => { if (el.isConnected) { el.innerHTML = sparkHtml(ev, list); el.hidden = false; } };
    if (list.slice(0, 10).every((e) => cachedAttendance(e.id))) draw();
    else loadAll(list.slice(0, 10)).then(draw);
  });
}

// ---------- detail akce ----------
export function fillHistory(box, ev, live = true) {
  if (!box) return;
  const list = pastEditions(ev);
  if (!list.length) { box.innerHTML = ''; return; }
  let open = false;
  const row = (e) => {
    const g = cachedAttendance(e.id)?.going;
    const al = cachedAlbum(e);
    return `<a class="hist-r" href="#/akce/${encodeURIComponent(e.id)}">
      <b class="hist-y">${e.start.getFullYear()}</b>
      <span class="hist-p">${g ? (g.length ? faces(g, 5) + `<span>${lidi(g.length)}</span>` : '<span>bez záznamu účasti</span>') : '<span>…</span>'}</span>
      ${al ? `<span class="hist-al" data-al="${esc(al)}" role="link" aria-label="Fotky z roku ${e.start.getFullYear()}">${icon('photo', 18)}</span>` : '<span class="hist-al off" aria-hidden="true"></span>'}
    </a>`;
  };
  const draw = () => {
    if (!box.isConnected && live) return;
    const shown = open ? list : list.slice(0, 3);
    const total = list.reduce((s, e) => s + ((cachedAttendance(e.id)?.going || []).length), 0);
    box.innerHTML = `<div class="h2"><span>Historie akce</span><span class="sub">${ordinalOf(ev, list)}. ročník${total ? ` · celkem ${total}× účast` : ''}</span></div>
      <div class="hist">${shown.map(row).join('')}
      ${list.length > 3 ? `<button class="hist-more" data-hmore>${open ? 'Méně' : `+ ${list.length - 3} ${list.length - 3 === 1 ? 'starší ročník' : list.length - 3 <= 4 ? 'starší ročníky' : 'starších ročníků'}`}</button>` : ''}</div>`;
  };
  draw();
  if (!live) return;
  box.onclick = (e) => {
    const a = e.target.closest('[data-al]');
    if (a) { e.preventDefault(); e.stopPropagation(); window.open(a.dataset.al, '_blank', 'noopener'); return; }
    if (e.target.closest('[data-hmore]')) { open = !open; draw(); load(); }
  };
  const load = () => {
    const part = open ? list : list.slice(0, 3);
    loadAll(part).then(draw);
    Promise.all(part.map((e) => (cachedAlbum(e) === undefined ? loadAlbum(e).catch(() => '') : null))).then(draw);
  };
  load();
  // celkový počet účastí: načíst i zbytek (potichu)
  loadAll(list).then(draw);
}
