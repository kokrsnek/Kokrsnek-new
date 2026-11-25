// Společné prvky rozhraní: toast, dialogy, lišta dole, avatar.
import { esc, icon, initial, avatarColor } from './util.js';

let toastTimer = null;
export function toast(text, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}

// Spodní dialog s tlačítky. buttons: [{ label, value, kind: 'primary'|'yes'|'no'|'danger'|'' }]
// Vrací hodnotu stisknutého tlačítka, při zavření mimo dialog null.
export function choose({ title, text = '', buttons }) {
  return new Promise((resolve) => {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grab"></div>
      <h3>${esc(title)}</h3>
      ${text ? `<p>${esc(text)}</p>` : ''}
      <div style="display:flex;flex-direction:column;gap:10px">
        ${buttons.map((b, i) => `<button class="btn block big ${b.kind || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}
      </div>
    </div>`;
    const done = (v) => { bd.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };
    bd.addEventListener('click', (e) => {
      if (e.target === bd) return done(null);
      const b = e.target.closest('[data-i]');
      if (b) done(buttons[+b.dataset.i].value);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bd);
    bd.querySelector('button')?.focus();
  });
}

// Ano / Ne / Zrušit — stejně jako u Dojdu/Nedojdu ve staré aplikaci.
export async function confirmYesNo(question) {
  const v = await choose({
    title: question,
    buttons: [
      { label: 'Ano', value: 'yes', kind: 'primary' },
      { label: 'Ne', value: 'no' },
      { label: 'Zrušit', value: 'cancel', kind: 'dashed' }
    ]
  });
  return v || 'cancel';
}

export async function confirmDanger(title, text, label = 'Smazat') {
  const v = await choose({ title, text, buttons: [{ label, value: true, kind: 'no' }, { label: 'Zrušit', value: false }] });
  return v === true;
}

// Profilové fotky (v2_avatars/{jméno}) — když ji člověk má, ukáže se místo písmena.
const avatarImgs = new Map();
const avStyle = (n) => { const img = avatarImgs.get(n); return img ? `;background-image:url('${img}')` : ''; };
export function setAvatarImages(map) {
  avatarImgs.clear();
  Object.entries(map).forEach(([n, img]) => { if (img) avatarImgs.set(n, img); });
  // Doplnit / odebrat fotky u už vykreslených avatarů.
  document.querySelectorAll('[data-avn]').forEach((el) => {
    const img = avatarImgs.get(el.dataset.avn);
    el.classList.toggle('img', !!img);
    el.style.backgroundImage = img ? `url('${img}')` : '';
  });
}
export const avatarImage = (name) => avatarImgs.get(name) || null;

export function avatar(name, size = 34) {
  const fs = Math.round(size * 0.4);
  const has = avatarImgs.has(name);
  return `<span class="av${has ? ' img' : ''}" data-avn="${esc(name)}" style="width:${size}px;height:${size}px;font-size:${fs}px;background-color:${avatarColor(name)}${avStyle(name)}">${esc(initial(name))}</span>`;
}

export function faces(names, max = 5) {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return `<div class="faces">${shown.map((n) => `<span class="face${avatarImgs.has(n) ? ' img' : ''}" data-avn="${esc(n)}" title="${esc(n)}" style="background-color:${avatarColor(n)}${avStyle(n)}">${esc(initial(n))}</span>`).join('')}${more > 0 ? `<span class="face" style="background:var(--surface);color:var(--ink2)">+${more}</span>` : ''}</div>`;
}

const TABS = [
  { id: 'akce', label: 'Akce', icon: 'calendar', href: '#/akce' },
  { id: 'kde', label: 'Kde jsi?', icon: 'pin', href: '#/kde' },
  null, // místo pro tlačítko +
  { id: 'chat', label: 'Chat', icon: 'chat', href: '#/chat' },
  { id: 'fotky', label: 'Fotky', icon: 'camera', href: '#/fotky' }
];
export function tabbar(active) {
  return `<div class="tabbar"><nav aria-label="Hlavní menu">${TABS.map((t) => t
    ? `<a href="${t.href}" class="${t.id === active ? 'on' : ''}" ${t.id === active ? 'aria-current="page"' : ''}>${icon(t.icon, 24, 2)}<span>${t.label}</span></a>`
    : `<button class="plus" data-plus aria-label="Přidat" aria-expanded="false">${icon('plus', 28, 2.4)}</button>`
  ).join('')}</nav></div>`;
}

export const spinner = () => '<div class="spin" aria-label="Načítám"></div>';

// Spodní nabídky (.sheet): klepnutí na čárku nahoře zavře, potažení dolů taky.
// Zavírá se „klepnutím na pozadí“, takže každá nabídka se uklidí po svém
// (např. choose() vrátí null).
export function installSheetGestures() {
  let sheet = null, y0 = 0, dy = 0, moved = false, fromGrab = false;
  const close = (s) => {
    const bd = s.closest('.backdrop');
    if (!bd) return;
    s.style.transition = 'transform .2s ease-in';
    s.style.transform = 'translateY(110%)';
    setTimeout(() => bd.dispatchEvent(new MouseEvent('click', { bubbles: true })), 190);
  };
  document.addEventListener('touchstart', (e) => {
    const s = e.target.closest('.sheet');
    if (!s) return;
    fromGrab = !!e.target.closest('.grab');
    // Táhnout jde za čárku, za horní okraj nabídky, nebo kdekoli, když je obsah odscrollovaný nahoru.
    const r = s.getBoundingClientRect();
    const t = e.touches[0];
    if (!fromGrab && t.clientY - r.top > 70 && s.scrollTop > 0) return;
    if (!fromGrab && e.target.closest('input, textarea, select')) return;
    sheet = s; y0 = t.clientY; dy = 0; moved = false;
    s.style.transition = 'none';
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!sheet) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 6) moved = true;
    if (moved && dy > 0 && (sheet.scrollTop <= 0 || fromGrab)) {
      sheet.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!sheet) return;
    const s = sheet; sheet = null;
    if (moved && dy > 90) { close(s); return; }
    s.style.transition = 'transform .2s ease-out';
    s.style.transform = '';
  });
  // Klepnutí (i myší) na čárku.
  document.addEventListener('click', (e) => {
    const g = e.target.closest('.sheet .grab');
    if (g) close(g.closest('.sheet'));
  });
}

// ---------- přesun na konkrétní místo (např. z profilu) ----------
// goFocus uloží, co se má po otevření obrazovky najít; runFocus (volá app.js
// po každém přepnutí obrazovky) počká, až se prvek vykreslí, posune k němu a krátce ho zvýrazní.
const FOCUS_KEY = 'kokrsnek2Focus';
export function goFocus(hash, sel = '', click = '', replace = false) {
  try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ sel, click, at: Date.now() })); } catch (e) { /* nic */ }
  if (replace) location.replace(hash); else location.hash = hash;
}
// Bez přesměrování (např. před history.back): obrazovka, která se otevře, najde prvek.
// quiet = nehlásit, když se nenajde (starší check-in nemusí být ve Feedu načtený).
export function setFocus(sel, quiet = false) {
  try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ sel, click: '', quiet, at: Date.now() })); } catch (e) { /* nic */ }
}
export function runFocus() {
  let f = null;
  try { f = JSON.parse(sessionStorage.getItem(FOCUS_KEY) || 'null'); sessionStorage.removeItem(FOCUS_KEY); } catch (e) { /* nic */ }
  if (!f || Date.now() - f.at > 15000) return;
  if (!f.sel) { window.scrollTo(0, 0); return; }
  const t0 = Date.now();
  let clicked = false;
  const timer = setInterval(() => {
    const el = document.querySelector(f.sel);
    if (!el || !el.offsetParent) {
      if (Date.now() - t0 > 8000) { clearInterval(timer); if (!f.quiet) toast('Tohle místo se nepodařilo najít — možná je moc staré nebo smazané.'); }
      return;
    }
    clearInterval(timer);
    if (f.click && !clicked) { clicked = true; const c = el.querySelector(f.click); if (c) c.click(); }
    const target = el.closest('.msg') || el;
    const go = () => { const n = document.querySelector(f.sel); const t = n ? (n.closest('.msg') || n) : target; t.scrollIntoView({ block: 'center', behavior: 'smooth' }); return t; };
    setTimeout(() => {
      const t = go();
      t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash');
      setTimeout(go, 900);
      setTimeout(() => t.classList.remove('flash'), 2600);
    }, 450);
  }, 150);
}
