// Chat: seznam vláken (Celá parta, soukromé, testovací) a konverzace.
// Skutečná vlákna party (chats/{id}/messages) se čtou. Ve zkušebním provozu
// se píše jen do testovacího vlákna v2_chats/test; s CHAT_LIVE se píše naostro.
import { esc, icon, fmtTime, sameDay, dayDiff, toDate, DAYS_FULL, looseName } from './util.js';
import { tabbar, avatar, toast, spinner, confirmDanger } from './ui.js';
import { myName } from './auth.js';
import { TEST_MODE, PARTY_NAMES, CHAT_LIVE } from './config.js';
import { db, collection, doc, query, orderBy, limit, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc } from './firebase.js';
import { shrinkPhoto } from './store.js';
import { isOnline, lastSeenText, watchPresence, watchOne } from './presence.js';
import { emo, sortedReactions, emojiSheet } from './emoji.js';
import { setDoc } from './firebase.js';
import { uploadFile } from './firebase.js';
import { startRecording } from './voice.js';
import { watchPolls, pollRows, newPollSheet } from './polls.js';
import { gameCardHtml } from './games.js';
import { where } from './firebase.js';

export const PARTY_THREAD = 'parta-vsichni';
const TEST_THREAD = 'test';

const norm = (s) => String(s || '').normalize('NFC').trim();
export const dmThreadId = (a, b) => [norm(a), norm(b)].sort().join('__');

export function threadPath(id) {
  return id === TEST_THREAD ? ['v2_chats', TEST_THREAD, 'messages'] : ['chats', id, 'messages'];
}
const canWriteThread = (id) => id === TEST_THREAD || !TEST_MODE || CHAT_LIVE;

function threadTitle(id) {
  if (id === PARTY_THREAD) return 'Celá parta';
  if (id === TEST_THREAD) return 'Testovací vlákno';
  const me = norm(myName());
  return id.split('__').find((n) => n !== me) || id;
}

function stamp(at) {
  const d = toDate(at);
  if (!d) return '';
  const diff = dayDiff(d, new Date());
  if (diff === 0) return fmtTime(d);
  if (diff === 1) return 'včera';
  if (diff < 7) return DAYS_FULL[d.getDay()].slice(0, 2);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
const snippet = (m) => m ? (m.game ? 'Hra' : m.text ? m.text : m.image ? 'Fotka' : m.audio ? 'Hlasovka' : '') : '';
// Ikona před textem v seznamu chatů (fotka, hlasovka, hra).
const snipIcon = (m) => { const n = !m || m.text ? '' : m.game ? 'gamepad' : m.image ? 'camera' : m.audio ? 'mic' : ''; return n ? `<span class="snipic">${icon(n, 15)}</span>` : ''; };

// ---------- seznam vláken ----------
export function renderList(root) {
  const me = myName();
  root.innerHTML = `<div class="screen">
    <div class="top"><div><div class="h1">Chat</div><div class="sub">KoKrŠNeK chat</div></div></div>
    <div class="scroll" data-list>${spinner()}</div>
    ${tabbar('chat')}
  </div>`;
  const box = root.querySelector('[data-list]');
  const others = PARTY_NAMES.filter((n) => norm(n) !== norm(me));
  const threads = [PARTY_THREAD, ...others.map((n) => dmThreadId(me, n)), ...(CHAT_LIVE ? [] : [TEST_THREAD])];
  const last = new Map();
  let alive = true, pres = {}, polls = [], metas = {}, openId = null, dragging = false, pending = false;
  const unsubPolls = watchPolls((l) => { polls = l; if (alive) draw(); });
  const M = (id) => metas[id] || {};
  const isPinned = (id) => !!(M(id).pinnedBy || {})[me];
  const isMuted = (id) => !!(M(id).muted || {})[me];
  // Smazaný chat se skryje, dokud nepřijde novější zpráva.
  const isHidden = (id) => {
    const h = (M(id).hiddenBy || {})[me];
    if (!h) return false;
    const t = toDate(last.get(id)?.at)?.getTime() || 0;
    return t <= new Date(h).getTime();
  };

  const draw = () => {
    if (dragging) { pending = true; return; }
    const rows = threads
      .filter((id) => (id === PARTY_THREAD || id === TEST_THREAD || last.get(id)) && !isHidden(id))
      .sort((a, b) => {
        const pa = isPinned(a), pb = isPinned(b);
        if (pa !== pb) return pa ? -1 : 1;
        if (a === PARTY_THREAD) return -1;
        if (b === PARTY_THREAD) return 1;
        return (toDate(last.get(b)?.at)?.getTime() || 0) - (toDate(last.get(a)?.at)?.getTime() || 0);
      });
    const noDm = others.filter((n) => !last.get(dmThreadId(me, n)) || isHidden(dmThreadId(me, n)));
    box.innerHTML = rows.map((id) => {
      const m = last.get(id);
      const title = threadTitle(id);
      const av = id === PARTY_THREAD
        ? `<span class="av" style="background:var(--accent);color:var(--on-accent)">${icon('people', 18)}</span>`
        : id === TEST_THREAD ? `<span class="av" style="background:var(--surface);color:var(--warn-ink)">${icon('chat', 18)}</span>`
        : `<span class="avwrap">${avatar(title, 40)}${isOnline(pres[title]) ? '<i class="onldot"></i>' : ''}</span>`;
      const pin = isPinned(id), mute = isMuted(id), canDel = id !== PARTY_THREAD && id !== TEST_THREAD;
      return `<div class="swrow${openId === id ? ' open' : ''}" data-sw="${esc(id)}" style="--sww:${canDel ? 210 : 140}px">
        <div class="swact">
          <button data-act="mute">${icon(mute ? 'bell2' : 'bellOff', 26)}<span>${mute ? 'Zapnout' : 'Ztlumit'}</span></button>
          <button data-act="pin">${icon('thumbtack', 26)}<span>${pin ? 'Odepnout' : 'Připnout'}</span></button>
          ${canDel ? `<button data-act="del" class="del">${icon('bin', 26)}<span>Smazat</span></button>` : ''}
        </div>
        <a class="row swfront" href="#/chat/${encodeURIComponent(id)}">
        ${av}
        <div style="min-width:0;flex:1"><div class="t">${esc(title)}${id === TEST_THREAD ? ' <span class="pill test" style="height:20px;font-size:11px">test</span>' : ''}</div>
          <div class="s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m ? esc(id === PARTY_THREAD && m.from ? m.from + ': ' : '') + snipIcon(m) + esc(snippet(m)) : (id === TEST_THREAD ? 'Sem jde psát ve zkušebním provozu' : 'Zatím žádné zprávy')}</div></div>
        <div class="r">${m ? esc(stamp(m.at)) : ''}<span class="swicons">${mute ? icon('bellOff', 14) : ''}${pin ? `<i class="pinic">${icon('thumbtack', 14)}</i>` : ''}</span></div>
      </a></div>`;
    }).join('') + pollRows(polls) + (noDm.length ? `<div class="section-h">Napsat</div><div class="chips">${noDm.map((n) => `<a class="chip" href="#/chat/${encodeURIComponent(dmThreadId(me, n))}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px;color:inherit;text-decoration:none">${avatar(n, 22)}${esc(n)}</a>`).join('')}</div>` : '');
  };

  // Nastavení vláken (ztlumení, připnutí, smazání) — chats/{id}.
  const unsubMeta = onSnapshot(collection(db, 'chats'), (s) => {
    metas = {}; s.docs.forEach((d) => { metas[d.id] = d.data(); }); if (alive) draw();
  }, () => {});
  const metaRef = (id) => (id === TEST_THREAD ? doc(db, 'v2_chats', TEST_THREAD) : doc(db, 'chats', id));
  const setMeta = (id, field, val) => {
    metas[id] = { ...M(id), [field]: { ...(M(id)[field] || {}), [me]: val } };
    openId = null; draw();
    return setDoc(metaRef(id), { [field]: { [me]: val } }, { merge: true }).catch(() => toast('Nepovedlo se uložit.'));
  };

  // Odsunutí řádku doleva odkryje tlačítka (jako ve WhatsAppu).
  const W = (row) => row.querySelector('.swact').offsetWidth;
  let sx = 0, sy = 0, dx = 0, cur = null, axis = null, moved = false;
  box.addEventListener('touchstart', (e) => {
    const f = e.target.closest('.swfront');
    if (!f || e.touches.length !== 1) return;
    cur = f.parentElement; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; axis = null; moved = false;
  }, { passive: true });
  box.addEventListener('touchmove', (e) => {
    if (!cur) return;
    const x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
    if (!axis) { if (Math.abs(x) < 8 && Math.abs(y) < 8) return; axis = Math.abs(x) > Math.abs(y) ? 'x' : 'y'; }
    if (axis !== 'x') { cur = null; return; }
    if (e.cancelable) e.preventDefault();
    dragging = true; moved = true;
    const w = W(cur), base = cur.classList.contains('open') ? -w : 0;
    dx = Math.max(-w - 30, Math.min(0, base + x));
    const f = cur.querySelector('.swfront');
    f.style.transition = 'none'; f.style.transform = `translateX(${dx}px)`;
  }, { passive: false });
  const end = () => {
    if (!cur) return;
    const row = cur, f = row.querySelector('.swfront'), w = W(row);
    cur = null;
    if (!moved) return;
    f.style.transition = ''; f.style.transform = '';
    const open = dx < -w / 2;
    box.querySelectorAll('.swrow.open').forEach((r) => { if (r !== row) r.classList.remove('open'); });
    row.classList.toggle('open', open);
    openId = open ? row.dataset.sw : null;
    setTimeout(() => { dragging = false; if (pending) { pending = false; draw(); } }, 50);
  };
  box.addEventListener('touchend', end);
  box.addEventListener('touchcancel', end);

  box.addEventListener('click', async (e) => {
    if (e.target.closest('[data-newpoll]')) { e.preventDefault(); newPollSheet(); return; }
    const front = e.target.closest('.swfront');
    if (front && (moved || front.parentElement.classList.contains('open'))) {
      // Klepnutí při odsunutí jen zavře řádek, nikam nenaviguje.
      e.preventDefault(); moved = false;
      front.parentElement.classList.remove('open'); openId = null; return;
    }
    if (!front && openId && !e.target.closest('.swact')) { box.querySelectorAll('.swrow.open').forEach((r) => r.classList.remove('open')); openId = null; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('[data-sw]').dataset.sw;
    if (b.dataset.act === 'mute') { const on = !isMuted(id); await setMeta(id, 'muted', on); toast(on ? 'Chat ztlumený' : 'Notifikace zapnuté'); }
    else if (b.dataset.act === 'pin') { const on = !isPinned(id); await setMeta(id, 'pinnedBy', on); toast(on ? 'Chat připnutý' : 'Chat odepnutý'); }
    else if (b.dataset.act === 'del') {
      if (!await confirmDanger('Smazat chat?', 'Zmizí jen u tebe. Když přijde nová zpráva, chat se znovu objeví — se staršími zprávami skrytými.', 'Smazat')) return;
      await setMeta(id, 'hiddenBy', new Date().toISOString()); toast('Chat smazaný');
    }
  });

  // Kdo je online (zelená tečka u avataru).
  const unsubP = watchPresence((m) => { pres = m; if (alive) draw(); });
  const presTick = setInterval(() => { if (alive) draw(); }, 30000);

  // Poslední zpráva v každém vlákně (Celá parta a test živě, soukromá jednorázově).
  const unsubs = [];
  for (const id of threads) {
    const q = query(collection(db, ...threadPath(id)), orderBy('at', 'desc'), limit(1));
    if (id === PARTY_THREAD || id === TEST_THREAD) {
      unsubs.push(onSnapshot(q, (s) => { last.set(id, s.docs[0] ? s.docs[0].data() : null); if (alive) draw(); }, () => {}));
    } else {
      getDocs(q).then((s) => { if (s.docs[0]) { last.set(id, s.docs[0].data()); if (alive) draw(); } }).catch(() => {});
    }
  }
  draw();
  return () => { alive = false; unsubP(); unsubPolls(); unsubMeta(); clearInterval(presTick); unsubs.forEach((u) => u()); };
}

// ---------- konverzace ----------
let tallFixOn = false;

export function renderThread(root, { id }) {
  const me = myName();
  const group = id === PARTY_THREAD || id === TEST_THREAD;
  const writable = canWriteThread(id);
  let msgs = [], replyTo = null, first = true;

  root.innerHTML = `<div class="screen chatscreen">
    <div class="top chattop">
      <a class="ibtn" href="#/chat" aria-label="Zpět">${icon('back')}</a>
      <div style="flex:1;min-width:0"><div class="h1" style="font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(threadTitle(id))}</div>
        <div class="sub" data-status>${id === PARTY_THREAD ? 'skupinové vlákno' : id === TEST_THREAD ? 'zkušební provoz' : ''}</div></div>
      ${group ? '' : `<a class="ibtn gamebtn" href="#/hry/s/${encodeURIComponent(threadTitle(id))}" aria-label="Hry">${icon('gamepad', 22)}</a>`}
      ${group ? '' : '<button class="ibtn ghost" data-poke aria-label="Hipnout" style="display:none">👊</button>'}
    </div>
    <div class="findbar" data-findbar hidden><input class="input" data-findq placeholder="Hledat ve zprávách" aria-label="Hledat ve zprávách" autocomplete="off"><button class="ibtn ghost" data-findx aria-label="Zavřít hledání">${icon('close', 18)}</button></div>
    <div class="pinbar" data-pin hidden></div>
    <div class="msgwrap"><div class="msgs" data-msgs>${spinner()}</div>
      <button class="jumpdown" data-jump hidden aria-label="Na poslední zprávu">${icon('back', 20)}</button></div>
    <div class="composer">
      <div class="replybar" data-reply hidden></div>
      ${writable ? `<div class="inrow">
        <button class="ibtn" data-photo aria-label="Poslat fotku">${icon('photo')}</button>
        <input type="file" accept="image/*" multiple data-file hidden>
        <textarea class="input" rows="1" data-text placeholder="Zpráva" aria-label="Zpráva" maxlength="2000"></textarea>
        <button class="ibtn" data-mic aria-label="Nahrát hlasovku">${icon('mic', 22)}</button>
        <button class="ibtn sendbtn" data-send aria-label="Odeslat" hidden>${icon('next', 22, 2.4)}</button>
      </div>
      <div class="recrow" data-rec hidden><button class="ibtn" data-reccancel aria-label="Zrušit">${icon('close', 18)}</button><span class="recdot"></span><b data-rectime>0:00</b><span class="sub" style="flex:1;margin:0">Nahrávám…</span><button class="ibtn sendbtn" data-recsend aria-label="Odeslat hlasovku">${icon('next', 22, 2.4)}</button></div>` : `<a class="readonly" href="#/chat/${TEST_THREAD}">${icon('lock', 16)} Ve zkušebním provozu se tu jen čte — psát jde do testovacího vlákna</a>`}
    </div>
  </div>`;
  const box = root.querySelector('[data-msgs]');
  // Obrazovka chatu přesně na výšku viditelné plochy (iPhone na ploše jinak
  // nechává dole pruh; s klávesnicí se zmenší, aby pole zprávy zůstalo vidět).
  const scr = root.querySelector('.chatscreen');
  // Výška chatu na iPhonu — stejný postup jako v aplikaci Služby:
  // 1) iPhone na ploše dá stránce menší výšku než displej (dole zůstane pruh).
  //    Jakmile se to jednou zjistí, stránka se po dobu chatu roztáhne na celý
  //    displej a oprava už zůstane zapnutá (po roztažení iOS hlásí plnou výšku,
  //    takže by se jinak přepínala dokola a obrazovka by se třásla).
  // 2) Při vysunuté klávesnici se chat drží přesně viditelné plochy nad ní.
  let vvBase = 0, wasKb = false;
  const fit = () => {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    if (h > vvBase) vvBase = h;
    const kb = !!vv && vvBase - h > 80;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    const extra = Math.round(screen.height - window.innerHeight);
    if (!tallFixOn && !kb && ios && standalone && screen.height > screen.width && window.innerHeight > window.innerWidth && extra > 20 && extra < 120) tallFixOn = true;
    const de = document.documentElement;
    de.classList.toggle('tall-fix', tallFixOn);
    if (tallFixOn) de.style.setProperty('--app-h', screen.height + 'px');
    scr.classList.toggle('kb', kb);
    scr.style.setProperty('--chat-h', Math.round(h) + 'px');
    scr.style.top = kb && vv.offsetTop ? Math.round(vv.offsetTop) + 'px' : '';
    if (kb && !wasKb && box) box.scrollTop = box.scrollHeight;
    wasKb = kb;
  };
  fit();
  // iOS výšku někdy upraví až chvíli po otevření, bez události.
  const fitT = [300, 1000, 2500].map((t) => setTimeout(fit, t));
  const vvT = window.visualViewport || window;
  vvT.addEventListener('resize', fit); vvT.addEventListener('scroll', fit);
  // Soukromá konverzace: online (zelená tečka) nebo kdy byl naposledy aktivní.
  let presUnsub = null, presTick = null, presShow = null;
  if (!group) {
    const other = threadTitle(id);
    const st = root.querySelector('[data-status]');
    let lastIso = null;
    const show = () => { if (st.dataset.typing) return; st.innerHTML = isOnline(lastIso) ? '<i class="onldot inline"></i> online' : esc(lastSeenText(lastIso)); };
    presShow = show;
    presUnsub = watchOne(other, (iso) => { lastIso = iso; show(); });
    presTick = setInterval(show, 30000);
  }
  // Drží se dole, dokud uživatel sám neodroluje nahoru.
  let stick = true;
  // Po odscrolování od poslední zprávy: nahoře hledací pole, dole šipka zpět dolů.
  const jumpBtn = root.querySelector('[data-jump]');
  const onScrollUi = () => {
    const away = box.scrollHeight - box.scrollTop - box.clientHeight;
    stick = away < 120;
    const far = away > 240;
    jumpBtn.hidden = !far;
    const fb = root.querySelector('[data-findbar]');
    if (fb) { if (far && fb.hidden) fb.hidden = false; else if (!far && !findQ && !fb.hidden && document.activeElement !== fb.querySelector('input')) fb.hidden = true; }
  };
  box.addEventListener('scroll', onScrollUi, { passive: true });
  jumpBtn.onclick = () => { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); };

  function draw() {
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    let html = '', lastDay = null;
    const fq = looseName(findQ || '');
    const cut = (meta.hiddenBy || {})[me];
    const vis = cut ? msgs.filter((m) => (toDate(m.at)?.getTime() || 0) > new Date(cut).getTime()) : msgs;
    const list = fq ? vis.filter((m) => looseName(m.text || '').includes(fq)) : vis;
    // Kdo si co přečetl: u poslední mé zprávy („Přečteno 14:05“ / „Viděli: …“).
    const lastMine = [...msgs].reverse().find((m) => norm(m.from) === norm(me));
    const seenMap = meta.lastSeen || {};
    list.forEach((m, i) => {
      // Fotky poslané najednou (stejné batch od stejného odesílatele) → jedna mřížka.
      const prevB = list[i - 1];
      if (m.batch && m.image && prevB && prevB.batch === m.batch && prevB.image && prevB.from === m.from) return;
      let batchImgs = null;
      if (m.batch && m.image) {
        batchImgs = [m];
        for (let j = i + 1; j < list.length && list[j].batch === m.batch && list[j].image && list[j].from === m.from; j++) batchImgs.push(list[j]);
        if (batchImgs.length < 2) batchImgs = null;
      }
      const d = toDate(m.at) || new Date(0);
      if (!lastDay || !sameDay(d, lastDay)) {
        const dd = dayDiff(d, new Date());
        html += `<div class="daysep">${dd === 0 ? 'Dnes' : dd === 1 ? 'Včera' : `${DAYS_FULL[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`}</div>`;
        lastDay = d;
      }
      const mine = norm(m.from) === norm(me);
      const prev = list[i - 1];
      const showName = group && !mine && (!prev || prev.from !== m.from || !sameDay(toDate(prev.at) || d, d));
      const reacts = sortedReactions(m.reactions).map(([e, l]) =>
        `<button class="react ${l.includes(me) ? 'on' : ''}" data-react="${esc(e)}" data-id="${esc(m.id)}">${emo(e, 16)}<span>${l.length}</span></button>`).join('');
      html += `<div class="msg ${mine ? 'mine' : ''}" data-id="${esc(m.id)}">
        ${!mine && group ? (showName ? avatar(m.from || '?', 28) : '<span class="avsp"></span>') : ''}
        <div class="mcol">
          ${showName ? `<div class="mname">${esc(m.from || '?')}</div>` : ''}
          ${m.game ? gameCardHtml(m.game, gamesMap.get(m.game.id), me) : `<div class="bubble ${m.image || m.audio ? 'media' : ''}">
            ${m.forwardedFrom ? `<div class="fwd">přeposláno od ${esc(m.forwardedFrom)}</div>` : ''}
            ${m.replyTo ? `<div class="quote"><b>${esc(m.replyTo.from || '')}</b><span>${esc(m.replyTo.snippet || '')}</span></div>` : ''}
            ${batchImgs ? photoGrid(batchImgs) : m.image ? `<img src="${esc(m.image)}" alt="" data-photo-id="${esc(m.id)}">` : ''}
            ${m.audio ? `<audio controls preload="metadata" src="${esc(m.audio)}"></audio>` : ''}
            ${m.text ? `<div class="mtext">${esc(m.text).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`).replace(/\n/g, '<br>')}</div>` : ''}
          </div>`}
          <div class="mmeta">${meta.pinned && meta.pinned.msgId === m.id ? `<i class="pinic">${icon('thumbtack', 12)}</i> ` : ''}${esc(fmtTime(d))}${m.edited ? ' · upraveno' : ''}${m.audioDuration ? ' · ' + Math.floor(m.audioDuration / 60) + ':' + String(m.audioDuration % 60).padStart(2, '0') : ''}</div>
          ${reacts ? `<div class="reacts">${reacts}</div>` : ''}
          ${!fq && lastMine && m.id === lastMine.id ? seenLine(m, seenMap) : ''}
        </div>
      </div>`;
    });
    box.innerHTML = html || `<div class="empty">${fq ? 'Nic nenalezeno.' : 'Zatím žádné zprávy.'}</div>`;
    if (fq) return;
    if (first || nearBottom) {
      // Na konec (nejnovější zprávy); znovu po načtení fotek, které výšku změní.
      const toEnd = () => { box.scrollTop = box.scrollHeight; };
      toEnd(); requestAnimationFrame(toEnd);
      box.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { if (stick) toEnd(); }, { once: true }); });
      first = false;
    }
  }

  // Mřížka fotek: 2 vedle sebe, 3 = velká + dvě, 4+ = 2×2 a „+N“ na poslední.
  function photoGrid(imgs) {
    const n = imgs.length, show = imgs.slice(0, 4);
    return `<div class="pgrid n${Math.min(n, 4)}">${show.map((x, k) => `<div class="pcell"><img src="${esc(x.image)}" alt="" loading="lazy" data-photo-id="${esc(x.id)}">${k === 3 && n > 4 ? `<span class="pmore" data-photo-id="${esc(x.id)}">+${n - 4}</span>` : ''}</div>`).join('')}</div>`;
  }

  // Fotka přes celou obrazovku, posouvání do stran po všech fotkách konverzace.
  let menuAt = 0;
  function openViewer(startId) {
    const cut = (meta.hiddenBy || {})[me];
    const all = msgs.filter((m) => m.image && (!cut || (toDate(m.at)?.getTime() || 0) > new Date(cut).getTime()));
    let idx = Math.max(0, all.findIndex((m) => m.id === startId));
    const v = document.createElement('div');
    v.className = 'pviewer';
    v.innerHTML = `<div class="pvtop"><div class="pvinfo" data-pvinfo></div><button class="pvx" data-pvx aria-label="Zavřít">${icon('close', 24)}</button></div>
      <div class="pvtrack" data-pvtrack>${all.map((m) => `<div class="pvslide"><img src="${esc(m.image)}" alt="" loading="lazy" draggable="false"></div>`).join('')}</div>
      <button class="pvnav l" data-pvl aria-label="Předchozí">${icon('back', 24)}</button><button class="pvnav r" data-pvr aria-label="Další">${icon('back', 24)}</button>`;
    document.body.appendChild(v);
    const track = v.querySelector('[data-pvtrack]'), info = v.querySelector('[data-pvinfo]');
    const showInfo = () => {
      const m = all[idx]; const d = toDate(m.at);
      info.innerHTML = `<b>${esc(m.from || '')}</b><span>${d ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} · ${esc(fmtTime(d))}` : ''} · ${idx + 1} / ${all.length}</span>`;
    };
    const go = (i, smooth) => { idx = Math.max(0, Math.min(all.length - 1, i)); track.scrollTo({ left: idx * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' }); showInfo(); };
    requestAnimationFrame(() => go(idx, false));
    let st = 0;
    track.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== idx) { idx = i; showInfo(); } }, 60); }, { passive: true });
    const close = () => { v.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(idx - 1, true); if (e.key === 'ArrowRight') go(idx + 1, true); };
    document.addEventListener('keydown', key);
    v.querySelector('[data-pvx]').onclick = close;
    v.querySelector('[data-pvl]').onclick = () => go(idx - 1, true);
    v.querySelector('[data-pvr]').onclick = () => go(idx + 1, true);
    // Svislé tažení fotky dolů zavře prohlížeč.
    let y0 = null, x0 = 0;
    track.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; } else y0 = null; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (y0 == null) return;
      const t = e.changedTouches[0], dy = t.clientY - y0, dx = t.clientX - x0;
      if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) close();
      y0 = null;
    }, { passive: true });
  }

  function seenLine(m, seen) {
    const at = toDate(m.at);
    if (!at) return '';
    const others = Object.keys(seen).filter((n) => norm(n) !== norm(me) && toDate(seen[n]) >= at);
    if (!others.length) return '';
    if (!group) { const t = toDate(seen[others[0]]); return `<div class="seen">Přečteno ${sameDay(t, new Date()) ? fmtTime(t) : t.getDate() + '. ' + (t.getMonth() + 1) + '. ' + fmtTime(t)}</div>`; }
    return `<div class="seen">Viděli: ${esc(others.slice(0, 6).join(', '))}${others.length > 6 ? ' +' + (others.length - 6) : ''}</div>`;
  }

  // Dokument vlákna chats/{id}: lastSeen (přečtení), typing (píše…), muted
  // (ztlumené notifikace), pinned (připnutá zpráva) — stejné jako stará aplikace.
  let meta = {}, findQ = '';
  // Hry v tomhle vlákně (stav pro karty ve zprávách).
  const gamesMap = new Map();
  const unsubGames = group ? () => {} : onSnapshot(query(collection(db, 'v2_games'), where('thread', '==', id)), (s) => { gamesMap.clear(); s.docs.forEach((d) => gamesMap.set(d.id, { id: d.id, ...d.data() })); draw(); }, () => {});
  const threadRef = doc(db, ...threadPath(id).slice(0, -1));
  const unsubMeta = onSnapshot(threadRef, (s) => { meta = s.exists() ? s.data() : {}; drawMeta(); draw(); }, () => {});
  const pinEl = root.querySelector('[data-pin]');
  const statusEl = root.querySelector('[data-status]');
  function drawMeta() {
    const p = meta.pinned;
    pinEl.hidden = !p;
    if (p) pinEl.innerHTML = `<button data-pingo><i class="pinic">${icon('thumbtack', 14)}</i> <b>${esc(p.from || '')}:</b> ${esc(p.text ? p.text.slice(0, 70) : p.image ? 'fotka' : '')}</button><button class="ibtn ghost" data-unpin aria-label="Odepnout">${icon('close', 16)}</button>`;
    // „píše…“
    const typers = Object.entries(meta.typing || {}).filter(([n, t]) => norm(n) !== norm(me) && Date.now() - (toDate(t)?.getTime() || 0) < 6000).map(([n]) => n);
    if (typers.length) { statusEl.dataset.typing = '1'; statusEl.textContent = group ? typers.join(', ') + ' píše…' : 'píše…'; }
    else if (statusEl.dataset.typing) { delete statusEl.dataset.typing; statusEl.textContent = group ? (id === PARTY_THREAD ? 'skupinové vlákno' : '') : ''; if (!group && presShow) presShow(); }
  }
  const typingTick = setInterval(() => { if (meta.typing) drawMeta(); }, 3000);
  pinEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-unpin]')) { setDoc(threadRef, { pinned: null }, { merge: true }).catch(() => {}); return; }
    if (e.target.closest('[data-pingo]') && meta.pinned) {
      const el = box.querySelector(`[data-id="${CSS.escape(meta.pinned.msgId)}"]`);
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); }
    }
  });
  // Hledání ve zprávách
  const findBar = root.querySelector('[data-findbar]');
  findBar.querySelector('[data-findx]').onclick = () => { findBar.hidden = true; findQ = ''; findBar.querySelector('input').value = ''; first = true; draw(); };
  findBar.querySelector('input').addEventListener('input', (e) => { findQ = e.target.value.trim(); if (!findQ) first = true; draw(); });
  // Hipnutí (šťouchnutí) — cloudová funkce pošle notifikaci „👊 Hipnutí“
  const pokeBtn = root.querySelector('[data-poke]');
  if (pokeBtn) pokeBtn.onclick = async () => {
    try { await addDoc(collection(db, 'pokes'), { from: me, to: norm(threadTitle(id)), type: 'poke', at: new Date().toISOString(), via: 'v2' }); toast(`Hipnul(a) jsi ${threadTitle(id)} 👊`); }
    catch (x) { toast('Nepovedlo se.'); }
  };
  // Přečtení: kdy jsem vlákno naposledy viděl
  let seenT = 0;
  const markSeen = () => {
    if (document.hidden || Date.now() - seenT < 4000) return;
    seenT = Date.now();
    setDoc(threadRef, { lastSeen: { [me]: new Date().toISOString() } }, { merge: true }).catch(() => {});
  };
  const onVis = () => { if (!document.hidden) { seenT = 0; markSeen(); } };
  document.addEventListener('visibilitychange', onVis);

  const q = query(collection(db, ...threadPath(id)), orderBy('at'));
  const unsub = onSnapshot(q, (s) => { msgs = s.docs.map((d) => ({ id: d.id, ...d.data() })); draw(); markSeen(); },
    (err) => { console.error('Chat:', err); box.innerHTML = '<div class="empty">Zprávy se nepodařilo načíst.</div>'; });

  // Dlouhé podržení zprávy: reakce, odpověď, smazání vlastní.
  let pressT = null;
  box.addEventListener('touchstart', (e) => {
    const el = e.target.closest('.msg');
    if (!el || !writable) return;
    pressT = setTimeout(() => { menuAt = Date.now(); msgMenu(el.dataset.id); }, 450);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((t) => box.addEventListener(t, () => clearTimeout(pressT), { passive: true }));
  box.addEventListener('contextmenu', (e) => { const el = e.target.closest('.msg'); if (el && writable) { e.preventDefault(); msgMenu(el.dataset.id); } });
  box.addEventListener('click', (e) => {
    const ph = e.target.closest('[data-photo-id]');
    if (ph && Date.now() - menuAt > 800) { openViewer(ph.dataset.photoId); return; }
    const r = e.target.closest('[data-react]');
    if (r && writable) toggleReact(r.dataset.id, r.dataset.react);
  });

  async function toggleReact(mid, em) {
    const m = msgs.find((x) => x.id === mid);
    if (!m) return;
    const cur = { ...(m.reactions || {}) };
    const list = new Set(cur[em] || []);
    list.has(me) ? list.delete(me) : list.add(me);
    cur[em] = [...list];
    try { await updateDoc(doc(db, ...threadPath(id), mid), { reactions: cur }); } catch (x) { toast('Nepovedlo se.'); }
  }

  async function msgMenu(mid) {
    const m = msgs.find((x) => x.id === mid);
    if (!m) return;
    const mine = norm(m.from) === norm(me);
    const selected = sortedReactions(m.reactions).filter(([, l]) => l.includes(me)).map(([e]) => e);
    const r = await emojiSheet({ selected, actions: [
      { id: 'reply', label: 'Odpovědět' },
      ...(m.text ? [{ id: 'copy', label: 'Kopírovat text' }] : []),
      ...(mine && m.text ? [{ id: 'edit', label: 'Upravit zprávu' }] : []),
      meta.pinned && meta.pinned.msgId === m.id ? { id: 'unpin', label: 'Odepnout', icon: 'thumbtack' } : { id: 'pin', label: 'Připnout nahoru', icon: 'thumbtack' },
      ...(mine ? [{ id: 'del', label: m.batch && msgs.filter((x) => x.batch === m.batch).length > 1 ? 'Smazat všechny fotky' : 'Smazat zprávu', kind: 'no' }] : [])
    ] });
    if (!r) return;
    if (r.emoji) { toggleReact(mid, r.emoji); return; }
    {
      const a = r.action;
      if (a === 'reply') { replyTo = { id: m.id, from: m.from, snippet: snippet(m).slice(0, 80) }; drawReply(); root.querySelector('[data-text]')?.focus(); }
      if (a === 'copy') { try { await navigator.clipboard.writeText(m.text); toast('Zkopírováno'); } catch (x) { /* nic */ } }
      if (a === 'del') {
        const ids = m.batch ? msgs.filter((x) => x.batch === m.batch && x.from === m.from).map((x) => x.id) : [mid];
        try { await Promise.all(ids.map((x) => deleteDoc(doc(db, ...threadPath(id), x)))); } catch (x) { toast('Nepovedlo se smazat.'); }
      }
      if (a === 'pin') setDoc(threadRef, { pinned: { msgId: m.id, text: m.text || '', image: !!m.image, from: m.from || '', at: m.at || '' } }, { merge: true }).catch(() => toast('Nepovedlo se.'));
      if (a === 'unpin') setDoc(threadRef, { pinned: null }, { merge: true }).catch(() => {});
      if (a === 'edit') editMsg(m);
    }
  }

  function editMsg(m) {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><h3>Upravit zprávu</h3>
      <textarea class="input" rows="4" maxlength="2000" style="height:auto;width:100%">${esc(m.text || '')}</textarea>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px"><button class="btn primary big block" data-ok>Uložit</button><button class="btn block" data-x>Zrušit</button></div></div>`;
    bd.addEventListener('click', async (e) => {
      if (e.target === bd || e.target.closest('[data-x]')) return bd.remove();
      if (e.target.closest('[data-ok]')) {
        const t = bd.querySelector('textarea').value.trim();
        if (!t) return;
        bd.remove();
        try { await updateDoc(doc(db, ...threadPath(id), m.id), { text: t, edited: true }); } catch (x) { toast('Nepovedlo se uložit.'); }
      }
    });
    document.body.appendChild(bd);
    setTimeout(() => bd.querySelector('textarea').focus(), 50);
  }

  function drawReply() {
    const el = root.querySelector('[data-reply]');
    if (!replyTo) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `<div><b>Odpověď: ${esc(replyTo.from)}</b><span>${esc(replyTo.snippet)}</span></div><button data-x aria-label="Zrušit odpověď">${icon('close', 16)}</button>`;
    el.querySelector('[data-x]').onclick = () => { replyTo = null; drawReply(); };
  }

  if (writable) {
    const ta = root.querySelector('[data-text]');
    const sendBtn = root.querySelector('[data-send]'), micBtn = root.querySelector('[data-mic]');
    const grow = () => {
      ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
      const has = !!ta.value.trim(); sendBtn.hidden = !has; micBtn.hidden = has;
    };
    let typT = 0;
    ta.addEventListener('input', () => {
      grow();
      if (ta.value.trim() && Date.now() - typT > 3000) { typT = Date.now(); setDoc(threadRef, { typing: { [me]: new Date().toISOString() } }, { merge: true }).catch(() => {}); }
    });
    // Hlasovky: klepnout = nahrávat, ✓ = odeslat, ✕ = zahodit.
    const inrow = root.querySelector('.composer .inrow'), recRow = root.querySelector('[data-rec]'), recTime = root.querySelector('[data-rectime]');
    let rec = null, recTick = null;
    const recEnd = () => { clearInterval(recTick); recRow.hidden = true; inrow.hidden = false; };
    micBtn.onclick = async () => {
      try { rec = await startRecording(); } catch (x) { toast('Mikrofon není povolený.'); return; }
      inrow.hidden = true; recRow.hidden = false; recTime.textContent = '0:00';
      recTick = setInterval(() => { const sec = Math.round((Date.now() - rec.started) / 1000); recTime.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); if (sec >= 180) root.querySelector('[data-recsend]').click(); }, 250);
    };
    root.querySelector('[data-reccancel]').onclick = () => { if (rec) rec.cancel(); rec = null; recEnd(); };
    root.querySelector('[data-recsend]').onclick = async () => {
      if (!rec) return;
      const { blob, seconds } = rec.stop(); rec = null; recEnd();
      if (seconds < 1) return;
      toast('Odesílám hlasovku…');
      try {
        const url = await uploadFile(`chatAudio/${id}/${Date.now()}_${me}.wav`, blob, 'audio/wav');
        await addDoc(collection(db, ...threadPath(id)), { from: me, audio: url, audioType: 'audio/wav', audioDuration: seconds, at: new Date().toISOString(), via: 'v2', ...(replyTo ? { replyTo } : {}) });
        replyTo = null; drawReply();
      } catch (x) { console.error(x); toast('Hlasovku se nepodařilo odeslat.'); }
    };
    const send = async (extra = {}) => {
      const text = ta.value.trim();
      if (!text && !extra.image) return;
      const payload = { from: me, text, at: new Date().toISOString(), via: 'v2', ...extra, ...(replyTo ? { replyTo } : {}) };
      ta.value = ''; grow(); replyTo = null; drawReply();
      try { await addDoc(collection(db, ...threadPath(id)), payload); box.scrollTop = box.scrollHeight; }
      catch (x) { console.error(x); ta.value = text; toast('Zprávu se nepodařilo odeslat.'); }
    };
    root.querySelector('[data-send]').onclick = () => send();
    const file = root.querySelector('[data-file]');
    root.querySelector('[data-photo]').onclick = () => file.click();
    file.onchange = async () => {
      const files = [...(file.files || [])];
      file.value = '';
      if (!files.length) return;
      if (files.length === 1) {
        try { const img = await shrinkPhoto(files[0], 1024, 300000); await send({ image: img }); } catch (x) { toast('Fotku se nepodařilo odeslat.'); }
        return;
      }
      // Víc fotek: rozepsaný text zvlášť, fotky se společným batch → v chatu jako mřížka.
      if (ta.value.trim()) await send();
      const batch = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      toast(`Odesílám ${files.length} fotek…`);
      for (let k = 0; k < files.length; k++) {
        try {
          const img = await shrinkPhoto(files[k], 1024, 300000);
          await addDoc(collection(db, ...threadPath(id)), { from: me, text: '', image: img, batch, batchIdx: k, at: new Date(Date.now() + k).toISOString(), via: 'v2' });
        } catch (x) { toast('Některou fotku se nepodařilo odeslat.'); }
      }
      box.scrollTop = box.scrollHeight;
    };
  }
  return () => { unsub(); unsubMeta(); unsubGames(); clearInterval(typingTick); document.removeEventListener('visibilitychange', onVis); if (presUnsub) presUnsub(); clearInterval(presTick); vvT.removeEventListener('resize', fit); vvT.removeEventListener('scroll', fit); fitT.forEach(clearTimeout); document.documentElement.classList.remove('tall-fix'); document.documentElement.style.removeProperty('--app-h'); };
}
