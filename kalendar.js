// Kalendář: měsíční mřížka (dny s akcí vybarvené a větší), pod ní akce celého měsíce.
// Po sekundě akce „vypadnou“ ze svých dnů dolů do seznamu. Klepnutí na den zúží seznam na ten den.
import { esc, icon, MONTHS_NOM, fmtWhen, fmtLongDate, sameDay, startOfDay } from './util.js';

const MONTHS_LOC = ['lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'];
import { tabbar, spinner, choose, toast, confirmDanger } from './ui.js';
import { myName } from './auth.js';
import { watchEvents, events, cachedAttendance, loadAttendance, icsForMany, shareIcs } from './store.js';
import { session, newIcsToken } from './auth.js';
import { APP_URL } from './config.js';

// Směr, odkud má nový měsíc přijet (po swipu nebo šipkách): 1 = zprava, -1 = zleva.
let enterFrom = 0;

export function render(root, { year, month }) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  let sel = null;               // vybraný den; null = celý měsíc
  let pending = true, dropT = null, flies = [];   // animace „pádu“ akcí do seznamu
  const revealed = new Set();
  const prev = new Date(y, m - 1, 1), next = new Date(y, m + 1, 1);
  const href = (d) => `#/kalendar/${d.getFullYear()}-${d.getMonth() + 1}`;

  root.innerHTML = `<div class="screen">
    <div class="top">
      <a class="ibtn" href="#/akce" aria-label="Zpět">${icon('back')}</a>
      <div style="flex:1;display:flex;align-items:center;gap:10px;min-width:0"><div class="h1" style="font-size:22px">Kalendář</div>
        <button class="ibtn" data-sharecal aria-label="Sdílet celý kalendář">${icon('share')}</button></div>
      <button class="ibtn" data-today aria-label="Dnes" style="width:auto;padding:0 14px;font-weight:600;font-size:14px">Dnes</button>
    </div>
    <div class="mhead">
      <button class="ibtn ghost" data-mon="-1" aria-label="Předchozí měsíc">${icon('back')}</button>
      <button class="t mpick" data-pick aria-label="Vybrat měsíc a rok">${MONTHS_NOM[m]} ${y} <span aria-hidden="true">▾</span></button>
      <button class="ibtn ghost" data-mon="1" aria-label="Další měsíc">${icon('next')}</button>
    </div>
    <div class="calswipe" data-calarea><div data-grid class="${enterFrom ? (enterFrom > 0 ? 'cal-in-r' : 'cal-in-l') : ''}">${spinner()}</div></div>
    <div class="scroll" data-day style="padding-top:14px"></div>
    ${tabbar('akce')}
  </div>`;
  // Kalendář akcí do telefonu: odběr (sám se aktualizuje), Google, jednorázové stažení.
  root.querySelector('[data-sharecal]').onclick = () => calendarSheet();
  enterFrom = 0;

  // Přechod na jiný měsíc: mřížka odjede na stranu, nový měsíc přijede z druhé.
  const gridEl = root.querySelector('[data-grid]');
  const goMonth = (dir) => {
    const d = new Date(y, m + dir, 1);
    gridEl.style.transition = 'transform .18s ease-in, opacity .18s';
    gridEl.style.transform = `translateX(${-dir * 100}%)`;
    gridEl.style.opacity = '0';
    enterFrom = dir;
    setTimeout(() => location.replace(href(d)), 170);
  };
  root.querySelectorAll('[data-mon]').forEach((b) => { b.onclick = () => goMonth(+b.dataset.mon); });
  root.querySelector('[data-pick]').onclick = () => monthPicker(y, m, (yy, mm) => {
    enterFrom = (yy * 12 + mm) > (y * 12 + m) ? 1 : -1;
    location.replace(`#/kalendar/${yy}-${mm + 1}`);
  });

  // Swipe doleva = další měsíc, doprava = předchozí.
  const area = root.querySelector('.calswipe');
  let sx = 0, sy = 0, sdx = 0, strack = null;
  area.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; sdx = 0; strack = null; gridEl.style.transition = 'none'; }, { passive: true });
  area.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (strack === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) strack = Math.abs(dx) > Math.abs(dy);
    if (!strack) return;
    sdx = dx;
    gridEl.style.transform = `translateX(${dx}px)`;
    gridEl.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 400));
  }, { passive: true });
  area.addEventListener('touchend', () => {
    if (strack && Math.abs(sdx) > 60) { goMonth(sdx < 0 ? 1 : -1); return; }
    gridEl.style.transition = 'transform .2s, opacity .2s';
    gridEl.style.transform = ''; gridEl.style.opacity = '';
  });

  root.querySelector('[data-today]').onclick = () => { location.hash = '#/kalendar'; if (y === now.getFullYear() && m === now.getMonth()) { stopDrop(); sel = startOfDay(now); draw(); } };

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
        // Vícedenní akce: sousední dny v týdnu se spojí do jednoho bloku.
        const span = (o) => { if (d.getMonth() !== m) return false; const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + o); if (n.getMonth() !== m) return false; const ids = new Set(evOn(n).map((e) => e.id)); return evs.some((e) => ids.has(e.id)); };
        const dow = (d.getDay() + 6) % 7;
        const jl = dow > 0 && span(-1), jr = dow < 6 && span(1);
        const cls = ['day', d.getMonth() !== m ? 'out' : '', sameDay(d, now) ? 'today' : '', sel && sameDay(d, sel) ? 'sel' : '', evs.length ? 'ev' : '', going ? 'going' : '', jl ? 'jl' : '', jr ? 'jr' : '', dow === 0 && span(-1) ? 'cl' : '', dow === 6 && span(1) ? 'cr' : ''].join(' ');
        return `<button class="${cls}" data-d="${d.getTime()}" aria-label="${esc(fmtLongDate(d))}${evs.length ? ', ' + evs.length + ' akce' : ''}">${d.getDate()}<i>${evs.length > 1 ? evs.length : ''}</i></button>`;
      }).join('')}</div>`;
    grid.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { stopDrop(); const d = new Date(+b.dataset.d); sel = sel && sameDay(sel, d) ? null : d; draw(); }; });

    const mStart = new Date(y, m, 1), mEnd = new Date(y, m + 1, 1);
    const list = sel ? evOn(sel) : events.list.filter((e) => e.start < mEnd && e.end > mStart);
    const today0 = startOfDay(now);
    const pill = (e) => {
      if (cachedAttendance(e.id)?.going.includes(me)) return '<span class="pill calgo">Jdu ✓</span>';
      if (e.end <= now) return '<span class="pill">proběhla</span>';
      if (e.start <= now) return '<span class="pill calgo">právě teď</span>';
      const n = Math.round((startOfDay(e.start) - today0) / 86400000);
      return `<span class="pill">${n === 0 ? 'dnes' : n === 1 ? 'zítra' : 'za ' + n + ' ' + (n < 5 ? 'dny' : 'dní')}</span>`;
    };
    // Den, ze kterého karta „vypadne“ (u vícedenní akce první den v tomto měsíci).
    const fromDay = (e) => (e.start < mStart ? mStart : startOfDay(e.start));
    const WD = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
    const head = sel
      ? `<div class="calhead"><span class="section-h" style="padding:0">${esc(fmtLongDate(sel))}</span><button class="chip" data-all>Celý měsíc</button></div>`
      : `<div class="calhead"><span class="section-h" style="padding:0">${list.length ? `${list.length} ${list.length === 1 ? 'akce' : list.length < 5 ? 'akce' : 'akcí'} v ${MONTHS_LOC[m]}` : `V ${MONTHS_LOC[m]} zatím nic`}</span></div>`;
    root.querySelector('[data-day]').innerHTML = head + (list.length ? '<div class="callist">' + list.map((e) => {
      const fd = fromDay(e), k = e.id;
      const hide = !sel && pending && !revealed.has(k);
      return `<a class="row calcard${hide ? ' pre' : ''}" data-k="${esc(k)}" data-from="${fd.getTime()}" href="#/akce/${encodeURIComponent(e.id)}">
        <div class="calbd"><b>${fd.getDate()}.</b><small>${WD[fd.getDay()]}</small></div>
        <div style="min-width:0;flex:1"><div class="t">${esc(e.title)}</div><div class="s">${esc(fmtWhen(e))}${e.place ? ' · ' + esc(e.place) : ''}</div></div>
        ${e.isTest ? '<span class="pill test">test</span>' : pill(e)}
      </a>`;
    }).join('') + '</div>' : (sel ? '<div class="empty" style="padding:20px">Tenhle den nic.</div>' : ''));
    const all = root.querySelector('[data-all]');
    if (all) all.onclick = () => { sel = null; draw(); };
    if (!sel && pending && list.length && !dropT) dropT = setTimeout(drop, 1000);
  }

  // Pád akcí: z každého vybarveného dne vyletí kopie a dopadne na datum karty v seznamu.
  function drop() {
    dropT = null;
    const cards = [...root.querySelectorAll('.calcard.pre')];
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    cards.forEach((card, i) => {
      const k = card.dataset.k;
      const show = () => { revealed.add(k); const c = root.querySelector(`.calcard[data-k="${CSS.escape(k)}"]`); if (c) c.classList.remove('pre'); };
      const cell = root.querySelector(`.day[data-d="${card.dataset.from}"]:not(.out)`);
      const badge = card.querySelector('.calbd');
      const a = cell && cell.getBoundingClientRect(), b = badge && badge.getBoundingClientRect();
      if (reduce || i >= 10 || !a || !b || b.top > window.innerHeight + 200) { setTimeout(show, reduce ? 0 : i * 60); return; }
      setTimeout(() => {
        if (!pending) return;
        cell.classList.remove('bump'); void cell.offsetWidth; cell.classList.add('bump');
        const f = document.createElement('div');
        f.className = 'calfly';
        f.textContent = cell.firstChild ? cell.firstChild.textContent + '.' : '';
        Object.assign(f.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
        document.body.appendChild(f);
        flies.push(f);
        const dx = b.left - a.left, dy = b.top - a.top;
        const anim = f.animate([
          { transform: 'translate(0,0) scale(1.12)' },
          { transform: `translate(${dx * 0.5}px,${dy * 0.3}px) scale(1.3) rotate(${i % 2 ? -9 : 9}deg)`, offset: 0.35 },
          { transform: `translate(${dx}px,${dy}px) scale(${b.width / a.width},${b.height / a.height})` }
        ], { duration: 700, easing: 'cubic-bezier(.5,0,.6,1.15)', fill: 'forwards' });
        anim.onfinish = () => { show(); setTimeout(() => f.remove(), 120); };
      }, i * 230);
    });
    setTimeout(() => { pending = false; }, cards.length * 230 + 900);
  }
  // Klepnutí na den nebo „Dnes“ během čekání: animaci přeskočit a ukázat vše hned.
  function stopDrop() {
    if (dropT) { clearTimeout(dropT); dropT = null; }
    pending = false;
    flies.forEach((f) => f.remove()); flies = [];
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
  return () => { unsub(); stopDrop(); };
}

function feedUrl(token) {
  return `${APP_URL.replace(/^https?:\/\//, '')}/kalendar.ics?t=${token}`;
}

async function calendarSheet() {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Akce v kalendáři"><div class="grab"></div>
    <h3>Akce v kalendáři</h3>
    <p>Obsahuje akce od loňska a všechny naplánované.</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn primary big block" data-k="ios">Odebírat v iPhonu</button>
      <button class="btn big block" data-k="google">Přidat do Google kalendáře</button>
      <button class="btn big block" data-k="file">Stáhnout jednorázově</button>
      <button class="btn big block" data-k="copy">Zkopírovat adresu</button>
    </div>
    <p style="margin:14px 0 6px;font-size:13px;text-align:left">Odběr se sám aktualizuje, když se akce změní nebo přibude. Adresu nikomu neposílej – kdo ji má, vidí akce party.</p>
    <button class="btn block" data-k="reset" style="background:none;border:none;color:var(--danger);text-decoration:underline;height:36px">Zneplatnit adresu a vytvořit novou</button>
  </div>`;
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  document.body.appendChild(bd);

  const token = async () => session.member?.icsToken || newIcsToken();

  bd.querySelector('.sheet').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    try {
      if (k === 'file') {
        bd.remove();
        const v = await choose({ title: 'Stáhnout jednorázově', text: 'Soubor se později sám neaktualizuje.', buttons: [
          { label: 'Nadcházející akce', value: 'up', kind: 'primary' },
          { label: `Celý kalendář (${events.list.length})`, value: 'all' },
          { label: 'Zrušit', value: null, kind: 'dashed' }] });
        if (!v) return;
        const now = new Date();
        const list = v === 'up' ? events.list.filter((x) => x.end > now && !x.isTest) : events.list.filter((x) => !x.isTest);
        if (!list.length) { toast('Žádné akce.'); return; }
        const r = await shareIcs(icsForMany(list), v === 'up' ? 'kokrsnek-nadchazejici.ics' : 'kokrsnek-kalendar.ics', 'KoKrŠNeK – kalendář');
        if (r === 'downloaded') toast('Soubor kalendáře je stažený.');
        return;
      }
      if (k === 'reset') {
        if (!(await confirmDanger('Zneplatnit adresu?', 'Kalendáře, které odebírají starou adresu, přestanou dostávat akce. Odběr pak přidej znovu.', 'Zneplatnit'))) return;
        await newIcsToken();
        toast('Nová adresa je připravená.');
        return;
      }
      const t = await token();
      const url = feedUrl(t);
      if (k === 'ios') location.href = 'webcal://' + url;
      else if (k === 'google') window.open('https://calendar.google.com/calendar/r?cid=' + encodeURIComponent('webcal://' + url), '_blank', 'noopener');
      else if (k === 'copy') {
        try { await navigator.clipboard.writeText('https://' + url); toast('Adresa zkopírována'); }
        catch (x) { prompt('Adresa kalendáře:', 'https://' + url); }
      }
    } catch (x) {
      console.error(x);
      toast('Nepovedlo se (' + (x.code || x.message) + ').');
    }
  });
}

// Výběr roku a měsíce: řada let nahoře, pod ní měsíce s počtem akcí.
function monthPicker(curY, curM, onPick) {
  const nowY = new Date().getFullYear();
  const years = events.list.map((e) => e.start.getFullYear());
  const minY = Math.min(nowY - 1, ...(years.length ? years : [nowY]));
  const maxY = Math.max(nowY + 1, ...(years.length ? years : [nowY]));
  let selY = curY;
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Vybrat měsíc"><div class="grab"></div>
    <h3>Vyber měsíc</h3>
    <div class="ypick" data-years></div>
    <div class="mgrid" data-months></div>
  </div>`;
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  document.body.appendChild(bd);
  const yBox = bd.querySelector('[data-years]');
  const mBox = bd.querySelector('[data-months]');
  const SHORT = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
  const drawYears = () => {
    const ys = [];
    for (let yy = maxY; yy >= minY; yy--) ys.push(yy);
    yBox.innerHTML = ys.map((yy) => `<button class="${yy === selY ? 'on' : ''}" data-y="${yy}">${yy}</button>`).join('');
    const on = yBox.querySelector('.on');
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  const drawMonths = () => {
    const counts = new Array(12).fill(0);
    events.list.forEach((e) => { if (e.start.getFullYear() === selY) counts[e.start.getMonth()]++; });
    const today = new Date();
    mBox.innerHTML = SHORT.map((n, i) => {
      const cls = [i === curM && selY === curY ? 'on' : '', i === today.getMonth() && selY === today.getFullYear() ? 'today' : ''].join(' ');
      return `<button class="${cls}" data-m="${i}"><b>${n}</b><span>${counts[i] ? counts[i] + ' ' + (counts[i] === 1 ? 'akce' : counts[i] < 5 ? 'akce' : 'akcí') : '·'}</span></button>`;
    }).join('');
  };
  yBox.onclick = (e) => { const b = e.target.closest('[data-y]'); if (!b) return; selY = +b.dataset.y; drawYears(); drawMonths(); };
  mBox.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; bd.remove(); onPick(selY, +b.dataset.m); };
  drawYears(); drawMonths();
}
