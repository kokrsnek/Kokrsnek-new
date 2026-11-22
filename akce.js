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
  let shift = 0;            // posun velké karty: 0 = nejbližší akce, -1 = předchozí, +1 = další
  let enterDir = '';         // směr animace po swipu
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

  function heroHtml(ev, att = heroAtt, sh = shift) {
    const now = new Date();
    const live = isLive(ev, now);
    const past = !live && isPast(ev, now);
    const me = myName();
    let pct = 0, left = '', eyebrow;
    if (live) {
      const tot = Math.max(1, ev.end - ev.start);
      pct = Math.min(100, ((now - ev.start) / tot) * 100);
      left = `ještě ${fmtSpan(ev.end - now)}`;
      eyebrow = 'Právě probíhá';
    } else if (past) {
      eyebrow = `Proběhlo · ${relDays(ev.start, now)}`;
    } else {
      const prev = [...events.list].reverse().find((e) => e.end <= ev.start && e.id !== ev.id);
      const from = prev ? prev.end : new Date(ev.start.getTime() - 30 * 86400000);
      const tot = Math.max(1, ev.start - from);
      pct = Math.max(2, Math.min(100, ((now - from) / tot) * 100));
      left = `zbývá ${fmtSpan(ev.start - now)}`;
      eyebrow = sh === 0 ? `Další akce · ${relDays(ev.start, now)}` : `Plánovaná akce · ${relDays(ev.start, now)}`;
    }
    const going = att?.going || [];
    const cls = enterDir ? ` enter-${enterDir}` : '';
    return `<div class="card hero${past ? ' was' : ''}${cls}" data-open="${esc(ev.id)}">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex:1;min-width:0">
          <div class="eyebrow ${live ? 'live' : ''}" ${past ? 'style="color:var(--muted)"' : ''}>${esc(eyebrow)}${ev.isTest ? ' · test' : ''}</div>
          <h2 class="title" style="margin-top:6px">${esc(ev.title)}</h2>
        </div>
        <div class="datetile"><span class="m">${MONTHS_SHORT[ev.start.getMonth()]}</span><span class="d">${ev.start.getDate()}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="meta">${icon('calendar', 16)}${esc(fmtWhen(ev))}${ev.start.getFullYear() !== now.getFullYear() ? ' ' + ev.start.getFullYear() : ''}</div>
        ${ev.place ? `<div class="meta">${icon('pin', 16)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.place)}</span></div>` : ''}
      </div>
      ${past ? '' : `<div class="progress ${live ? 'live' : ''}"><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="lbl"><span>${esc(left)}</span><span>${att ? `jde <b>${going.length}</b>` : ''}</span></div></div>`}
      ${going.length ? `<div style="display:flex;align-items:center;gap:10px">${faces(going)}<span class="sub" style="margin:0">${past ? `${going.includes(me) ? 'Byl jsi tam' : 'Bez tebe'} · ${going.length} ${going.length === 1 ? 'účastník' : going.length < 5 ? 'účastníci' : 'účastníků'}` : going.includes(me) ? 'Ty a další' : 'Zatím bez tebe'}</span></div>` : ''}
      <div data-nodetail>
        ${past
          ? (ev.photoAlbum ? `<a class="btn block" href="${esc(ev.photoAlbum)}" target="_blank" rel="noopener">${icon('photo', 18)}Album fotek</a>` : '')
          : (att ? attendButtons(ev, att) : '<div class="note">Načítám docházku…</div>')}
        <div class="hero-nav">
          <button data-hnav="-1" aria-label="Předchozí akce">‹ dřívější</button>
          ${sh !== 0 ? '<button data-hnav="0" class="home">nejbližší</button>' : '<span class="hint">swipem listuj</span>'}
          <button data-hnav="1" aria-label="Další akce">pozdější ›</button>
        </div>
      </div>
    </div>`;
  }

  // Akce na velké kartě podle posunu od nejbližší.
  function heroEvent(now) {
    const list = events.list;
    if (!list.length) return null;
    const next = nextEvent(now);
    let base = next ? list.indexOf(next) : list.length - 1;
    const idx = Math.max(0, Math.min(list.length - 1, base + shift));
    shift = idx - base;
    return list[idx];
  }

  // Akce, která by byla na kartě při posunu o delta (nebo null, když už další není).
  function neighbour(delta) {
    const list = events.list;
    const next = nextEvent(new Date());
    const base = next ? list.indexOf(next) : list.length - 1;
    const target = delta === 0 ? base : base + shift + delta;
    if (target < 0 || target >= list.length) return null;
    return { ev: list[target], sh: target - base };
  }

  function moveHero(delta) {
    const before = shift;
    shift = delta === 0 ? 0 : shift + delta;
    enterDir = delta === 0 ? (before > 0 ? 'right' : 'left') : (delta > 0 ? 'left' : 'right');
    draw();
    enterDir = '';
  }

  // Výsledky hledání napříč všemi akcemi (budoucí, probíhající i proběhlé).
  function drawSearch(now) {
    const all = events.list.filter(match);
    const up = all.filter((e) => !isPast(e, now));
    const past = all.filter((e) => isPast(e, now)).reverse();
    if (!all.length) { body.innerHTML = '<div class="empty">Nic nenalezeno.</div>'; return; }
    let html = '';
    if (up.length) html += `<div class="section-h">Nadcházející (${up.length})</div><div class="rows">${up.map((e) => row(e, false)).join('')}</div>`;
    if (past.length) {
      html += `<div class="section-h">Proběhlé (${past.length})</div>`;
      let lastY = null;
      for (const ev of past.slice(0, shown)) {
        const y = ev.start.getFullYear();
        if (y !== lastY) { html += `${lastY !== null ? '</div>' : ''}<div class="section-h" style="padding-top:8px">${y}</div><div class="rows">`; lastY = y; }
        html += row(ev, true);
      }
      if (lastY !== null) html += '</div>';
      if (past.length > shown) html += `<button class="btn dashed block" data-more>Zobrazit další (${past.length - shown})</button>`;
    }
    body.innerHTML = html;
    const more = body.querySelector('[data-more]');
    if (more) more.onclick = () => { shown += PAGE * 2; draw(); };
  }

  function draw() {
    if (!events.loaded) { body.innerHTML = spinner(); return; }
    if (events.error) {
      body.innerHTML = `<div class="empty">Akce se nepodařilo načíst.<br><span style="font-size:12px">${esc(events.error.code || events.error.message)}</span></div>`;
      return;
    }
    const now = new Date();
    root.querySelector('.seg').style.display = q.trim() ? 'none' : '';
    if (q.trim()) return drawSearch(now);
    if (tab === 'nadchazejici') {
      const up = events.list.filter((e) => !isPast(e, now) && match(e));
      if (!events.list.length) {
        body.innerHTML = `<div class="empty">Zatím tu nejsou žádné akce.<br>Správce je převezme z Google Kalendáře v záložce <a href="#/parta">Parta</a>.</div>`;
        return;
      }
      if (!up.length && !hero) { body.innerHTML = '<div class="empty">Žádná naplánovaná akce. Přidej nějakou!</div>'; return; }
      const hero = heroEvent(now);
      const next = nextEvent(now);
      const rest = next ? up.filter((e) => e.id !== next.id) : up;
      let html = hero ? `<div class="hero-wrap">${heroHtml(hero)}</div>` : '';
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
        heroUnsub = watchAttendance(hero, (a) => { if (heroId !== hero.id) return; heroAtt = a; const el = body.querySelector('.hero'); if (el) el.outerHTML = heroHtml(hero); bindHero(hero); });
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

  // Poloha karty na oblouku: posun do strany + natočení kolem bodu pod kartou.
  const arc = (x) => `translateX(${x}px) rotate(${x / 40}deg)`;

  function bindHero(ev) {
    const el = body.querySelector('.hero');
    const wrap = body.querySelector('.hero-wrap');
    if (!el || !wrap) return;
    let x0 = 0, y0 = 0, dx = 0, track = null, swiped = false, ghost = null, ghostDir = 0, busy = false;
    const W = () => wrap.offsetWidth + 24;

    // Karta, na kterou se přechází, přijíždí z opačné strany.
    function ensureGhost(dir) {
      if (ghostDir === dir && ghost) return ghost;
      if (ghost) ghost.remove();
      ghost = null; ghostDir = dir;
      const n = neighbour(dir);
      if (!n) return null;
      const box = document.createElement('div');
      box.className = 'hero-ghost';
      box.innerHTML = heroHtml(n.ev, cachedAttendance(n.ev.id), n.sh);
      wrap.appendChild(box);
      ghost = box;
      return ghost;
    }
    function place(x, animate) {
      const t = animate ? 'transform .28s ease-out, opacity .28s' : 'none';
      el.style.transition = t;
      el.style.transform = arc(x);
      if (ghost) {
        ghost.style.transition = t;
        ghost.style.transform = arc(x + ghostDir * W());
      }
    }
    // Dokončení přechodu: aktuální karta odjede, nová zapadne na místo.
    function finish(dir) {
      if (busy) return;
      if (!ensureGhost(dir)) { place(0, true); toast(dir > 0 ? 'Další akce už není.' : 'Starší akce už není.'); return; }
      busy = true;
      place(-dir * W(), true);
      ghost.style.transition = 'transform .28s ease-out';
      ghost.style.transform = arc(0);
      setTimeout(() => { shift += dir; enterDir = ''; draw(); }, 290);
    }
    el._finish = finish;

    el.addEventListener('touchstart', (e) => {
      if (busy) return;
      const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; track = null; swiped = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (busy) return;
      const t = e.touches[0];
      const ddx = t.clientX - x0, ddy = t.clientY - y0;
      if (track === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) track = Math.abs(ddx) > Math.abs(ddy);
      if (!track) return;
      dx = ddx;
      // swipe doprava = dřívější akce (přijíždí zleva), doleva = pozdější (zprava)
      const dir = dx > 0 ? -1 : 1;
      const g = ensureGhost(dir);
      place(g ? dx : dx * 0.35, false);
    }, { passive: true });
    el.addEventListener('touchend', () => {
      if (busy) return;
      if (track) {
        swiped = true;
        setTimeout(() => { swiped = false; }, 60);
        if (Math.abs(dx) > 70) { finish(dx > 0 ? -1 : 1); return; }
        place(0, true);
        setTimeout(() => { if (ghost && !busy) { ghost.remove(); ghost = null; ghostDir = 0; } }, 300);
      }
    });
    el.onclick = (e) => {
      if (swiped || busy) return;
      const nav = e.target.closest('[data-hnav]');
      if (nav) {
        const d = +nav.dataset.hnav;
        if (d === 0) { moveHero(0); return; }
        finish(d);
        return;
      }
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
