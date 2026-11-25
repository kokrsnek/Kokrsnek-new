// Detail akce: informace, docházka, co přinést, album, soubory, komentáře.
import { esc, icon, mapUrl, fmtWhen, fmtLongDate, fmtTime, sameDay, relDays, fmtStamp } from './util.js';
import { avatar, toast, confirmDanger, spinner, choose, faces } from './ui.js';
import { myName, isAdmin } from './auth.js';
import {
  watchEvents, findEvent, events, isPast, canWrite, watchAttendance, watchComments, addComment,
  deleteComment, watchItems, addItem, toggleItem, loadAlbum, icsFor, shareIcs, prefetchEvent, neighboursOf, cachedAlbum,
  cachedAttendance, cachedComments, cachedItems,
  cachedCover, loadCover, setCover, removeCover, shrinkPhoto, watchLikes, cachedLikes, toggleLike, reactComment, saveAttendees, watchEventCheckins, toggleEventCheckin, deleteItem
} from './store.js';
import { geocode } from './map.js';
import { showPayment, showReceipt, editExpenses, loadExpenses } from './expenses.js';
import { PARTY_NAMES, LIVE, nameLabel } from './config.js';
import { emo, sortedReactions, emojiSheet, onLongPress } from './emoji.js';
import { eventWeather, cachedWeather, hourColumns, wxIcon as wxIconOf, tempRange } from './weather.js';
import { plural } from './util.js';
import { changeAttendance, attendButtons } from './attend.js';
import { albumFlow, canAddAlbum } from './plus.js';
import { showMap, prefetchMap } from './map.js';
import { coverArt } from './coverart.js';

const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.length > 40 ? u.slice(0, 38) + '…' : u}</a>`).replace(/\n/g, '<br>');

// Popis akce bez odkazů na Google Fotky — album má vlastní řádek nahoře.
function descText(ev) {
  return String(ev.description || '')
    .replace(/https?:\/\/(?:photos\.app\.goo\.gl|photos\.google\.com)\/\S+/g, '')
    .replace(/^[^\n:]{0,30}:[ \t]*$/gm, '')   // osiřelý popisek typu „Fotky:“
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Směr, odkud přijíždí další otevřená akce po swipu (1 = zprava, -1 = zleva).
let enterFrom = 0;

export function render(root, { id }) {
  let page = null, started = false;
  root.innerHTML = `<div class="screen">${spinner()}</div>`;
  const unsubEv = watchEvents(() => {
    const found = findEvent(id);
    if (!found) {
      if (events.loaded) root.innerHTML = `<div class="screen"><div class="top"><a class="ibtn" href="#/akce" aria-label="Zpět">${icon('back')}</a></div><div class="empty">Tahle akce neexistuje nebo byla smazána.</div></div>`;
      return;
    }
    if (!started) { started = true; page = mountDetail(root, found, true); }
    else page.update(found);
  });
  return () => { unsubEv(); if (page) page.cleanup(); };
}

// Vykreslí celou stránku akce do host. live = skutečná stránka (sledování dat,
// tlačítka, swipe); jinak náhled pro swipe z předem načtených dat.
function mountDetail(host, ev, live) {
  let att = null, comments = null, items = null, album = null;
  const unsubs = [];

  function shell() {
    const past = isPast(ev);
    const ro = !canWrite(ev);
    // Správce upravuje všechny akce (i převzaté z Google Kalendáře).
    const mine = (ev.isTest && ev.createdBy === myName()) || isAdmin();
    const enterCls = live && enterFrom ? (enterFrom > 0 ? ' det-in-r' : ' det-in-l') : '';
    if (live) enterFrom = 0;
    host.innerHTML = `<div class="screen${enterCls}" style="padding-top:0">
      <div class="cover" data-cover>
        <a class="ibtn l" href="#/akce" aria-label="Zpět">${icon('back')}</a>
        <div class="rr">
          <button class="ibtn" data-share aria-label="Sdílet">${icon('share')}</button>
          ${mine ? `<a class="ibtn" href="#/upravit/${encodeURIComponent(ev.id)}" aria-label="Upravit">${icon('edit')}</a>` : ''}
        </div>
        ${coverArt(ev)}
        <img class="coverimg" data-coverimg alt="" hidden>
        <span data-covertext>${icon('calendar', 44, 1.5)}</span>
        ${live ? `<button class="ibtn coverbtn" data-coverbtn aria-label="Fotka v hlavičce">${icon('photo', 20)}</button><input type="file" accept="image/*" data-coverfile hidden>` : ''}
        <img class="coverlogo" src="logo-badge.png" alt="">
      </div>
      <div class="scroll" style="padding-top:18px">
        <div class="eyebrow ${past ? '' : 'live'}" style="color:${past ? 'var(--muted)' : ''}">${past ? 'Proběhlo · ' + esc(relDays(ev.start)) : esc(relDays(ev.start))}${ev.isTest ? ' · testovací akce' : ''}</div>
        <h1 class="title" style="margin:6px 0 14px">${esc(ev.title)}</h1>
        <div class="info">
          <div>${icon('calendar')}<div class="k"><b>${esc(fmtLongDate(ev.start))}${ev.start.getFullYear() !== new Date().getFullYear() ? ' ' + ev.start.getFullYear() : ''}</b><span>${esc(whenLine(ev))}</span></div>${past ? '' : '<button class="link" data-ics>Do kalendáře</button>'}</div>
          ${ev.place ? `<div data-placerow>${icon('pin')}<div class="k"><b>${esc(ev.place)}</b></div><a href="${esc(mapUrl(ev.place))}" target="_blank" rel="noopener">Navigovat</a></div>` : ''}
          <div data-albumrow style="display:none"></div>
          ${(ev.driveFiles || []).map((f) => `<a class="rowlink" href="${esc(f.url)}" target="_blank" rel="noopener">${icon('file')}<div class="k"><b>${esc(f.title)}</b></div>${icon('next', 18)}</a>`).join('')}
        </div>
        <div data-wx></div>
        <div data-likes></div>
        ${past ? `<div class="two moneyrow" data-money style="margin-top:12px"><button class="btn" data-pay>${icon('wallet', 20)}<span>Příspěvek</span></button><button class="btn" data-exp hidden>${icon('receipt', 20)}<span>Náklady</span></button></div>` : ''}
        ${descText(ev) ? `<div class="card" style="margin-top:12px;padding:14px;font-size:14px;line-height:1.5;color:var(--ink2);overflow-wrap:anywhere">${linkify(descText(ev))}</div>` : ''}

        <div data-mapbox></div>

        <div data-oncheck></div>
        <div data-attsec>
          <div class="h2"><span>${past ? 'Zúčastnili se' : 'Kdo jde'}</span><span style="display:flex;align-items:center;gap:10px"><span class="sub" data-attcount></span>${past && isAdmin() ? '<button class="link" data-attedit>Upravit</button>' : ''}</span></div>
          <div data-att>${spinner()}</div>
        </div>

        <div data-itemsec>
          <div class="h2"><span>${past ? 'Přinesli' : 'Co přinést'}</span><span class="sub" data-itemcount></span></div>
          <div data-items>${spinner()}</div>
        </div>

        <div class="h2"><span>Komentáře</span><span class="sub" data-comcount></span></div>
        <div data-coms>${spinner()}</div>
        ${`<form class="inrow" data-comform style="margin-top:6px">
          <input class="input" name="t" placeholder="Napiš komentář" aria-label="Komentář" autocomplete="off" maxlength="2000">
          <button class="ibtn" style="background:var(--accent);border:none;color:var(--on-accent);width:48px;height:48px" aria-label="Odeslat">${icon('next', 22, 2.4)}</button>
        </form>`}
      </div>
    </div>`;

    const ca = cachedAlbum(ev);
    if (ca !== undefined) { album = ca; drawAlbum(); }
    const cc = cachedCover(ev.id);
    if (cc) drawCover(cc);
    if (live) loadCover(ev.id).then((img) => drawCover(img));
    // Mapa: když se ukáže, název místa je přímo v ní — řádek s místem se schová.
    const mapDone = ev.place ? showMap(host.querySelector('[data-mapbox]'), ev.place, mapUrl(ev.place)).then((ok) => {
      const pr = host.querySelector('[data-placerow]');
      if (ok && pr) pr.remove();
    }) : Promise.resolve();
    // Skutečná stránka dá vědět, až je hotová (mapa, logo, fotka) — do té doby
    // nad ní leží náhled, který přijel swipem, aby nic neproblikávalo.
    if (live) {
      const imgs = [...host.querySelectorAll('.coverlogo, [data-coverimg]:not([hidden])')].map((i) => i.decode ? i.decode().catch(() => {}) : null);
      Promise.all([mapDone, ...imgs]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.dispatchEvent(new Event('detail-ready')))));
    }

    // Náhled (při swipu): jen vykreslit z předem načtených dat, bez sledování a tlačítek.
    if (!live) {
      const a = cachedAttendance(ev.id); if (a) { att = a; drawAtt(); }
      const c = cachedComments(ev.id); if (c) { comments = c; drawComs(); }
      const it = cachedItems(ev.id); if (it) { items = it; drawItems(); }
      drawWx(cachedWeather(ev)); drawLikes(cachedLikes(ev.id));
      return;
    }
    drawWx(cachedWeather(ev));
    eventWeather(ev).then(drawWx);
    unsubs.push(watchLikes(ev, drawLikes));
    // „Jsem na místě“ — jen v den akce (nebo když právě probíhá).
    const now0 = new Date();
    if (!isPast(ev) && (sameDay(ev.start, now0) || (ev.start <= now0 && now0 < ev.end))) {
      const box = host.querySelector('[data-oncheck]');
      let list = [];
      const drawOn = () => {
        const mine = list.find((c) => c.name === myName());
        box.innerHTML = `<div class="card oncheck" style="margin-top:14px">
          <button class="btn big block ${mine ? 'yes' : ''}" data-on>${mine ? '✓ Jsem na místě' : icon('pin', 18) + 'Jsem na místě'}</button>
          ${mine && mine.verified ? '<div class="sub" style="text-align:center;margin-top:6px">📍 ověřeno polohou</div>' : ''}
          ${list.length ? `<div class="sub" style="margin:12px 0 6px">Kdo je na místě</div><div class="chips">${list.map((c) => `<span class="chip" data-profile="${esc(c.name)}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(c.name, 22)}${esc(c.name)}${c.verified ? ' 📍' : ''}</span>`).join('')}</div>` : ''}
        </div>`;
        box.querySelector('[data-on]').onclick = async (e) => {
          e.currentTarget.disabled = true;
          const coords = ev.place ? await geocode(ev.place).catch(() => null) : null;
          try { await toggleEventCheckin(ev, !!mine, coords); } catch (x) { toast('Nepovedlo se uložit.'); }
        };
      };
      drawOn();
      unsubs.push(watchEventCheckins(ev, (l) => { list = l; drawOn(); }));
    }
    // Příspěvek (QR) a Náklady akce — u proběhlých akcí.
    const payB = host.querySelector('[data-pay]');
    if (payB) {
      payB.onclick = () => showPayment(ev);
      const expB = host.querySelector('[data-exp]');
      let exp = null;
      const upd = () => { expB.hidden = !(exp || isAdmin());  };
      loadExpenses(ev).then((d) => { exp = d; upd(); });
      expB.onclick = () => (exp ? showReceipt(ev, exp, (d) => { exp = d; upd(); }) : editExpenses(ev, null, (d) => { exp = d; upd(); }));
    }
    // Dodatečná oprava docházky po akci (správce).
    const ae = host.querySelector('[data-attedit]');
    if (ae) ae.onclick = () => editAttendees();
    // Komentáře: dlouhé podržení → emoji reakce (a kopírování); klepnutí na bublinku reakce ji přepne.
    const comBox = host.querySelector('[data-coms]');
    const findCom = (el) => (comments || []).find((x) => x.id === el.closest('[data-cid]')?.dataset.cid);
    comBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-creact]');
      if (!b) return;
      const c = findCom(b);
      if (c) reactComment(ev, c, b.dataset.creact).catch(() => toast('Reakci se nepodařilo uložit.'));
    });
    onLongPress(comBox, '.com[data-cid]', async (el) => {
      const c = findCom(el);
      if (!c) return;
      const me = myName();
      const selected = sortedReactions(c.reactions).filter(([, l]) => l.includes(me)).map(([k]) => k);
      const r = await emojiSheet({ selected, actions: c.text ? [{ id: 'copy', label: 'Kopírovat text' }] : [] });
      if (!r) return;
      if (r.emoji) reactComment(ev, c, r.emoji).catch(() => toast('Reakci se nepodařilo uložit.'));
      else if (r.action === 'copy') { try { await navigator.clipboard.writeText(c.text); toast('Zkopírováno'); } catch (x) { /* nic */ } }
    });
    host.querySelector('[data-likes]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-like]');
      if (!b) return;
      toggleLike(ev).catch(() => toast('Lajk se nepodařilo uložit.'));
      drawLikes(cachedLikes(ev.id));
    });

    // Fotka v hlavičce: vybrat / změnit / odebrat.
    const cbtn = host.querySelector('[data-coverbtn]');
    const cfile = host.querySelector('[data-coverfile]');
    cfile.onchange = async () => {
      const f = cfile.files && cfile.files[0];
      cfile.value = '';
      if (!f) return;
      try {
        toast('Nahrávám fotku…');
        const img = await shrinkPhoto(f);
        drawCover(img);
        await setCover(ev.id, img);
        toast('Fotka uložena');
      } catch (x) {
        console.error(x);
        drawCover(cachedCover(ev.id) || '');
        toast('Fotku se nepodařilo uložit.');
      }
    };
    cbtn.onclick = async () => {
      if (!cachedCover(ev.id)) { cfile.click(); return; }
      const v = await choose({ title: 'Fotka v hlavičce', buttons: [
        { label: 'Vybrat jinou fotku', value: 'new', kind: 'primary' },
        { label: 'Odebrat fotku', value: 'del', kind: 'no' },
        { label: 'Zrušit', value: null, kind: 'dashed' }] });
      if (v === 'new') cfile.click();
      if (v === 'del') {
        try { await removeCover(ev.id); drawCover(''); toast('Fotka odebrána'); } catch (x) { toast('Nepovedlo se.'); }
      }
    };

    const icsBtn = host.querySelector('[data-ics]');
    if (icsBtn) icsBtn.onclick = () => {
      shareIcs(icsFor(ev), (ev.title || 'akce').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) + '.ics', ev.title);
    };
    host.querySelector('[data-share]').onclick = async () => {
      const text = `${ev.title}\n${fmtWhen(ev)}${ev.place ? '\n' + ev.place : ''}`;
      try {
        if (navigator.share) await navigator.share({ title: ev.title, text });
        else { await navigator.clipboard.writeText(text); toast('Zkopírováno'); }
      } catch (e) { /* sdílení zavřeno */ }
    };
    const form = host.querySelector('[data-comform]');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const t = form.t.value.trim();
      if (!t) return;
      form.t.value = '';
      try { await addComment(ev, t); } catch (ex) { form.t.value = t; toast('Komentář se nepodařilo odeslat.'); }
    };

    bindSwipe();
    loadAlbum(ev).then((u) => { if (u !== album) { album = u; drawAlbum(); } });
    // Dvě akce zpět a dvě dopředu načíst předem.
    setTimeout(() => neighboursOf(ev, 2).forEach((n) => { prefetchEvent(n); prefetchMap(n.place); }), 400);
    unsubs.push(watchAttendance(ev, (a) => { att = a; drawAtt(); }));
    unsubs.push(watchComments(ev, (c) => { comments = c; drawComs(); }));
    unsubs.push(watchItems(ev, (i) => { items = i; drawItems(); }));
  }

  function whenLine(e) {
    if (e.allDay) return fmtWhen(e).split(' · ')[1] === 'celý den' ? 'celý den' : fmtWhen(e);
    if (sameDay(e.start, e.end)) return `${fmtTime(e.start)}${e.end > e.start ? ' – ' + fmtTime(e.end) : ''}`;
    return fmtWhen(e);
  }

  function drawCover(img) {
    const el = host.querySelector('[data-coverimg]');
    const cov = host.querySelector('[data-cover]');
    if (!el || !cov) return;
    cov.classList.toggle('hasphoto', !!img);
    if (img) { el.src = img; el.hidden = false; } else { el.hidden = true; el.removeAttribute('src'); }
  }

  function drawAlbum() {
    const row = host.querySelector('[data-albumrow]');
    if (!row) return;
    if (!album) {
      if (!canAddAlbum(ev) || ev.start > new Date()) return;
      row.style.display = '';
      row.innerHTML = `${icon('photo')}<div class="k"><b>Album fotek</b><span>zatím není</span></div><button class="link" data-addalbum>Přidat album</button>`;
      row.querySelector('[data-addalbum]').onclick = () => albumFlow(ev);
      return;
    }
    // Album se otevírá klepnutím na obrázek nahoře (celá plocha), řádek v seznamu není potřeba.
    row.style.display = 'none';
    const ct = host.querySelector('[data-covertext]');
    if (ct) ct.innerHTML = `<a class="coverlink" href="${esc(album)}" target="_blank" rel="noopener"><span class="coveric">${icon('photo', 40, 1.5)}</span><span class="coverlbl">Otevřít album</span></a>`;
  }

  // Počasí: u proběhlé akce řádek „Počasí bylo…“, jinak karta po hodinách.
  function drawWx(w) {
    const box = host.querySelector('[data-wx]');
    if (!box || !w) return;
    host.querySelectorAll('[data-wxrow]').forEach((x) => x.remove());
    const range = tempRange(w);
    if (w.past) {
      box.innerHTML = '';
      host.querySelector('.info')?.insertAdjacentHTML('beforeend', `<div data-wxrow><span class="wxic">${w.icon}</span><div class="k"><b>Počasí bylo ${range}</b><span>${w.mm > 0 ? String(w.mm).replace('.', ',') + ' mm srážek' : 'bez srážek'} · ${esc(w.desc.toLowerCase())}</span></div></div>`);
      return;
    }
    const parts = ev.place.split(',').map((x) => x.trim()).filter(Boolean);
    const where = parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
    box.innerHTML = `<div class="wxcard">
      <div class="hd"><div style="min-width:0"><div class="lbl">POČASÍ NA AKCI${where ? ' · ' + esc(where.toUpperCase()) : ''}</div><div class="desc">${esc(w.desc)}</div></div><div class="big">${w.startIcon} ${w.now < 0 ? '−' + Math.abs(w.now) : w.now}°</div></div>
      <div class="wxhours" style="grid-template-columns:repeat(${hourColumns(w, 8).length},1fr)">${hourColumns(w, 8).map((h) => `<div><span>${h.h}</span><span class="e">${h.code != null ? wxIconOf(h.code) : ''}</span><b>${h.t < 0 ? '−' + Math.abs(h.t) : h.t}°</b><span class="p">${h.p != null && h.p >= 10 ? h.p + ' %' : '&nbsp;'}</span></div>`).join('')}</div>
    </div>`;
  }

  function drawLikes(list) {
    const box = host.querySelector('[data-likes]');
    if (!box) return;
    const l = list || [];
    const on = l.includes(myName());
    const n = l.length;
    const past = isPast(ev);
    const title = n ? (past ? `Líbilo se ${n} ${plural(n, 'člověku', 'lidem', 'lidem')}` : `${n} ${plural(n, 'člověku', 'lidem', 'lidem')} se akce líbí`) : 'Zatím bez lajku';
    const others = l.filter((x) => x !== myName());
    const who = n ? (on ? ['ty', ...others] : others) : [];
    const sub = who.length ? who.slice(0, 3).join(', ') + (who.length > 3 ? ` a další ${who.length - 3}` : '') : 'Dej srdíčko jako první';
    box.innerHTML = `<div class="likesec">
      <div class="lbig${on ? ' on' : ''}">${on ? '❤️' : '🤍'}</div>
      <div class="tx"><b>${esc(title)}</b>${n > 3 ? `<div style="margin-top:5px">${faces(l, 6)}</div>` : `<span>${esc(sub)}</span>`}</div>
      <button class="likebtn${on ? ' on' : ''}" data-like>${on ? '❤️ Líbí se mi' : '🤍 Líbí se mi'}</button>
    </div>`;
  }

  async function editAttendees() {
    const before = att ? [...att.going] : [];
    const names = [...new Set([...PARTY_NAMES, ...before])].sort((a, b) => a.localeCompare(b, 'cs'));
    const sel = new Set(before);
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    const draw = () => {
      bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
        <h3>Kdo se opravdu zúčastnil</h3>
        <div class="chips" style="max-height:46vh;overflow:auto;margin-bottom:12px">${names.map((n) => `<button class="chip ${sel.has(n) ? 'on' : ''}" data-n="${esc(n)}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px;${sel.has(n) ? 'background:var(--accent-soft);border-color:var(--accent-hi);color:var(--accent-text)' : ''}">${avatar(n, 22)}${esc(nameLabel(n))}${sel.has(n) ? ' ✓' : ''}</button>`).join('')}</div>
        <form class="inrow" data-add style="margin-bottom:12px"><input class="input" name="n" placeholder="Přidat jméno…" maxlength="40" autocomplete="off"><button class="ibtn" aria-label="Přidat">${icon('plus')}</button></form>
        <div style="display:flex;flex-direction:column;gap:10px"><button class="btn primary big block" data-save>Uložit (${sel.size})</button><button class="btn block" data-x>Zrušit</button></div>
      </div>`;
    };
    draw();
    bd.addEventListener('click', async (e) => {
      if (e.target === bd || e.target.closest('[data-x]')) return bd.remove();
      const c = e.target.closest('[data-n]');
      if (c) { const n = c.dataset.n; sel.has(n) ? sel.delete(n) : sel.add(n); draw(); return; }
      if (e.target.closest('[data-save]')) {
        try { await saveAttendees(ev, [...sel], before); bd.remove(); toast('Docházka uložena'); } catch (x) { toast('Nepovedlo se uložit.'); }
      }
    });
    bd.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = e.target.n.value.trim();
      if (n) { if (!names.includes(n)) names.push(n); sel.add(n); draw(); }
    });
    document.body.appendChild(bd);
  }

  function drawAtt() {
    const el = host.querySelector('[data-att]');
    if (!el) return;
    const past = isPast(ev);
    if (past) {
      host.querySelector('[data-attsec]').style.display = att.going.length || isAdmin() ? '' : 'none';
      host.querySelector('[data-attcount]').textContent = att.going.length ? String(att.going.length) : '';
      el.innerHTML = `<div class="chips">${att.going.map((n) => `<span class="chip" data-profile="${esc(n)}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(n, 22)}${esc(n)}</span>`).join('')}</div>`;
      return;
    }
    host.querySelector('[data-attcount]').textContent = att.going.length ? `${att.going.length} ${att.going.length === 1 ? 'jde' : (att.going.length < 5 ? 'jdou' : 'jde')}` : '';
    el.innerHTML = `
      ${att.going.length ? `<div class="chips">${att.going.map((n) => `<span class="chip" data-profile="${esc(n)}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(n, 22)}${esc(n)}</span>`).join('')}</div>` : '<div class="sub">Zatím nikdo.</div>'}
      ${att.declined.length ? `<div class="sub" style="margin:10px 0 6px">Nejdou</div><div class="chips">${att.declined.map((n) => `<span class="chip dash" data-profile="${esc(n)}">${esc(n)}</span>`).join('')}</div>` : ''}
      ${past ? '' : `<div style="margin-top:14px">${attendButtons(ev, att)}</div>`}`;
    el.querySelectorAll('[data-att]').forEach((b) => { b.onclick = () => changeAttendance(ev, b.dataset.att, att); });
  }

  function drawItems() {
    const el = host.querySelector('[data-items]');
    if (!el) return;
    const me = myName();
    const ro = !canWrite(ev);
    if (isPast(ev)) {
      const brought = items.filter((i) => i.takenBy);
      host.querySelector('[data-itemsec]').style.display = brought.length ? '' : 'none';
      host.querySelector('[data-itemcount]').textContent = '';
      el.innerHTML = `<div class="list">${brought.map((it) => `<div><span style="min-width:0;overflow-wrap:anywhere">${esc(it.name)}</span><span style="display:inline-flex;align-items:center;gap:6px;color:var(--ink2);font-size:14px;flex:0 0 auto">${avatar(it.takenBy, 22)}${esc(it.takenBy)}</span></div>`).join('')}</div>`;
      return;
    }
    host.querySelector('[data-itemcount]').textContent = items.length ? `${items.filter((i) => i.takenBy).length}/${items.length} zajištěno` : '';
    el.innerHTML = `${items.length ? `<div class="list">${items.map((it) => `<div>
        <span style="min-width:0;overflow-wrap:anywhere">${esc(it.name)}</span>
        ${it.takenBy
          ? `<button class="pill ${it.takenBy === me ? 'go' : ''}" data-item="${esc(it.id)}" style="background:transparent;border:1px solid var(--line2);color:var(--ink2);${it.takenBy === me ? 'border-color:var(--accent-hi);color:var(--accent-text)' : ''}" ${ro || it.takenBy !== me ? 'disabled' : ''}>${esc(it.takenBy)}</button>`
          : `<span style="display:inline-flex;gap:6px;align-items:center">${it.addedBy === me || isAdmin() ? `<button class="pill" data-itemdel="${esc(it.id)}" aria-label="Smazat" style="background:transparent;border:none;color:var(--muted);padding:0 4px">✕</button>` : ''}<button class="pill" data-item="${esc(it.id)}" style="background:transparent;border:1px dashed var(--line2);color:var(--muted)" ${ro ? 'disabled' : ''}>Vezmu</button></span>`}
      </div>`).join('')}</div>` : `<div class="sub">${ro ? 'Seznam je prázdný.' : 'Zatím nic. Přidej, co je potřeba.'}</div>`}
      ${ro ? '' : `<form class="inrow" data-itemform style="margin-top:10px"><input class="input" name="n" placeholder="Přidat věc" aria-label="Přidat věc" maxlength="80"><button class="ibtn" aria-label="Přidat">${icon('plus')}</button></form>`}`;
    el.querySelectorAll('[data-item]').forEach((b) => { b.onclick = () => toggleItem(ev, items.find((i) => i.id === b.dataset.item)).catch(() => toast('Nepovedlo se.')); });
    el.querySelectorAll('[data-itemdel]').forEach((b) => { b.onclick = async () => { const it = items.find((i) => i.id === b.dataset.itemdel); if (it && await confirmDanger('Smazat položku?', it.name)) deleteItem(ev, it).catch(() => toast('Nepovedlo se smazat.')); }; });
    const f = el.querySelector('[data-itemform]');
    if (f) f.onsubmit = async (e) => { e.preventDefault(); const n = f.n.value.trim(); if (!n) return; f.n.value = ''; try { await addItem(ev, n); } catch (x) { toast('Nepovedlo se přidat.'); } };
  }

  function drawComs() {
    const el = host.querySelector('[data-coms]');
    if (!el) return;
    const me = myName();
    const ro = false; // komentovat jde u všech akcí, i proběhlých a převzatých z kalendáře
    host.querySelector('[data-comcount]').textContent = comments.length ? String(comments.length) : '';
    // Odpovědi hned pod komentář, na který odpovídají.
    const top = comments.filter((c) => !c.parentId || !comments.some((p) => p.id === c.parentId));
    const ordered = [];
    const add = (c) => { ordered.push(c); comments.filter((r) => r.parentId === c.id && !ordered.includes(r)).forEach(add); };
    top.forEach(add);
    el.innerHTML = ordered.length ? ordered.map((c) => {
      const rs = sortedReactions(c.reactions);
      return `<div class="com" data-cid="${esc(c.id)}" ${c.parentId ? 'style="margin-left:42px"' : ''}>
        <span data-profile="${esc(c.user || '')}">${avatar(c.user || '?', 32)}</span>
        <div style="min-width:0;flex:1"><div class="bub"><b style="font-size:13px" data-profile="${esc(c.user || '')}">${esc(c.user || '?')}</b><div>${linkify(c.text || '')}</div>
          ${(c.images || []).map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join('')}
          <div class="ts">${esc(fmtStamp(c.at))}${!ro && c.user === me ? ` · <button data-del="${esc(c.id)}" style="background:none;border:none;color:var(--muted);padding:0;font-size:11px;text-decoration:underline">smazat</button>` : ''}</div></div>
          ${rs.length ? `<div class="reacts">${rs.map(([k, l]) => `<button class="react ${l.includes(me) ? 'on' : ''}" data-creact="${esc(k)}">${emo(k, 16)}<span>${l.length}</span></button>`).join('')}</div>` : ''}</div>
      </div>`;
    }).join('') : '<div class="sub">Zatím žádné komentáře.</div>';
    el.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => { if (await confirmDanger('Smazat komentář?', '')) deleteComment(ev, b.dataset.del).catch(() => toast('Nepovedlo se smazat.')); };
    });
  }

  // Swipe mezi akcemi: doleva = pozdější akce, doprava = dřívější (jako velká karta).
  // Během tahu z druhé strany přijíždí náhled sousední akce.
  function bindSwipe() {
    const scr = host.querySelector('.screen');
    const arcD = (x) => `translateX(${x}px) rotate(${x / 90}deg)`;
    let x0 = 0, y0 = 0, dx = 0, track = null, skip = false, ghost = null, gDir = 0, done = false;
    const W = () => host.getBoundingClientRect().width + 24;
    const neighbourEv = (dir) => {
      const list = events.list;
      const i = list.findIndex((x) => x.id === ev.id);
      return list[i + dir] || null;
    };
    function ensureGhost(dir) {
      if (ghost && gDir === dir) return ghost;
      if (ghost) ghost.remove();
      ghost = null; gDir = dir;
      const t = neighbourEv(dir);
      if (!t) return null;
      const r = host.getBoundingClientRect();
      const g = document.createElement('div');
      g.className = 'det-ghost';
      g.style.left = r.left + 'px';
      g.style.width = r.width + 'px';
      host.appendChild(g);
      mountDetail(g, t, false);
      ghost = g;
      return g;
    }
    const place = (x, ms) => {
      const tr = ms ? `transform ${ms}ms ease-out, opacity ${ms}ms` : 'none';
      scr.style.transition = tr;
      scr.style.transform = arcD(x);
      if (ghost) { ghost.style.transition = tr; ghost.style.transform = arcD(x + gDir * W()); }
    };
    scr.addEventListener('touchstart', (e) => {
      if (done) return;
      skip = !!e.target.closest('input, textarea, button, .sheet, .mapbox');
      const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; dx = 0; track = null;
    }, { passive: true });
    scr.addEventListener('touchmove', (e) => {
      if (skip || done) return;
      const t = e.touches[0];
      const ddx = t.clientX - x0, ddy = t.clientY - y0;
      if (track === null && (Math.abs(ddx) > 10 || Math.abs(ddy) > 10)) track = Math.abs(ddx) > Math.abs(ddy) * 1.3;
      if (!track) return;
      dx = ddx;
      const g = ensureGhost(dx < 0 ? 1 : -1);
      place(g ? dx : dx * 0.35, 0);
    }, { passive: true });
    scr.addEventListener('touchend', () => {
      if (skip || !track || done) return;
      const dir = dx < 0 ? 1 : -1;
      const target = neighbourEv(dir);
      if (Math.abs(dx) > 80 && target && ghost) {
        done = true;
        place(-dir * W(), 230);
        ghost.style.transition = 'transform 230ms ease-out';
        ghost.style.transform = arcD(0);
        // Nová stránka se vykreslí přesně tam, kde stojí náhled.
        setTimeout(() => {
          // Náhled přesunout mimo stránku (přežije překreslení) a schovat, až bude nová stránka hotová.
          const g = ghost;
          document.body.appendChild(g);
          let gone = false;
          const drop = () => { if (gone) return; gone = true; window.removeEventListener('detail-ready', drop); g.remove(); };
          window.addEventListener('detail-ready', drop);
          setTimeout(drop, 2500);
          location.replace('#/akce/' + encodeURIComponent(target.id));
        }, 240);
        return;
      }
      if (Math.abs(dx) > 80 && !target) toast(dir > 0 ? 'Další akce už není.' : 'Starší akce už není.');
      place(0, 200);
      setTimeout(() => { if (ghost && !done) { ghost.remove(); ghost = null; gDir = 0; } }, 220);
    });
  }

  shell();
  return {
    cleanup() { unsubs.forEach((u) => u()); },
    update(found) {
      const albumChanged = found.photoAlbum && found.photoAlbum !== album;
      ev = found;
      if (albumChanged) { album = found.photoAlbum; drawAlbum(); }
    }
  };
}
