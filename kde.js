// Kde jsi?: check-iny party (Feed a Mapa) a nový check-in.
// Skutečné check-iny (placeCheckins) se čtou. Ve zkušebním provozu se nové
// check-iny, reakce a komentáře zapisují jen do v2_checkins (test).
import { emo, emojiSheet } from './emoji.js';
import { esc, icon, fmtTime, toDate, dayDiff, sameDay, DAYS_FULL } from './util.js';
import { tabbar, avatar, toast, spinner, confirmDanger } from './ui.js';
import { myName } from './auth.js';
import { TEST_MODE, MAPY_API_KEY, CHAT_LIVE } from './config.js';
import { db, collection, doc, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, setDoc, writeBatch, callFunction } from './firebase.js';
import { shrinkPhoto } from './store.js';
import { loadLeaflet } from './map.js';

const isTestDoc = (c) => c._col === 'v2_checkins';
const canWriteCi = (c) => isTestDoc(c) || !TEST_MODE || CHAT_LIVE;
const LIVE = CHAT_LIVE || !TEST_MODE;
const colOf = (c) => c._col;

function when(at) {
  const d = toDate(at);
  if (!d) return '';
  const dd = dayDiff(d, new Date());
  if (dd === 0) return `dnes ${fmtTime(d)}`;
  if (dd === 1) return `včera ${fmtTime(d)}`;
  if (dd < 7) return `${DAYS_FULL[d.getDay()]} ${fmtTime(d)}`;
  return `${d.getDate()}. ${d.getMonth() + 1}.${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}
const isToday = (c) => { const d = toDate(c.at); return d && sameDay(d, new Date()); };
// Aktuálnost check-inu: platí, dokud autor neudělá nový check-in nebo dokud
// neotevře aplikaci dál než 1 km od místa (pak se zapíše endedAt). Pojistka: max. 24 h.
const MAX_ACTIVE = 24 * 3600 * 1000;
const distM = (a, b) => { const R = 6371000, t = (x) => x * Math.PI / 180; const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const getPos = (maxAge = 60000) => new Promise((res) => {
  if (!navigator.geolocation) return res(null);
  navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 8000, maximumAge: maxAge });
});
function isActive(c, list) {
  if (c.endedAt) return false;
  const t = toDate(c.at);
  if (!t || Date.now() - t.getTime() > MAX_ACTIVE) return false;
  return !list.some((x) => x !== c && x.user === c.user && (toDate(x.at)?.getTime() || 0) > t.getTime());
}
// Malý výřez mapy (dlaždice OpenStreetMap) se špendlíkem uprostřed.
// Dlaždice o úroveň podrobnější zobrazené v poloviční velikosti → ostré i na iPhonu.
function miniMap(lat, lng, w = 132, h = 76, z = 15) {
  const Z = z + 1, n = 256 * 2 ** Z;
  const px = (lng + 180) / 360 * n;
  const r = lat * Math.PI / 180;
  const py = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
  const left = px / 2 - w / 2, top = py / 2 - h / 2; // v CSS px (dlaždice = 128 px)
  const tiles = [];
  for (let tx = Math.floor(left / 128); tx * 128 < left + w; tx++)
    for (let ty = Math.floor(top / 128); ty * 128 < top + h; ty++)
      tiles.push(`<img src="https://tile.openstreetmap.org/${Z}/${tx}/${ty}.png" alt="" loading="lazy" style="left:${Math.round(tx * 128 - left)}px;top:${Math.round(ty * 128 - top)}px">`);
  return `<span class="cimap" style="width:${w}px;height:${h}px">${tiles.join('')}<i class="cimpin"></i><small>© OSM</small></span>`;
}
const gplace = (c) => `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
const gmaps = (c) => c.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.place || '')}`;

export function render(root, { tab = 'feed', openNew = false }) {
  const me = myName();
  let real = [], test = [], week = [], comments = {}, open = new Set(), map = null, markers = null, alive = true;
  const unsubs = [];

  root.innerHTML = `<div class="screen">
    <div class="top"><div><div class="h1">Kde jsi?</div><div class="sub">check-iny party</div></div>
      <div style="display:flex;gap:8px"><button class="ibtn" data-bell aria-label="Upozornění na check-iny">${icon('bellOff', 22)}</button>
      <button class="ibtn on" data-new aria-label="Nový check-in">${icon('pin')}</button></div></div>
    <div class="seg" role="tablist">
      <button role="tab" class="${tab === 'feed' ? 'on' : ''}" data-tab="#/kde">Feed</button>
      <button role="tab" class="${tab === 'mapa' ? 'on' : ''}" data-tab="#/kde/mapa">Mapa</button>
      <button role="tab" class="${tab === 'mista' ? 'on' : ''}" data-tab="#/kde/mista">Místa</button>
    </div>
    <div class="scroll" data-body>${spinner()}</div>
    ${tabbar('kde')}
  </div>`;
  const body = root.querySelector('[data-body]');
  root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => location.replace(b.dataset.tab); });
  root.querySelector('[data-new]').onclick = () => newCheckin();

  // Zvoneček: upozornění na nové check-iny a reakce na ty tvoje (settings/placeCheckins,
  // stejné nastavení jako ve staré aplikaci, výchozí stav vypnuto).
  let bellOn = false;
  const bellBtn = root.querySelector('[data-bell]');
  const drawBell = () => { bellBtn.innerHTML = icon(bellOn ? 'bell2' : 'bellOff', 22); bellBtn.classList.toggle('on', bellOn); bellBtn.setAttribute('aria-pressed', String(bellOn)); };
  unsubs.push(onSnapshot(doc(db, 'settings', 'placeCheckins'), (d) => { bellOn = !!((d.exists() && d.data().enabled) || {})[me]; drawBell(); }, () => {}));
  bellBtn.onclick = async () => {
    const on = !bellOn;
    try {
      await setDoc(doc(db, 'settings', 'placeCheckins'), { enabled: { [me]: on } }, { merge: true });
      toast(on ? 'Upozornění na check-iny zapnutá 🔔' : 'Upozornění na check-iny vypnutá');
    } catch (x) { console.error(x); toast('Nastavení se nepodařilo uložit.'); }
  };

  const all = () => [...real, ...test].sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));

  // ---------- Feed ----------
  function card(c) {
    const mine = c.user === me;
    const w = canWriteCi(c);
    const active = isActive(c, all());
    const ended = toDate(c.endedAt);
    const em = Object.entries(c.emojis || {});
    const emCount = {};
    em.forEach(([, e]) => { emCount[e] = (emCount[e] || 0) + 1; });
    const cs = comments[c.id];
    return `<div class="ci" data-ci="${esc(c.id)}">
      <div class="cihead"><span data-profile="${esc(c.user || '')}">${avatar(c.user || '?', 36)}</span>
        <div style="min-width:0;flex:1"><div class="t"><span data-profile="${esc(c.user || '')}">${esc(c.user || '?')}</span>${isTestDoc(c) ? ' <span class="pill test" style="height:18px;font-size:10px">test</span>' : ''}${active ? ' <span class="cinow">právě tady</span>' : ''}</div><div class="s">${esc(when(c.at))}${ended && ended - toDate(c.at) < MAX_ACTIVE ? ` · odešel(a) ${esc(fmtTime(ended))}` : ''}${c.editedAt ? ' · upraveno' : ''}</div></div>
        ${c.lat != null && c.lng != null
          ? `<a class="cimaplink" href="${esc(gplace(c))}" target="_blank" rel="noopener" aria-label="Otevřít v Google Mapách">${miniMap(+c.lat, +c.lng)}</a>`
          : `<a class="ibtn ghost" href="${esc(gmaps(c))}" target="_blank" rel="noopener" aria-label="Najít v Google Mapách">${icon('pin', 18)}</a>`}
      </div>
      <div class="ciplace">${esc(c.place || '')}</div>
      ${c.note ? `<div class="cinote">${esc(c.note)}</div>` : ''}
      ${c.photo ? `<img class="ciphoto" src="${esc(c.photo)}" alt="" loading="lazy">` : ''}
      ${(c.coming || []).length || (c.near || []).length ? `<div class="cippl">
        ${(c.coming || []).length ? `<span>🚶 Přijde: ${esc(c.coming.join(', '))}</span>` : ''}
        ${(c.near || []).length ? `<span>📍 Poblíž: ${esc(c.near.join(', '))}</span>` : ''}</div>` : ''}
      <div class="ciact">
        ${!mine && active ? `<button class="pill ${(c.coming || []).includes(me) ? 'go' : ''}" data-act="coming" ${w ? '' : 'disabled'}>Přijdu taky</button>
          <button class="pill ${(c.near || []).includes(me) ? 'go' : ''}" data-act="near" ${w ? '' : 'disabled'}>Jsem poblíž</button>` : ''}
        <span class="ciem">${Object.entries(emCount).sort((a, b) => b[1] - a[1]).map(([e, n]) => `<span>${emo(e, 18)}${n > 1 ? `<small>${n}</small>` : ''}</span>`).join('')}</span>
        ${w ? `<button class="pill" data-act="emoji" aria-label="Reakce">${(c.emojis || {})[me] ? emo(c.emojis[me], 16) : '🙂'}</button>` : ''}
        <button class="pill" data-act="com">${icon('chat', 14)} ${c.commentCount || (cs ? cs.length : 0) || ''}</button>
        ${mine && w ? `<button class="pill" data-act="edit" aria-label="Upravit">${icon('edit', 14)}</button><button class="pill" data-act="del" aria-label="Smazat">${icon('trash', 14)}</button>` : ''}
      </div>
      ${open.has(c.id) ? `<div class="cicoms">${cs ? (cs.length ? cs.map((m) => `<div class="com"><span data-profile="${esc(m.user || '')}">${avatar(m.user || '?', 26)}</span><div class="bub"><b style="font-size:12px" data-profile="${esc(m.user || '')}">${esc(m.user || '?')}</b><div>${esc(m.text || '')}</div><div class="ts">${esc(when(m.at))}</div></div></div>`).join('') : '<div class="sub">Zatím bez komentářů.</div>') : spinner()}
        ${w ? `<form class="inrow" data-cform style="margin-top:8px"><input class="input" name="t" placeholder="Komentář" maxlength="300" autocomplete="off"><button class="ibtn" aria-label="Odeslat">${icon('next', 20, 2.4)}</button></form>` : ''}</div>` : ''}
    </div>`;
  }

  function drawFeed() {
    const list = all();
    if (!list.length) { body.innerHTML = '<div class="empty">Zatím žádné check-iny.</div>'; return; }
    const tail = more ? '<div class="sub" style="text-align:center;padding:14px">Starší se načtou při posunu dolů…</div>' : '<div class="sub" style="text-align:center;padding:14px">To je všechno 🐌</div>';
    let html = '', lastDay = null;
    for (const c of list) {
      const d = toDate(c.at) || new Date(0);
      if (!lastDay || !sameDay(d, lastDay)) {
        const dd = dayDiff(d, new Date());
        html += `<div class="section-h">${dd === 0 ? 'Dnes' : dd === 1 ? 'Včera' : `${DAYS_FULL[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`}</div>`;
        lastDay = d;
      }
      html += card(c);
    }
    body.innerHTML = html + tail;
  }

  body.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-ci]');
    if (!el) return;
    const c = all().find((x) => x.id === el.dataset.ci);
    if (!c) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'com') {
      open.has(c.id) ? open.delete(c.id) : open.add(c.id);
      if (open.has(c.id) && !comments[c.id]) {
        unsubs.push(onSnapshot(query(collection(db, colOf(c), c.id, 'comments'), orderBy('at', 'asc')), (s) => {
          comments[c.id] = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (alive) drawFeed();
        }, () => { comments[c.id] = []; drawFeed(); }));
      }
      drawFeed();
      return;
    }
    if (!act || !canWriteCi(c)) return;
    const ref = doc(db, colOf(c), c.id);
    try {
      if (act === 'coming' || act === 'near') {
        const arr = new Set(c[act] || []);
        const adding = !arr.has(me);
        adding ? arr.add(me) : arr.delete(me);
        const upd = { [act]: [...arr] };
        // „Jsem poblíž“ pošle autorovi i polohu (jako stará aplikace); při zrušení se smaže.
        if (act === 'near') {
          const nl = { ...(c.nearLoc || {}) };
          if (adding) {
            const pos = await new Promise((res) => navigator.geolocation
              ? navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 8000, maximumAge: 60000 })
              : res(null));
            if (pos) nl[me] = pos;
          } else delete nl[me];
          upd.nearLoc = nl;
        }
        await updateDoc(ref, upd);
      } else if (act === 'emoji') {
        const cur = (c.emojis || {})[me];
        const r = await emojiSheet({ selected: cur ? [cur] : [], title: 'Reakce na check-in' });
        if (r && r.emoji) {
          const e2 = { ...(c.emojis || {}) };
          if (e2[me] === r.emoji) delete e2[me]; else e2[me] = r.emoji;
          await updateDoc(ref, { emojis: e2 });
        }
      } else if (act === 'edit') {
        editCheckin(c);
      } else if (act === 'del') {
        if (await confirmDanger('Smazat check-in?', c.place || '')) await deleteDoc(ref);
      }
    } catch (x) { console.error(x); toast('Nepovedlo se.'); }
  });
  body.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-cform]');
    if (!f) return;
    e.preventDefault();
    const c = all().find((x) => x.id === f.closest('[data-ci]').dataset.ci);
    const text = f.t.value.trim();
    if (!c || !text) return;
    f.t.value = '';
    try {
      const b = writeBatch(db);
      b.set(doc(collection(db, colOf(c), c.id, 'comments')), { user: me, text, at: new Date().toISOString() });
      b.update(doc(db, colOf(c), c.id), { commentCount: (c.commentCount || 0) + 1 });
      await b.commit();
    } catch (x) { f.t.value = text; toast('Komentář se nepodařilo odeslat.'); }
  });

  // ---------- Mapa ----------
  async function drawMap() {
    if (!body.querySelector('.cimap')) {
      body.innerHTML = '<div class="cimap"></div><div class="note" style="margin-top:8px">Check-iny za posledních 7 dní</div>';
      try {
        const L = await loadLeaflet();
        if (!alive) return;
        map = L.map(body.querySelector('.cimap'), { zoomControl: false, attributionControl: false }).setView([49.43, 16.62], 11);
        const size = window.devicePixelRatio > 1 ? '256@2x' : '256';
        L.tileLayer(MAPY_API_KEY ? `https://api.mapy.com/v1/maptiles/outdoor/${size}/{z}/{x}/{y}?apikey=${encodeURIComponent(MAPY_API_KEY)}` : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, tileSize: 256 }).addTo(map);
        markers = L.layerGroup().addTo(map);
        body.querySelector('.cimap').insertAdjacentHTML('beforeend', MAPY_API_KEY
          ? '<a class="mapylogo" href="https://mapy.com/" target="_blank" rel="noopener"><img src="https://api.mapy.com/img/api/logo.svg" alt="Mapy.com"></a><a class="mapcopy" href="https://api.mapy.com/copyright" target="_blank" rel="noopener">© Seznam.cz a.s. a další</a>'
          : '<span class="mapcopy">© OpenStreetMap</span>');
      } catch (x) { body.innerHTML = '<div class="empty">Mapu se nepodařilo načíst.</div>'; return; }
    }
    if (!map || !window.L) return;
    const L = window.L;
    markers.clearLayers();
    const pts = week.filter((c) => c.lat != null && c.lng != null);
    const seen = new Set();
    pts.forEach((c) => {
      const key = c.user + '|' + c.lat.toFixed(4) + '|' + c.lng.toFixed(4);
      if (seen.has(key)) return;
      seen.add(key);
      const m = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: 'cipin', html: `${avatar(c.user || '?', 30)}`, iconSize: [30, 30], iconAnchor: [15, 15] }) });
      m.bindPopup(`<b>${esc(c.user)}</b><br>${esc(c.place || '')}<br><small>${esc(when(c.at))}</small>`);
      m.addTo(markers);
    });
    if (!pts.length && !map._fitted) { map.setView([49.43, 16.62], 11); }
    if (pts.length && !map._fitted) { map.fitBounds(pts.map((c) => [c.lat, c.lng]), { padding: [30, 30], maxZoom: 14 }); map._fitted = true; }
    setTimeout(() => map.invalidateSize(), 50);
  }

  // ---------- Místa: kde se parta nejčastěji schází (z posledních check-inů) ----------
  let allPlaces = null, placesOpen = null, myPos = null;
  async function drawPlaces() {
    if (!allPlaces) {
      body.innerHTML = spinner();
      try {
        const s = await getDocs(query(collection(db, 'placeCheckins'), orderBy('at', 'desc'), limit(1000)));
        allPlaces = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) { body.innerHTML = '<div class="empty">Místa se nepodařilo načíst.</div>'; return; }
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { myPos = { lat: p.coords.latitude, lng: p.coords.longitude }; if (alive && tab === 'mista') drawPlaces(); }, () => {}, { timeout: 8000, maximumAge: 300000 });
    }
    const dist = (a, b) => { const R = 6371000, t = (x) => x * Math.PI / 180; const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    const nk = (n) => String(n || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const byName = new Map(), groups = [];
    allPlaces.filter((d) => d.place).forEach((d) => {
      const k = nk(d.place);
      if (!byName.has(k)) byName.set(k, []);
      const list = byName.get(k);
      const hasC = typeof d.lat === 'number' && typeof d.lng === 'number';
      let g = hasC ? (list.find((x) => x.lat != null && dist(x, d) < 500) || list.find((x) => x.lat == null)) : (list.find((x) => x.lat == null) || list[0]);
      if (!g) { g = { key: k + '|' + (hasC ? d.lat.toFixed(3) + ',' + d.lng.toFixed(3) : ''), name: d.place, lat: hasC ? d.lat : null, lng: hasC ? d.lng : null, items: [] }; list.push(g); groups.push(g); }
      else if (g.lat == null && hasC) { g.lat = d.lat; g.lng = d.lng; }
      g.items.push(d);
    });
    groups.forEach((g) => { const c = {}; g.items.forEach((d) => { c[d.user] = (c[d.user] || 0) + 1; }); g.people = Object.entries(c).sort((a, b) => b[1] - a[1]); });
    groups.sort((a, b) => (b.items.length - a.items.length) || ((b.items[0].at || '') > (a.items[0].at || '') ? 1 : -1));
    if (!groups.length) { body.innerHTML = '<div class="empty">Zatím žádná místa. Po prvním check-inu se tu objeví.</div>'; return; }
    const fmtD = (m) => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',') + ' km';
    body.innerHTML = `<div class="places">${groups.map((g, i) => {
      const op = placesOpen === g.key;
      const ppl = g.people.slice(0, 3).map(([n, k]) => `${esc(n)} ${k}×`).join(', ') + (g.people.length > 3 ? ` a ${g.people.length - 3} další` : '');
      return `<div class="pl ${op ? 'open' : ''}">
        <button class="pl-h" data-pg="${esc(g.key)}"><span class="pl-i">${i + 1}.</span>
          <span class="pl-t"><b>${esc(g.name)}</b><small>${ppl}</small><small>naposledy ${esc(when(g.items[0].at))}${myPos && g.lat != null ? ' · ' + fmtD(dist(myPos, g)) : ''}</small></span>
          <span class="pl-n">${g.items.length}×</span></button>
        ${op ? `<div class="pl-d">${g.lat != null ? `<a href="${esc(gplace(g))}" target="_blank" rel="noopener">Otevřít v Google Mapách</a>` : ''}
          ${g.items.slice(0, 20).map((d) => `<div class="pl-r"><span data-profile="${esc(d.user || '')}">${avatar(d.user || '?', 26)}</span><span><b data-profile="${esc(d.user || '')}">${esc(d.user || '?')}</b>${d.note ? `<small>„${esc(d.note)}“</small>` : ''}</span><small>${esc(when(d.at))}</small>${d.photo ? `<img src="${esc(d.photo)}" alt="" loading="lazy">` : ''}</div>`).join('')}
          ${g.items.length > 20 ? `<div class="sub">…a ${g.items.length - 20} starších</div>` : ''}</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }
  body.addEventListener('click', (e) => {
    const g = e.target.closest('[data-pg]');
    if (g && tab === 'mista') { placesOpen = placesOpen === g.dataset.pg ? null : g.dataset.pg; drawPlaces(); }
  });

  let placesStarted = false;
  const draw = () => { if (!alive) return; if (tab === 'mista') { if (!placesStarted) { placesStarted = true; drawPlaces(); } return; } tab === 'mapa' ? drawMap() : drawFeed(); };

  // Feed: všechny check-iny — načítají se po 60, další při posunu dolů.
  let lim = 60, feedUnsub = null, more = true;
  const subFeed = () => {
    if (feedUnsub) feedUnsub();
    feedUnsub = onSnapshot(query(collection(db, 'placeCheckins'), orderBy('at', 'desc'), limit(lim)), (s) => {
      real = s.docs.map((d) => ({ id: d.id, _col: 'placeCheckins', ...d.data() }));
      more = s.docs.length >= lim;
      draw();
    }, (err) => { console.error('Check-iny:', err); real = []; draw(); });
  };
  subFeed();
  unsubs.push(() => feedUnsub && feedUnsub());
  const onScroll = () => {
    if (tab !== 'feed' || !more) return;
    if (window.scrollY + window.innerHeight > document.documentElement.scrollHeight - 900) { more = false; lim += 60; subFeed(); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  unsubs.push(() => window.removeEventListener('scroll', onScroll));
  // Mapa: check-iny za posledních 7 dní.
  unsubs.push(onSnapshot(query(collection(db, 'placeCheckins'), where('at', '>=', new Date(Date.now() - 7 * 86400000).toISOString()), orderBy('at', 'desc')), (s) => {
    week = s.docs.map((d) => ({ id: d.id, _col: 'placeCheckins', ...d.data() }));
    if (tab === 'mapa') draw();
  }, () => {}));
  if (!LIVE) unsubs.push(onSnapshot(query(collection(db, 'v2_checkins'), orderBy('at', 'desc'), limit(30)), (s) => {
    test = s.docs.map((d) => ({ id: d.id, _col: 'v2_checkins', ...d.data() })); draw();
  }, () => {}));

  if (openNew) setTimeout(newCheckin, 50);
  return () => { alive = false; unsubs.forEach((u) => u()); if (map) map.remove(); };
}

// ---------- nový check-in (stejně jako ve staré aplikaci) ----------
// Tvoje místa: nejčastější a nejnovější z vlastních check-inů (do 6).
async function favoritePlaces(me) {
  const map = new Map();
  for (const col of LIVE ? ['placeCheckins'] : ['placeCheckins', 'v2_checkins']) {
    try {
      const s = await getDocs(query(collection(db, col), where('user', '==', me), limit(300)));
      s.forEach((d) => {
        const c = d.data();
        const name = (c.place || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const e = map.get(key) || { name, count: 0, last: '' };
        e.count++;
        if ((c.at || '') > e.last) { e.last = c.at || ''; e.name = name; }
        map.set(key, e);
      });
    } catch (e) { /* bez oblíbených */ }
  }
  return [...map.values()].sort((a, b) => (b.count - a.count) || (b.last > a.last ? 1 : -1)).slice(0, 6).map((e) => e.name);
}

// Místa v okolí: stejná serverová funkce jako stará aplikace (Google Places),
// když nic nevrátí, aspoň odhad adresy z Mapy.com.
async function nearby(c) {
  try {
    const r = await callFunction('nearbyPlaces', { lat: c.lat, lng: c.lng });
    if (r && r.results && r.results.length) return { list: r.results, guess: '' };
  } catch (e) { console.error('Místa v okolí:', e); }
  let guess = '';
  if (MAPY_API_KEY) {
    try {
      const res = await fetch(`https://api.mapy.com/v1/rgeocode?lon=${c.lng}&lat=${c.lat}&lang=cs&apikey=${encodeURIComponent(MAPY_API_KEY)}`);
      const j = await res.json();
      guess = (j.items && j.items[0] && (j.items[0].name || j.items[0].label)) || '';
    } catch (e) { /* bez odhadu */ }
  }
  return { list: [], guess };
}

export function newCheckin() {
  const me = myName();
  const scr = document.createElement('div');
  scr.className = 'ciform';
  scr.innerHTML = `<div class="ciload">Hledám místa v okolí…<div><button class="btn" data-x style="margin-top:12px">Zrušit</button></div></div>`;
  document.body.appendChild(scr);
  let cancelled = false;
  scr.querySelector('[data-x]').onclick = () => { cancelled = true; scr.remove(); };

  const favP = favoritePlaces(me);
  const getPos = () => new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 8000, maximumAge: 60000 });
  });
  (async () => {
    const coords = await getPos();
    const nb = coords ? await nearby(coords) : { list: [], guess: '' };
    const favs = await favP;
    if (cancelled) return;
    renderForm(scr, me, coords, nb.list, nb.guess, favs);
  })();
}

function renderForm(scr, me, coords, sugs, guess, favs) {
  let photo = '', picked = null;
  const sugRow = (s, i) => `<button type="button" class="cisug" data-i="${i}"><b>${esc(s.name)}</b>${s.vicinity ? `<span>${esc(s.vicinity)}</span>` : ''}</button>`;
  const first = sugs.slice(0, 3), more = sugs.slice(3);
  scr.innerHTML = `<div class="ciformin">
    <label class="cilbl" for="ci-place">Kde jsi</label>
    <input id="ci-place" class="input" data-place placeholder="Napiš, kde jsi…" maxlength="80" value="${esc(guess)}">
    ${favs.length ? `<div class="cilbl">Tvoje místa</div><div class="chips cifav">${favs.map((n) => `<button type="button" class="chip" data-fav="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
    ${sugs.length ? `<div class="cilbl">Místa v okolí</div>
      <div class="cisugs">${first.map((s, i) => sugRow(s, i)).join('')}</div>
      ${more.length ? `<div class="cisugs" data-more hidden>${more.map((s, i) => sugRow(s, i + 3)).join('')}</div>
        <button type="button" class="cimore" data-morebtn>Další místa v okolí (${more.length})</button>` : ''}` : ''}
    ${!coords ? '<div class="note" style="text-align:left;margin-bottom:12px">Polohu se nepodařilo zjistit — místo napiš ručně.</div>' : ''}
    <label class="cilbl" for="ci-note">Poznámka (nepovinné)</label>
    <textarea id="ci-note" class="input" data-note rows="2" maxlength="120" placeholder="Třeba doporučení pro ostatní…"></textarea>
    <input type="file" accept="image/*" data-file hidden>
    <div class="ciphrow" data-phrow></div>
    ${!LIVE ? '<div class="note" style="text-align:left;margin-bottom:10px">Zkušební provoz: check-in se uloží jako testovací — parta ho neuvidí.</div>' : ''}
  </div>
  <div class="cibtns"><button class="btn" data-x>Zrušit</button><button class="btn primary" data-go>Odeslat</button></div>`;
  const $ = (q) => scr.querySelector(q);
  const input = $('[data-place]');
  const mark = (el) => { scr.querySelectorAll('.chip[data-fav], .cisug').forEach((x) => x.classList.remove('on')); if (el) el.classList.add('on'); };
  scr.querySelectorAll('[data-fav]').forEach((b) => { b.onclick = () => { input.value = b.dataset.fav; picked = null; mark(b); }; });
  scr.querySelectorAll('.cisug').forEach((b) => { b.onclick = () => { const s = sugs[+b.dataset.i]; input.value = s.name; picked = s; mark(b); }; });
  const mb = $('[data-morebtn]');
  if (mb) mb.onclick = () => { $('[data-more]').hidden = false; mb.remove(); };
  const drawPh = () => {
    $('[data-phrow]').innerHTML = `${photo ? `<img src="${photo}" alt="">` : ''}
      <button type="button" class="btn" data-ph>${icon('photo', 18)} ${photo ? 'Změnit fotku' : 'Přidat fotku'}</button>
      ${photo ? '<button type="button" class="btn" data-phx>Odebrat</button>' : ''}`;
    $('[data-ph]').onclick = () => $('[data-file]').click();
    const x = $('[data-phx]'); if (x) x.onclick = () => { photo = ''; drawPh(); };
  };
  drawPh();
  $('[data-file]').onchange = async () => {
    const f = $('[data-file]').files[0];
    $('[data-file]').value = '';
    if (!f) return;
    try { photo = await shrinkPhoto(f, 1024, 300000); drawPh(); } catch (e) { toast('Fotku se nepodařilo načíst.'); }
  };
  const close = () => scr.remove();
  $('[data-x]').onclick = close;
  $('[data-go]').onclick = async (e) => {
    const place = input.value.trim();
    if (!place) { input.focus(); return; }
    e.target.disabled = true; e.target.textContent = 'Ukládám…';
    const gp = picked && picked.name === place ? picked : null;
    const data = { user: me, place, note: $('[data-note]').value.trim(),
      lat: coords ? coords.lat : null, lng: coords ? coords.lng : null, gPlaceId: gp ? gp.id || '' : '',
      at: new Date().toISOString(), photo, photoPath: '', via: 'v2' };
    try {
      const ref = await addDoc(collection(db, LIVE ? 'placeCheckins' : 'v2_checkins'), data);
      endMyOthers(me, ref.id).catch(() => {});
      close();
      toast('Check-in odeslán 📍');
      if (!location.hash.startsWith('#/kde')) location.hash = '#/kde';
    } catch (x) { console.error(x); e.target.disabled = false; e.target.textContent = 'Odeslat'; toast('Check-in se nepodařilo uložit.'); }
  };
  setTimeout(() => input.focus(), 100);
}

// ---------- aktuálnost vlastního check-inu ----------
// Moje check-iny, které ještě nejsou ukončené (kromě keepId), dostanou endedAt.
async function endMyOthers(me, keepId) {
  const s = await getDocs(query(collection(db, 'placeCheckins'), where('user', '==', me), limit(50)));
  const now = new Date().toISOString();
  await Promise.all(s.docs.filter((d) => d.id !== keepId && !d.data().endedAt).map((d) => updateDoc(d.ref, { endedAt: now, endedWhy: 'novy' })));
}
// Při otevření aplikace: když jsem dál než 1 km od místa posledního check-inu, check-in skončí.
let lastCheck = 0;
export async function checkMyCheckin() {
  if (Date.now() - lastCheck < 3 * 60 * 1000) return;
  lastCheck = Date.now();
  const me = myName();
  if (!me || !LIVE) return;
  try {
    const s = await getDocs(query(collection(db, 'placeCheckins'), where('user', '==', me), limit(50)));
    const mine = s.docs.map((d) => ({ ref: d.ref, ...d.data() })).sort((a, b) => (toDate(b.at)?.getTime() || 0) - (toDate(a.at)?.getTime() || 0));
    const c = mine[0];
    if (!c || c.endedAt || c.lat == null || c.lng == null) return;
    if (Date.now() - (toDate(c.at)?.getTime() || 0) > MAX_ACTIVE) return;
    const pos = await getPos(120000);
    if (!pos) return;
    if (distM(pos, { lat: +c.lat, lng: +c.lng }) > 1000) await updateDoc(c.ref, { endedAt: new Date().toISOString(), endedWhy: 'pryc' });
  } catch (e) { console.error('Aktuálnost check-inu:', e); }
}

// ---------- úprava vlastního check-inu ----------
function editCheckin(c) {
  let photo = c.photo || '';
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Upravit check-in"><div class="grab"></div>
    <h3>Upravit check-in</h3>
    <label class="cilbl" for="ce-place">Kde jsi</label>
    <input id="ce-place" class="input" data-place maxlength="80" value="${esc(c.place || '')}">
    <label class="cilbl" for="ce-note">Poznámka</label>
    <textarea id="ce-note" class="input" data-note rows="2" maxlength="120">${esc(c.note || '')}</textarea>
    <input type="file" accept="image/*" data-file hidden>
    <div class="ciphrow" data-phrow></div>
    <div class="cibtns" style="position:static;padding:14px 0 0"><button class="btn" data-x>Zrušit</button><button class="btn primary" data-go>Uložit</button></div>
  </div>`;
  const $ = (q) => bd.querySelector(q);
  const drawPh = () => {
    $('[data-phrow]').innerHTML = `${photo ? `<img src="${photo}" alt="">` : ''}
      <button type="button" class="btn" data-ph>${icon('photo', 18)} ${photo ? 'Změnit fotku' : 'Přidat fotku'}</button>
      ${photo ? '<button type="button" class="btn" data-phx>Odebrat</button>' : ''}`;
    $('[data-ph]').onclick = () => $('[data-file]').click();
    const x = $('[data-phx]'); if (x) x.onclick = () => { photo = ''; drawPh(); };
  };
  drawPh();
  $('[data-file]').onchange = async () => {
    const f = $('[data-file]').files[0];
    $('[data-file]').value = '';
    if (!f) return;
    try { photo = await shrinkPhoto(f, 1024, 300000); drawPh(); } catch (e) { toast('Fotku se nepodařilo načíst.'); }
  };
  const close = () => bd.remove();
  bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  $('[data-x]').onclick = close;
  $('[data-go]').onclick = async (e) => {
    const place = $('[data-place]').value.trim();
    if (!place) { $('[data-place]').focus(); return; }
    e.target.disabled = true;
    try {
      await updateDoc(doc(db, c._col, c.id), { place, note: $('[data-note]').value.trim(), photo, editedAt: new Date().toISOString() });
      close(); toast('Check-in upraven');
    } catch (x) { console.error(x); e.target.disabled = false; toast('Úpravu se nepodařilo uložit.'); }
  };
  document.body.appendChild(bd);
}
