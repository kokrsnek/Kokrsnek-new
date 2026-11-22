// Chat: seznam vláken (Celá parta, soukromé, testovací) a konverzace.
// Skutečná vlákna party (chats/{id}/messages) se čtou. Ve zkušebním provozu
// se píše jen do testovacího vlákna v2_chats/test; s CHAT_LIVE se píše naostro.
import { esc, icon, fmtTime, sameDay, dayDiff, toDate, DAYS_FULL, looseName } from './util.js';
import { tabbar, avatar, toast, spinner } from './ui.js';
import { myName } from './auth.js';
import { TEST_MODE, PARTY_NAMES, CHAT_LIVE } from './config.js';
import { db, collection, doc, query, orderBy, limit, getDocs, onSnapshot, addDoc, updateDoc, deleteDoc } from './firebase.js';
import { shrinkPhoto } from './store.js';
import { isOnline, lastSeenText, watchPresence, watchOne } from './presence.js';

export const PARTY_THREAD = 'parta-vsichni';
const TEST_THREAD = 'test';
const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

const norm = (s) => String(s || '').normalize('NFC').trim();
export const dmThreadId = (a, b) => [norm(a), norm(b)].sort().join('__');

function threadPath(id) {
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
const snippet = (m) => m ? (m.text ? m.text : m.image ? '📷 Fotka' : m.audio ? '🎤 Hlasovka' : '') : '';

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
  let alive = true, pres = {};

  const draw = () => {
    const rows = threads
      .filter((id) => id === PARTY_THREAD || id === TEST_THREAD || last.get(id))
      .sort((a, b) => {
        if (a === PARTY_THREAD) return -1;
        if (b === PARTY_THREAD) return 1;
        return (toDate(last.get(b)?.at)?.getTime() || 0) - (toDate(last.get(a)?.at)?.getTime() || 0);
      });
    const noDm = others.filter((n) => !last.get(dmThreadId(me, n)));
    box.innerHTML = rows.map((id) => {
      const m = last.get(id);
      const title = threadTitle(id);
      const av = id === PARTY_THREAD
        ? `<span class="av" style="background:var(--accent);color:var(--on-accent)">${icon('people', 18)}</span>`
        : id === TEST_THREAD ? `<span class="av" style="background:var(--surface);color:var(--warn-ink)">${icon('chat', 18)}</span>`
        : `<span class="avwrap">${avatar(title, 40)}${isOnline(pres[title]) ? '<i class="onldot"></i>' : ''}</span>`;
      return `<a class="row" href="#/chat/${encodeURIComponent(id)}">
        ${av}
        <div style="min-width:0;flex:1"><div class="t">${esc(title)}${id === TEST_THREAD ? ' <span class="pill test" style="height:20px;font-size:11px">test</span>' : ''}</div>
          <div class="s" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m ? esc((id === PARTY_THREAD && m.from ? m.from + ': ' : '') + snippet(m)) : (id === TEST_THREAD ? 'Sem jde psát ve zkušebním provozu' : 'Zatím žádné zprávy')}</div></div>
        <div class="r">${m ? esc(stamp(m.at)) : ''}</div>
      </a>`;
    }).join('') + (noDm.length ? `<div class="section-h">Napsat</div><div class="chips">${noDm.map((n) => `<a class="chip" href="#/chat/${encodeURIComponent(dmThreadId(me, n))}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px;color:inherit;text-decoration:none">${avatar(n, 22)}${esc(n)}</a>`).join('')}</div>` : '');
  };

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
  return () => { alive = false; unsubP(); clearInterval(presTick); unsubs.forEach((u) => u()); };
}

// ---------- konverzace ----------
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
    </div>
    <div class="msgs" data-msgs>${spinner()}</div>
    <div class="composer">
      <div class="replybar" data-reply hidden></div>
      ${writable ? `<div class="inrow">
        <button class="ibtn" data-photo aria-label="Poslat fotku">${icon('photo')}</button>
        <input type="file" accept="image/*" multiple data-file hidden>
        <textarea class="input" rows="1" data-text placeholder="Zpráva" aria-label="Zpráva" maxlength="2000"></textarea>
        <button class="ibtn sendbtn" data-send aria-label="Odeslat">${icon('next', 22, 2.4)}</button>
      </div>` : `<a class="readonly" href="#/chat/${TEST_THREAD}">${icon('lock', 16)} Ve zkušebním provozu se tu jen čte — psát jde do testovacího vlákna</a>`}
    </div>
  </div>`;
  const box = root.querySelector('[data-msgs]');
  // Obrazovka chatu přesně na výšku viditelné plochy (iPhone na ploše jinak
  // nechává dole pruh; s klávesnicí se zmenší, aby pole zprávy zůstalo vidět).
  const scr = root.querySelector('.chatscreen');
  const fit = () => {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    // Bez klávesnice sahá chat přes celý displej (top:0 + bottom:0 v CSS),
    // výška z JS se použije jen při otevřené klávesnici.
    const kb = !!vv && h < window.innerHeight - 120;
    scr.classList.toggle('kb', kb);
    // iPhone na ploše: iOS dá stránce menší výšku než má displej a dole
    // zůstane prázdný pruh. Chat se proto natáhne až k fyzické dolní hraně
    // (stejná oprava jako v aplikaci Služby).
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    const extra = Math.round(screen.height - window.innerHeight);
    const tall = !kb && ios && standalone && screen.height > screen.width && extra > 20 && extra < 120;
    scr.style.bottom = tall ? `-${extra}px` : '';
    scr.style.setProperty('--chat-h', Math.round(h) + 'px');
    scr.style.transform = kb && vv.offsetTop ? `translateY(${Math.round(vv.offsetTop)}px)` : '';
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 120) box.scrollTop = box.scrollHeight;
  };
  fit();
  // iOS výšku někdy upraví až chvíli po otevření, bez události.
  const fitT = [300, 1000, 2500].map((t) => setTimeout(fit, t));
  const vvT = window.visualViewport || window;
  vvT.addEventListener('resize', fit); vvT.addEventListener('scroll', fit);
  // Soukromá konverzace: online (zelená tečka) nebo kdy byl naposledy aktivní.
  let presUnsub = null, presTick = null;
  if (!group) {
    const other = threadTitle(id);
    const st = root.querySelector('[data-status]');
    let lastIso = null;
    const show = () => { st.innerHTML = isOnline(lastIso) ? '<i class="onldot inline"></i> online' : esc(lastSeenText(lastIso)); };
    presUnsub = watchOne(other, (iso) => { lastIso = iso; show(); });
    presTick = setInterval(show, 30000);
  }
  // Drží se dole, dokud uživatel sám neodroluje nahoru.
  let stick = true;
  box.addEventListener('scroll', () => { stick = box.scrollHeight - box.scrollTop - box.clientHeight < 120; }, { passive: true });

  function draw() {
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    let html = '', lastDay = null;
    msgs.forEach((m, i) => {
      const d = toDate(m.at) || new Date(0);
      if (!lastDay || !sameDay(d, lastDay)) {
        const dd = dayDiff(d, new Date());
        html += `<div class="daysep">${dd === 0 ? 'Dnes' : dd === 1 ? 'Včera' : `${DAYS_FULL[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`}</div>`;
        lastDay = d;
      }
      const mine = norm(m.from) === norm(me);
      const prev = msgs[i - 1];
      const showName = group && !mine && (!prev || prev.from !== m.from || !sameDay(toDate(prev.at) || d, d));
      const reacts = EMOJIS.filter((e) => (m.reactions?.[e] || []).length).map((e) =>
        `<button class="react ${m.reactions[e].includes(me) ? 'on' : ''}" data-react="${e}" data-id="${esc(m.id)}">${e}<span>${m.reactions[e].length}</span></button>`).join('');
      html += `<div class="msg ${mine ? 'mine' : ''}" data-id="${esc(m.id)}">
        ${!mine && group ? (showName ? avatar(m.from || '?', 28) : '<span class="avsp"></span>') : ''}
        <div class="mcol">
          ${showName ? `<div class="mname">${esc(m.from || '?')}</div>` : ''}
          <div class="bubble ${m.image || m.audio ? 'media' : ''}">
            ${m.forwardedFrom ? `<div class="fwd">přeposláno od ${esc(m.forwardedFrom)}</div>` : ''}
            ${m.replyTo ? `<div class="quote"><b>${esc(m.replyTo.from || '')}</b><span>${esc(m.replyTo.snippet || '')}</span></div>` : ''}
            ${m.image ? `<img src="${esc(m.image)}" alt="">` : ''}
            ${m.audio ? `<audio controls preload="metadata" src="${esc(m.audio)}"></audio>` : ''}
            ${m.text ? `<div class="mtext">${esc(m.text).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`).replace(/\n/g, '<br>')}</div>` : ''}
          </div>
          <div class="mmeta">${esc(fmtTime(d))}${m.edited ? ' · upraveno' : ''}</div>
          ${reacts ? `<div class="reacts">${reacts}</div>` : ''}
        </div>
      </div>`;
    });
    box.innerHTML = html || '<div class="empty">Zatím žádné zprávy.</div>';
    if (first || nearBottom) {
      // Na konec (nejnovější zprávy); znovu po načtení fotek, které výšku změní.
      const toEnd = () => { box.scrollTop = box.scrollHeight; };
      toEnd(); requestAnimationFrame(toEnd);
      box.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { if (stick) toEnd(); }, { once: true }); });
      first = false;
    }
  }

  const q = query(collection(db, ...threadPath(id)), orderBy('at'));
  const unsub = onSnapshot(q, (s) => { msgs = s.docs.map((d) => ({ id: d.id, ...d.data() })); draw(); },
    (err) => { console.error('Chat:', err); box.innerHTML = '<div class="empty">Zprávy se nepodařilo načíst.</div>'; });

  // Dlouhé podržení zprávy: reakce, odpověď, smazání vlastní.
  let pressT = null;
  box.addEventListener('touchstart', (e) => {
    const el = e.target.closest('.msg');
    if (!el || !writable) return;
    pressT = setTimeout(() => msgMenu(el.dataset.id), 450);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach((t) => box.addEventListener(t, () => clearTimeout(pressT), { passive: true }));
  box.addEventListener('contextmenu', (e) => { const el = e.target.closest('.msg'); if (el && writable) { e.preventDefault(); msgMenu(el.dataset.id); } });
  box.addEventListener('click', (e) => {
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

  function msgMenu(mid) {
    const m = msgs.find((x) => x.id === mid);
    if (!m) return;
    const mine = norm(m.from) === norm(me);
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="sheet"><div class="grab"></div>
      <div class="emojirow">${EMOJIS.map((e) => `<button data-e="${e}">${e}</button>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
        <button class="btn big block" data-a="reply">Odpovědět</button>
        ${m.text ? '<button class="btn big block" data-a="copy">Kopírovat text</button>' : ''}
        ${mine ? '<button class="btn big block no" data-a="del">Smazat zprávu</button>' : ''}
      </div></div>`;
    bd.addEventListener('click', async (e) => {
      if (e.target === bd) return bd.remove();
      const em = e.target.closest('[data-e]');
      if (em) { bd.remove(); toggleReact(mid, em.dataset.e); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      bd.remove();
      if (a === 'reply') { replyTo = { id: m.id, from: m.from, snippet: snippet(m).slice(0, 80) }; drawReply(); root.querySelector('[data-text]')?.focus(); }
      if (a === 'copy') { try { await navigator.clipboard.writeText(m.text); toast('Zkopírováno'); } catch (x) { /* nic */ } }
      if (a === 'del') { try { await deleteDoc(doc(db, ...threadPath(id), mid)); } catch (x) { toast('Nepovedlo se smazat.'); } }
    });
    document.body.appendChild(bd);
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
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
    ta.addEventListener('input', grow);
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
      for (const f of files) {
        try { const img = await shrinkPhoto(f, 1024, 300000); await send({ image: img }); } catch (x) { toast('Fotku se nepodařilo odeslat.'); }
      }
    };
  }
  return () => { unsub(); if (presUnsub) presUnsub(); clearInterval(presTick); vvT.removeEventListener('resize', fit); vvT.removeEventListener('scroll', fit); fitT.forEach(clearTimeout); };
}
