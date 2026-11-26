// Akce: Nadcházející / Proběhlé.
import { esc, icon, fmtWhen, relDays, fmtSpan, MONTHS_NOM, MONTHS_SHORT, DAYS_SHORT, fmtTime, fmtLongDate, looseName } from './util.js';
import { tabbar, faces, toast, spinner, topButton } from './ui.js';
import { namedayFor } from './namedays.js';
import { myName } from './auth.js';
import { prefetchEvent, neighboursOf, cachedLikes, loadLikes, watchLikes, toggleLike } from './store.js';
import { eventWeather, cachedWeather, tempRange } from './weather.js';
import { watchEvents, events, nextEvent, isLive, isPast, watchAttendance, loadAttendance, cachedAttendance } from './store.js';
import { changeAttendance, attendButtons } from './attend.js';

const PAGE = 60;
// Akce na velké kartě (když není nejbližší) — přežije otevření detailu a návrat zpět.
let keepHeroId = null;

export function render(root, { tab }) {
  let searchOpen = false, q = '', shown = PAGE;
  let heroAtt = null, heroUnsub = null, heroId = null, likeUnsub = null;
  let shift = 0;            // posun velké karty: 0 = nejbližší akce, -1 = předchozí, +1 = další
  let restoreId = keepHeroId; // po návratu z detailu: na kterou akci kartu vrátit
  let enterDir = '';         // směr animace po swipu
  let animating = false;     // přechod mezi kartami právě běží        // právě probíhá návrat na nejbližší (karta po kartě)
  const loading = new Set();

  const today = new Date();
  const nd = namedayFor(today);
  root.innerHTML = `<div class="screen">
    <div class="top">
      <div><div class="brand">KoKrŠNeK</div><div class="sub">${esc(DAYS_SHORT[today.getDay()] + ' ' + fmtLongDate(today).replace(/^\S+ /, ''))}${nd ? ' – ' + esc(nd) : ''}</div></div>
      <div class="icons">
        <a class="ibtn" href="#/kalendar" aria-label="Kalendář">${icon('calendarGrid')}</a>
        <a class="ibtn gearbtn" href="#/parta" aria-label="Parta a nastavení">${icon('gear')}</a>
      </div>
    </div>
    <div class="pullind" data-pull aria-hidden="true"><div class="pullpill">${icon('search', 18)}<span>Hledat akci nebo místo</span></div><div class="pulltxt" data-pulltxt>↓ Táhni dál</div></div>
    <div data-sbox class="sboxrow" style="display:none"><input class="input" type="search" placeholder="Hledat akci nebo místo" aria-label="Hledat"></div>
    <div class="scroll" data-body>${spinner()}</div>
    ${tabbar('akce')}
  </div>`;
  const body = root.querySelector('[data-body]');
  topButton(root.querySelector('.screen'), { aboveTabbar: true });   // po odscrollování šipka nahoru
  const sbox = root.querySelector('[data-sbox]');
  const sinput = sbox.querySelector('input');

  // Hledání: otevře se potažením obsahu dolů (když je stránka nahoře), zavře se
  // potažením karty zpět nahoru. Když je něco napsané a výsledků je víc než
  // na obrazovku, tah po výsledcích je posouvá a zavírá se tahem po řádku hledání. Karta zůstane na akci,
  // na které byla — bez hledaného textu se nic nepřekresluje.
  const setSearch = (open) => {
    searchOpen = open;
    sbox.style.display = open ? 'flex' : 'none';
    if (open) { sinput.focus(); return; }
    const had = !!q.trim();
    q = ''; sinput.value = ''; sinput.blur();
    if (had) draw();
  };
  // Zavření klávesnice (Hotovo / tah dolů po klávesnici) zavře i hledání, pokud v něm nic není.
  // S napsaným textem zůstane otevřené, ať jde procházet výsledky.
  sinput.addEventListener('blur', () => setTimeout(() => {
    if (searchOpen && !q.trim() && document.activeElement !== sinput) setSearch(false);
  }, 120));
  sinput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sinput.blur(); });
  const pull = root.querySelector('[data-pull]'), pullTxt = root.querySelector('[data-pulltxt]');
  const PULL = 70;
  let py0 = 0, px0 = 0, pd = 0, pAxis = null, pulling = false, closing = false;
  const atTop = () => (body.scrollTop || 0) <= 2 && (window.scrollY || 0) <= 2;   // 1 px posun = obejití chyby iOS (nav.js)
  body.addEventListener('touchstart', (e) => {
    pulling = false; closing = false; pAxis = null; pd = 0;
    if (e.touches.length !== 1) return;
    if (searchOpen) {
      // s klávesnicí iOS posouvá okno, proto se tady hlídá jen posun obsahu
      const scrollable = body.scrollHeight > body.clientHeight + 4;
      if ((body.scrollTop || 0) > 2 || (q.trim() && scrollable)) return;
      py0 = e.touches[0].clientY; px0 = e.touches[0].clientX; closing = true; return;
    }
    if (!atTop()) return;
    py0 = e.touches[0].clientY; px0 = e.touches[0].clientX; pulling = true;
  }, { passive: true });
  body.addEventListener('touchmove', (e) => {
    if (closing) {
      const dy = e.touches[0].clientY - py0, dx = e.touches[0].clientX - px0;
      if (dy < -8 && Math.abs(dy) > Math.abs(dx) && e.cancelable) e.preventDefault(); // stránka se při zavírání neposune
      if (dy < -45 && Math.abs(dy) > Math.abs(dx) * 1.3) { closing = false; setSearch(false); }
      else if (dy > 20 || Math.abs(dx) > 40) closing = false;
      return;
    }
    if (!pulling) return;
    const dy = e.touches[0].clientY - py0, dx = e.touches[0].clientX - px0;
    if (!pAxis) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      pAxis = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.3 ? 'down' : 'no';
      if (pAxis === 'no') { pulling = false; return; }
    }
    if (e.cancelable) e.preventDefault();
    pd = Math.max(0, dy) * 0.55;
    pull.style.transition = 'none';
    pull.style.height = Math.min(pd, 110) + 'px';
    pull.classList.toggle('ready', pd >= PULL);
    pullTxt.textContent = pd >= PULL ? '↓ Pusť pro hledání' : '↓ Táhni dál';
  }, { passive: false });
  const pullEnd = () => {
    closing = false;
    if (!pulling) return;
    pulling = false;
    pull.style.transition = '';
    pull.style.height = '0px';
    pull.classList.remove('ready');
    if (pAxis === 'down' && pd >= PULL) setSearch(true);
  };
  body.addEventListener('touchend', pullEnd);
  // Tah nahoru přímo po řádku hledání zavře vždycky (i s textem a dlouhými výsledky).
  let sy0 = null;
  sbox.addEventListener('touchstart', (e) => { sy0 = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  sbox.addEventListener('touchmove', (e) => {
    if (sy0 == null) return;
    const dy = e.touches[0].clientY - sy0;
    if (dy < -8 && e.cancelable) e.preventDefault();
    if (dy < -30) { sy0 = null; setSearch(false); }
  }, { passive: false });
  body.addEventListener('touchcancel', pullEnd);
  // Počítač: kolečkem myši nahoru na začátku stránky, nebo klávesou „/“.
  let wheelAcc = 0, wheelT = 0;
  body.addEventListener('wheel', (e) => {
    if (searchOpen || !atTop() || e.deltaY >= 0) { wheelAcc = 0; return; }
    if (Date.now() - wheelT > 400) wheelAcc = 0;
    wheelT = Date.now(); wheelAcc -= e.deltaY;
    if (wheelAcc > 160) { wheelAcc = 0; setSearch(true); }
  }, { passive: true });
  const onKey = (e) => { if (e.key === '/' && !searchOpen && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) { e.preventDefault(); setSearch(true); } };
  document.addEventListener('keydown', onKey);
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
      <div class="r">${past ? (ev.photoAlbum ? icon('photo', 18) : '') : pill(ev) || esc(relDays(ev.start))}${past ? '' : `<span class="rowlike" data-rl="${esc(ev.id)}">${likeTxt(ev)}</span>`}</div>
    </a>`;
  function likeTxt(ev) { const l = cachedLikes(ev.id); return l && l.length ? '❤️ ' + l.length : ''; }

  function wxChips(ev) {
    const w = cachedWeather(ev);
    if (!w || w.past) return '';
    return `<span class="wxchip">${w.icon} ${tempRange(w)}</span>${w.prob != null && w.prob >= 10 ? `<span class="wxchip">💧 ${w.prob} %</span>` : ''}`;
  }
  function likeBtn(ev) {
    const l = cachedLikes(ev.id) || [];
    const on = l.includes(myName());
    return `<button class="likebtn${on ? ' on' : ''}" data-like aria-label="${on ? 'Zrušit lajk' : 'Líbí se mi'}">${on ? '❤️' : '🤍'} ${l.length}</button>`;
  }
  // Počasí a lajky dorazí později — doplní se do karty, která ještě patří té akci.
  function fillHero(ev) {
    const upd = () => {
      const el = body.querySelector(`.hero[data-open="${CSS.escape(ev.id)}"]`);
      if (!el) return;
      const wx = el.querySelector('[data-hwx]'); if (wx) wx.innerHTML = wxChips(ev);
      const lb = el.querySelector('[data-like]'); if (lb) lb.outerHTML = likeBtn(ev);
    };
    eventWeather(ev).then(upd);
    if (likeUnsub) likeUnsub();
    likeUnsub = watchLikes(ev, upd);
  }

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
        ${past ? '' : `<div class="wxchips" data-hwx>${wxChips(ev)}</div>`}
        ${ev.place ? `<div class="meta">${icon('pin', 16)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ev.place)}</span></div>` : ''}
      </div>
      ${past ? '' : `<div class="progress ${live ? 'live' : ''}"><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="lbl"><span>${esc(left)}</span><span>${att ? `jde <b>${going.length}</b>` : ''}</span></div></div>`}
      <div style="display:flex;align-items:center;gap:10px;min-height:36px">${going.length ? `${faces(going)}<span class="sub" style="margin:0;min-width:0">${past ? `${going.includes(me) ? 'Byl jsi tam' : 'Bez tebe'} · ${going.length} ${going.length === 1 ? 'účastník' : going.length < 5 ? 'účastníci' : 'účastníků'}` : going.includes(me) ? 'Ty a další' : 'Zatím bez tebe'}</span>` : ''}${likeBtn(ev)}</div>
      <div data-nodetail>
        ${past
          ? (ev.photoAlbum ? `<a class="btn block" href="${esc(ev.photoAlbum)}" target="_blank" rel="noopener">${icon('photo', 18)}Album fotek</a>` : '')
          : (att ? attendButtons(ev, att) : '<div class="note">Načítám docházku…</div>')}
        <div class="hero-nav">
          <button data-hnav="-1" aria-label="Předchozí akce">‹ dřívější</button>
          ${sh !== 0 ? '<button data-hnav="0" class="home">nejbližší</button>' : '<span></span>'}
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
    if (restoreId && events.loaded) {
      const i = list.findIndex((e) => e.id === restoreId);
      if (i >= 0) shift = i - base;
      restoreId = null;
    }
    const idx = Math.max(0, Math.min(list.length - 1, base + shift));
    shift = idx - base;
    keepHeroId = shift === 0 ? null : list[idx].id;
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
      if (hero) {
        bindHero(hero);
        fillHero(hero);
        neighboursOf(hero, 2).forEach((n) => { eventWeather(n); loadLikes(n); });
        // Sousední karty (±2) načíst předem, ať se při swipu ukážou kompletní.
        neighboursOf(hero, 2).forEach((n) => { if (cachedAttendance(n.id) || loading.has(n.id)) return; loading.add(n.id); loadAttendance(n).catch(() => {}); });
      }
      // Docházka u dalších nadcházejících akcí (kvůli štítku Jdu/Nejdu).
      rest.slice(0, 15).forEach((ev) => {
        if (!cachedLikes(ev.id)) loadLikes(ev).then(() => { const x = body.querySelector(`[data-rl="${CSS.escape(ev.id)}"]`); if (x) x.textContent = likeTxt(ev); });
      });
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
    function ensureGhost(dir, steps = dir) {
      if (ghostDir === dir && ghost && ghost._steps === steps) return ghost;
      if (ghost) ghost.remove();
      ghost = null; ghostDir = dir;
      const n = neighbour(steps);
      if (!n) return null;
      const box = document.createElement('div');
      box.className = 'hero-ghost';
      box.innerHTML = heroHtml(n.ev, cachedAttendance(n.ev.id), n.sh);
      box._steps = steps;
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
    function finish(dir, steps = dir, fast = false) {
      if (busy || animating) return;
      if (!ensureGhost(dir, steps)) { place(0, true); toast(dir > 0 ? 'Další akce už není.' : 'Starší akce už není.'); return; }
      busy = true; animating = true;
      // Při klepnutí na „dřívější/pozdější“ (bez tažení) nová karta ještě nestojí
      // vedle — postavit ji na oblouk mimo obrazovku, ať přijede stejně jako při swipu.
      if (!ghost.style.transform) {
        ghost.style.transition = 'none';
        ghost.style.transform = arc(dir * W());
        void ghost.offsetWidth;
      }
      const ms = fast ? 170 : (Math.abs(parseFloat((el.style.transform.match(/-?[\d.]+/) || [0])[0])) < 1 ? 420 : 280);
      el.style.transition = `transform ${ms}ms ease-out`;
      el.style.transform = arc(-dir * W());
      ghost.style.transition = `transform ${ms}ms ease-out`;
      ghost.style.transform = arc(0);
      setTimeout(() => { shift += steps; enterDir = ''; animating = false; draw(); }, ms + 10);
    }
    // Návrat na nejbližší akci jedním plynulým pohybem: všechny karty mezi
    // aktuální a nejbližší stojí vedle sebe na oblouku a celý pás se protočí
    // najednou (bez překreslování mezi kroky). U dlouhého skoku se ukážou jen
    // první dvě a poslední tři karty.
    el._home = () => {
      if (shift === 0 || busy || animating) return false;
      busy = true; animating = true;
      if (ghost) { ghost.remove(); ghost = null; ghostDir = 0; }
      const d = shift > 0 ? -1 : 1;
      const n = Math.abs(shift);
      const ks = n <= 6 ? Array.from({ length: n }, (_, i) => i + 1) : [1, 2, n - 2, n - 1, n];
      const m = ks.length, w = W();
      const boxes = ks.map((k, i) => {
        const nb = neighbour(d * k);
        const box = document.createElement('div');
        box.className = 'hero-ghost';
        box.innerHTML = nb ? heroHtml(nb.ev, cachedAttendance(nb.ev.id), nb.sh) : '';
        box.style.transition = 'none';
        box.style.transform = arc((i + 1) * d * w);
        wrap.appendChild(box);
        return { box, p: i + 1 };
      });
      el.style.transition = 'none';
      void wrap.offsetWidth;
      const T = Math.min(320 + 120 * m, 1000);
      const ease = `transform ${T}ms cubic-bezier(.45,0,.2,1)`;
      el.style.transition = ease;
      el.style.transform = arc(-d * m * w);
      boxes.forEach(({ box, p }) => { box.style.transition = ease; box.style.transform = arc((p - m) * d * w); });
      setTimeout(() => { shift = 0; animating = false; enterDir = ''; draw(); }, T + 20);
      return true;
    };

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
        if (d === 0) { el._home(); return; }
        finish(d);
        return;
      }
      const b = e.target.closest('[data-att]');
      if (b) { changeAttendance(ev, b.dataset.att, heroAtt); return; }
      const lk = e.target.closest('[data-like]');
      if (lk) { toggleLike(ev).catch(() => toast('Lajk se nepodařilo uložit.')); lk.outerHTML = likeBtn(ev); return; }
      if (e.target.closest('[data-nodetail]')) return;
      location.hash = '#/akce/' + encodeURIComponent(ev.id);
    };
  }

  // Klepnutí na „Akce“ ve spodní liště: zavřít hledání a vrátit kartu na nejbližší akci.
  // Reaguje už na dotyk (touchend) — iPhone první klepnutí po posouvání stránky
  // jako „click“ nepošle, takže by to jinak fungovalo až napodruhé.
  const akceTab = root.querySelector('.tabbar a[href="#/akce"]');
  let tabTouched = 0;
  const goHome = () => {
    if (searchOpen) setSearch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const el = body.querySelector('.hero');
    if (el && el._home) el._home();
  };
  akceTab.addEventListener('touchend', (e) => { e.preventDefault(); tabTouched = Date.now(); goHome(); }, { passive: false });
  akceTab.addEventListener('click', (e) => { e.preventDefault(); if (Date.now() - tabTouched > 600) goHome(); });

  const unsub = watchEvents(draw);
  const tick = setInterval(draw, 60000);
  return () => { unsub(); clearInterval(tick); if (heroUnsub) heroUnsub(); if (likeUnsub) likeUnsub(); document.removeEventListener('keydown', onKey); };
}
