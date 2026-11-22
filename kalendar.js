// Kalendář: měsíční mřížka, pod ní akce vybraného dne.
import { esc, icon, MONTHS_NOM, fmtWhen, fmtLongDate, sameDay, startOfDay } from './util.js';
import { tabbar, spinner } from './ui.js';
import { myName } from './auth.js';
import { watchEvents, events, cachedAttendance, loadAttendance } from './store.js';

export function render(root, { year, month }) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  let sel = (y === now.getFullYear() && m === now.getMonth()) ? startOfDay(now) : new Date(y, m, 1);
  const prev = new Date(y, m - 1, 1), next = new Date(y, m + 1, 1);
  const href = (d) => `#/kalendar/${d.getFullYear()}-${d.getMonth() + 1}`;

  root.innerHTML = `<div class="screen">
    <div class="top">
      <a class="ibtn" href="#/akce" aria-label="Zpět">${icon('back')}</a>
      <div class="h1" style="flex:1;font-size:22px">Kalendář</div>
      <button class="ibtn" data-today aria-label="Dnes" style="width:auto;padding:0 14px;font-weight:600;font-size:14px">Dnes</button>
    </div>
    <div class="mhead">
      <a class="ibtn ghost" href="${href(prev)}" aria-label="Předchozí měsíc">${icon('back')}</a>
      <div class="t">${MONTHS_NOM[m]} ${y}</div>
      <a class="ibtn ghost" href="${href(next)}" aria-label="Další měsíc">${icon('next')}</a>
    </div>
    <div data-grid>${spinner()}</div>
    <div class="scroll" data-day style="padding-top:14px"></div>
    ${tabbar('akce')}
  </div>`;
  root.querySelector('[data-today]').onclick = () => { location.hash = '#/kalendar'; if (y === now.getFullYear() && m === now.getMonth()) { sel = startOfDay(now); draw(); } };

  const evOn = (d) => events.list.filter((e) => {
    const s = startOfDay(e.start);
    const last = startOfDay(new Date(Math.max(e.start.getTime(), e.end.getTime() - (e.allDay ? 1 : 0))));
    return d >= s && d <= last;
  });

  function draw() {
    if (!events.loaded) return;
    const me = myName();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // pondělí první
    const start = new Date(y, m, 1 - offset);
    const days = [];
    for (let i = 0; i < 42; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    while (days.length > 35 && days[days.length - 7].getMonth() !== m) days.splice(-7);
    const grid = root.querySelector('[data-grid]');
    grid.innerHTML = `<div class="grid7">${['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'].map((d) => `<div class="wd">${d}</div>`).join('')}
      ${days.map((d) => {
        const evs = evOn(d);
        const going = evs.some((e) => cachedAttendance(e.id)?.going.includes(me));
        const cls = ['day', d.getMonth() !== m ? 'out' : '', sameDay(d, now) ? 'today' : '', sameDay(d, sel) ? 'sel' : '', evs.length ? 'ev' : '', going ? 'going' : ''].join(' ');
        return `<button class="${cls}" data-d="${d.getTime()}" aria-label="${esc(fmtLongDate(d))}${evs.length ? ', ' + evs.length + ' akce' : ''}">${d.getDate()}<i></i></button>`;
      }).join('')}</div>`;
    grid.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { sel = new Date(+b.dataset.d); draw(); }; });

    const list = evOn(sel);
    root.querySelector('[data-day]').innerHTML = `<div class="section-h" style="padding-top:0">${esc(fmtLongDate(sel))}</div>` +
      (list.length ? list.map((e) => `<a class="row" href="#/akce/${encodeURIComponent(e.id)}">
        <div style="width:4px;align-self:stretch;border-radius:4px;background:${cachedAttendance(e.id)?.going.includes(me) ? 'var(--accent-hi)' : 'var(--coral)'}"></div>
        <div style="min-width:0;flex:1"><div class="t">${esc(e.title)}</div><div class="s">${esc(fmtWhen(e))}${e.place ? ' · ' + esc(e.place) : ''}</div></div>
        ${e.isTest ? '<span class="pill test">test</span>' : ''}
      </a>`).join('') : '<div class="empty" style="padding:20px">Tenhle den nic.</div>');
  }

  // Docházka pro akce tohoto měsíce, kvůli zelenému označení "jdu".
  let loadedOnce = false;
  const unsub = watchEvents(() => {
    draw();
    if (loadedOnce) return;
    loadedOnce = true;
    const monthEvs = events.list.filter((e) => e.start.getFullYear() === y && e.start.getMonth() === m && !cachedAttendance(e.id));
    Promise.all(monthEvs.slice(0, 20).map((e) => loadAttendance(e).catch(() => {}))).then(draw);
  });
  return unsub;
}
