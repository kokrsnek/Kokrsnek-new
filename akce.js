// Akce: Nadcházející / Proběhlé.
import { esc, icon, fmtWhen, relDays, fmtSpan, MONTHS_NOM, MONTHS_SHORT, DAYS_SHORT, fmtTime, fmtLongDate, looseName } from './util.js';
import { tabbar, faces, toast, spinner } from './ui.js';
import { namedayFor } from './namedays.js';
import { myName } from './auth.js';
import { watchEvents, events, nextEvent, isLive, isPast, watchAttendance, loadAttendance, cachedAttendance } from './store.js';
import { changeAttendance, attendButtons } from './attend.js';

const PAGE = 60;

export function render(root, { tab }) {
  let searchOpen = false, q = '', shown = PAGE;
  let heroAtt = null, heroUnsub = null, heroId = null;
  const loading = new Set();

  const today = new Date();
  const nd = namedayFor(today);
  root.innerHTML = `<div class="screen">
    <div class="top">
      <div><div class="brand">KoKrŠNeK</div><div class="sub">${esc(fmtLongDate(today))}${nd ? ' · svátek má ' + esc(nd) : ''}</div></div>
      <div class="icons">
        <button class="ibtn" data-search aria-label="Hledat">${icon('search')}</button>
        <a class="ibtn" href="#/kalendar" aria-label="Kalendář">${icon('calendarGrid')}</a>
        <button class="ibtn" data-bell aria-label="Upozornění">${icon('bell')}</button>
      </div>
    </div>
    <div data-sbox style="display:none;padding:0 20px 6px"><input class="input" type="search" placeholder="Hledat akci nebo místo" aria-label="Hledat"></div>
    <div class="seg" role="tablist">
      <button role="tab" class="${tab === 'nadchazejici' ? 'on' : ''}" data-tab="#/akce">Nadcházející</button>
      <button role="tab" class="${tab === 'probehle' ? 'on' : ''}" data-tab="#/akce/probehle">Proběhlé</button>
    </div>
    <div class="scroll" data-body>${spinner()}</div>
    <a class="fab" href="#/nova">${icon('plus', 20, 2.4)}Nová akce</a>
    ${tabbar('akce')}
  </div>`;
  const body = root.querySelector('[data-body]');
  const sbox = root.querySelector('[data-sbox]');
  const sinput = sbox.querySelector('input');

  root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => location.replace(b.dataset.tab); });
  root.querySelector('[data-bell]').onclick = () => toast('Upozornění přijdou v další fázi.');
  root.querySelector('[data-search]').onclick = () => {
    searchOpen = !searchOpen;
    sbox.style.display = searchOpen ? 'block' : 'none';
    root.querySelector('[data-search]').classList.toggle('on', searchOpen);
    if (searchOpen) sinput.focus(); else { q = ''; sinput.value = ''; draw(); }
  };
  sinput.addEventListener('input', () => { q = sinput.value; shown = PAGE; draw(); });

  const match = (ev) => {
    if (!q.trim()) return true;
    const s = looseName(q);
    return looseName(ev.title).includes(s) || looseName(ev.place).includes(s);
  };

  const pill = (ev) => {
    const me = myName();
    const a = cachedAttendance(ev.id);
    let p = '';
    if (ev.isTest) p += '<span class="pill test">test</span> ';
    if (a?.going.includes(me)) p += '<span class="pill go">Jdu</span>';
    else if (a?.declined.includes(me)) p += '<span class="pill no">Nejdu</span>';
    return p;
  };

  // Řádek akce. Ve stylu Festival z něj CSS udělá dlaždici (2 vedle sebe).
  const row = (ev, past) => `<a class="row ${past ? 'past' : ''}" href="#/akce/${encodeURIComponent(ev.id)}">
      <span class="wd">${MONTHS_SHORT[ev.start.getMonth()]} · ${DAYS_SHORT[ev.start.getDay()]}${ev.allDay ? '' : ' · ' + fmtTime(ev.start)}</span>
      <div class="datetile sm" style="${past ? '' : 'background:var(--surface)'}"><span class="m">${MONTHS_SHORT[ev.start.getMonth()]}</span><span class="d">${ev.start.getDate()}</span></div>
      <div class="tx" style="min-width:0;flex:1">
        <div class="t">${esc(ev.title)}</div>
        <div class="s">${esc(fmtWhen(ev))}${ev.place ? ' · ' + esc(ev.place) : ''}</div>
      </div>
      <div class="r">${past ? (ev.photoAlbum ? icon('photo', 18) : '') : pill(ev) || esc(relDays(ev.start))}</div>
    </a>`;

  function heroHtml(ev) {
    const now = new Date();
    const live = isLive(ev, now);
    const me = myName();
    let pct, left, eyebrow;
    if (live) {
      const tot = Math.max(1, ev.end - ev.start);
      pct = Math.min(100, ((now - ev.start) / tot) * 100);
      left = `ještě ${fmtSpan(ev.end - now)}`;
      eyebrow = 'Právě probíhá';
    } else {
      const prev = [...events.list].reverse().find((e) => e.end <= ev.start && e.id !== ev.id);
      const from = prev ? prev.end : new Date(ev.start.getTime() - 30 * 86400000);
      const tot = Math.max(1, ev.start - from);
      pct = Math.max(2, Math.min(100, ((now - from) / tot) * 100));
      left = `zbývá ${fmtSpan(ev.start - now)}`;
      eyebrow = `Další akce · ${relDays(ev.start, now)}`;
    }
    const going = heroAtt?.going || [];
    return `<div class="card hero" data-open="${esc(ev.id)}">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div class="eyebrow ${live ? 'live' : ''}">${esc(eyebrow)}${ev.isTest ? ' · test' : ''}</div>
          <h2 class="title" style="margin-top:6px">${esc(ev.title)}</h2>
        </div>
        <div class="datetile"><span class="m">${MONTHS_SHORT[ev.start.getMonth()]}</span><span class="d">${ev.start.getDate()}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="meta">${icon('calendar', 16)}${esc(fmtWhen(ev))}</div>
        ${ev.place ? `<div class="meta">${icon('pin', 16)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.place)}</span></div>` : ''}
      </div>
      <div class="progress ${live ? 'live' : ''}"><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="lbl"><span>${esc(left)}</span><span>${heroAtt ? `jde <b>${going.length}</b>` : ''}</span></div></div>
      ${going.length ? `<div style="display:flex;align-items:center;gap:10px">${faces(going)}<span class="sub" style="margin:0">${going.includes(me) ? 'Ty a další' : 'Zatím bez tebe'}</span></div>` : ''}
      <div data-nodetail>${heroAtt ? attendButtons(ev, heroAtt) : '<div class="note">Načítám docházku…</div>'}</div>
    </div>`;
  }

  function draw() {
    if (!events.loaded) { body.innerHTML = spinner(); return; }
    if (events.error) {
      body.innerHTML = `<div class="empty">Akce se nepodařilo načíst.<br><span style="font-size:12px">${esc(events.error.code || events.error.message)}</span></div>`;
      return;
    }
    const now = new Date();
    if (tab === 'nadchazejici') {
      const up = events.list.filter((e) => !isPast(e, now) && match(e));
      if (!events.list.length) {
        body.innerHTML = `<div class="empty">Zatím tu nejsou žádné akce.<br>Správce je převezme z Google Kalendáře v záložce <a href="#/parta">Parta</a>.</div>`;
        return;
      }
      if (!up.length) { body.innerHTML = `<div class="empty">${q ? 'Nic nenalezeno.' : 'Žádná naplánovaná akce. Přidej nějakou!'}</div>`; return; }
      const hero = !q ? nextEvent(now) : null;
      const rest = hero ? up.filter((e) => e.id !== hero.id) : up;
      let html = hero ? heroHtml(hero) : '';
      let lastKey = '';
      for (const ev of rest) {
        const k = `${ev.start.getFullYear()}-${ev.start.getMonth()}`;
        if (k !== lastKey) {
          if (lastKey) html += '</div>';
          html += `<div class="section-h">${MONTHS_NOM[ev.start.getMonth()]}${ev.start.getFullYear() !== now.getFullYear() ? ' ' + ev.start.getFullYear() : ''}</div><div class="rows">`;
          lastKey = k;
        }
        html += row(ev, false);
      }
      if (lastKey) html += '</div>';
      body.innerHTML = html;
      if (hero && hero.id !== heroId) {
        if (heroUnsub) heroUnsub();
        heroId = hero.id; heroAtt = cachedAttendance(hero.id);
        heroUnsub = watchAttendance(hero, (a) => { heroAtt = a; const el = body.querySelector('.hero'); if (el) el.outerHTML = heroHtml(hero); bindHero(hero); });
      }
      if (hero) bindHero(hero);
      // Docházka u dalších nadcházejících akcí (kvůli štítku Jdu/Nejdu).
      rest.slice(0, 15).forEach((ev) => {
        if (cachedAttendance(ev.id) || loading.has(ev.id)) return;
        loading.add(ev.id);
        loadAttendance(ev).then(() => draw()).catch(() => {});
      });
    } else {
      const past = events.list.filter((e) => isPast(e, now) && match(e)).reverse();
      if (!past.length) { body.innerHTML = `<div class="empty">${q ? 'Nic nenalezeno.' : 'Zatím žádné proběhlé akce.'}</div>`; return; }
      let html = '', lastY = null;
      for (const ev of past.slice(0, shown)) {
        const y = ev.start.getFullYear();
        if (y !== lastY) { html += `${lastY !== null ? '</div>' : ''}<div class="section-h">${y}</div><div class="rows">`; lastY = y; }
        html += row(ev, true);
      }
      if (lastY !== null) html += '</div>';
      if (past.length > shown) html += `<button class="btn dashed block" data-more>Zobrazit další (${past.length - shown})</button>`;
      body.innerHTML = html;
      const more = body.querySelector('[data-more]');
      if (more) more.onclick = () => { shown += PAGE * 2; draw(); };
    }
  }

  function bindHero(ev) {
    const el = body.querySelector('.hero');
    if (!el) return;
    el.onclick = (e) => {
      const b = e.target.closest('[data-att]');
      if (b) { changeAttendance(ev, b.dataset.att, heroAtt); return; }
      if (e.target.closest('[data-nodetail]')) return;
      location.hash = '#/akce/' + encodeURIComponent(ev.id);
    };
  }

  const unsub = watchEvents(draw);
  const tick = setInterval(draw, 60000);
  return () => { unsub(); clearInterval(tick); if (heroUnsub) heroUnsub(); };
}
