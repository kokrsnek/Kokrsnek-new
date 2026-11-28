// Tlačítko + ve spodní liště: Zpráva v chatu, Check-in; správce navíc Přidat akci a Přidat fotoalbum.
import { esc, icon, fmtWhen, looseName } from './util.js';
import { toast, avatar } from './ui.js';
import { PARTY_NAMES, nameLabel } from './config.js';
import { dmThreadId, PARTY_THREAD } from './chat.js';
import { events, isPast, setAlbum } from './store.js';
import { isAdmin, myName } from './auth.js';
import { newCheckin } from './kde.js';

let open = false;

function closeMenu() {
  document.querySelectorAll('.plusmenu, .plusmenu-bd').forEach((el) => el.remove());
  document.querySelectorAll('[data-plus]').forEach((b) => { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); });
  open = false;
}

function openMenu() {
  if (open) return closeMenu();
  open = true;
  document.querySelectorAll('[data-plus]').forEach((b) => { b.classList.add('open'); b.setAttribute('aria-expanded', 'true'); });
  const bd = document.createElement('div');
  bd.className = 'plusmenu-bd';
  bd.onclick = closeMenu;
  const m = document.createElement('div');
  m.className = 'plusmenu';
  m.setAttribute('role', 'menu');
  const adm = isAdmin(); // akce a fotky přidává jen správce
  m.innerHTML = `
    ${adm ? `<button role="menuitem" data-a="akce"><span class="ic" style="background:#2F7A56">${icon('calendar', 24)}</span><span><b>Přidat akci</b><span class="s">nová akce pro partu</span></span></button>` : ''}
    <button role="menuitem" data-a="zprava"><span class="ic" style="background:#C08A2E">${icon('chat', 24)}</span><span><b>Zpráva v chatu</b><span class="s">napiš partě nebo jen někomu</span></span></button>
    <button role="menuitem" data-a="checkin"><span class="ic" style="background:#E2664F">${icon('pin', 24)}</span><span><b>Check-in</b><span class="s">dej partě vědět, kde jsi</span></span></button>
    ${adm ? `<button role="menuitem" data-a="album"><span class="ic" style="background:#5B6CB8">${icon('photo', 24)}</span><span><b>Přidat fotoalbum</b><span class="s">odkaz na fotky k proběhlé akci</span></span></button>` : ''}
    <button role="menuitem" data-a="parta"><span class="ic" style="background:#6B6F76">${icon('gear', 24)}</span><span><b>Parta a nastavení</b><span class="s">členové, vzhled, oznámení</span></span></button>`;
  m.onclick = (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    closeMenu();
    if (b.dataset.a === 'akce') location.hash = '#/nova';
    else if (b.dataset.a === 'zprava') chatFlow();
    else if (b.dataset.a === 'checkin') { if (location.hash.startsWith('#/kde')) newCheckin(); else location.hash = '#/kde/novy'; }
    else if (b.dataset.a === 'parta') location.hash = '#/parta';
    else albumFlow();
  };
  document.body.append(bd, m);
}

// Zpráva v chatu: komu (celá parta nebo jeden člověk) → otevře se konverzace.
function chatFlow() {
  const me = myName();
  const others = PARTY_NAMES.filter((n) => n.normalize('NFC').trim() !== (me || '').normalize('NFC').trim());
  const bd = sheet(`<h3>Komu napíšeš?</h3>
    <div class="pickev" style="margin-bottom:10px"><button data-t="${esc(PARTY_THREAD)}"><span class="ic" style="width:36px;height:36px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center">${icon('people', 18)}</span><b style="flex:1">Celá parta</b></button></div>
    <div class="chips" style="margin-bottom:12px">${others.map((n) => `<button class="chip" data-t="${esc(dmThreadId(me, n))}" style="display:inline-flex;align-items:center;gap:6px;padding-left:4px">${avatar(n, 22)}${esc(nameLabel(n))}</button>`).join('')}</div>
    <button class="btn block" data-close>Zrušit</button>`);
  bd.querySelector('[data-close]').onclick = () => bd.remove();
  bd.querySelector('.sheet').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    bd.remove();
    location.hash = '#/chat/' + encodeURIComponent(b.dataset.t);
  });
}

// Kdo smí k akci přidat album: správce, u testovací akce i její autor.
export const canAddAlbum = (ev) => isAdmin() || (ev.isTest && ev.createdBy === myName());

function sheet(html) {
  document.querySelectorAll('.backdrop[data-album]').forEach((el) => el.remove());
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.dataset.album = '1';
  bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  document.body.appendChild(bd);
  return bd;
}

// Krok 1: výběr akce (nejnovější proběhlé nahoře).
export function albumFlow(preselected = null) {
  if (preselected) return albumLink(preselected);
  const now = new Date();
  const list = events.list.filter((e) => e.start <= now && canAddAlbum(e)).sort((a, b) => b.start - a.start);
  if (!list.length) {
    toast(isAdmin() ? 'Zatím žádné proběhlé akce.' : 'Ve zkušebním provozu přidává alba jen správce.');
    return;
  }
  const bd = sheet(`<h3>Ke které akci?</h3>
    <input class="input" type="search" placeholder="Hledat akci" aria-label="Hledat akci">
    <div class="pickev" data-list></div>
    <button class="btn block" data-close>Zrušit</button>`);
  const input = bd.querySelector('input');
  const box = bd.querySelector('[data-list]');
  const draw = () => {
    const q = looseName(input.value);
    const f = list.filter((e) => !q || looseName(e.title).includes(q) || looseName(e.place).includes(q)).slice(0, 40);
    box.innerHTML = f.length ? f.map((e) => `<button data-id="${esc(e.id)}">
        <span style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.title)}</b><span class="s">${esc(fmtWhen(e))}${e.start.getFullYear() !== now.getFullYear() ? ' ' + e.start.getFullYear() : ''}</span></span>
        ${e.photoAlbum ? `<span style="color:var(--accent-text)" title="Album už má">${icon('photo', 18)}</span>` : ''}
      </button>`).join('') : '<div class="sub" style="text-align:center;padding:16px">Nic nenalezeno.</div>';
  };
  input.addEventListener('input', draw);
  box.onclick = (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    albumLink(list.find((x) => x.id === b.dataset.id));
  };
  bd.querySelector('[data-close]').onclick = () => bd.remove();
  draw();
}

// Krok 2: odkaz na album.
function albumLink(ev) {
  const bd = sheet(`<h3>Fotoalbum</h3><p>${esc(ev.title)} · ${esc(fmtWhen(ev))}</p>
    <input class="input" type="url" inputmode="url" placeholder="https://photos.app.goo.gl/…" aria-label="Odkaz na album" value="${esc(ev.photoAlbum || '')}">
    <div class="err" role="alert" style="margin:8px 0"></div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn primary big block" data-save>Uložit album</button>
      <button class="btn block" data-close>Zrušit</button>
    </div>`);
  const input = bd.querySelector('input');
  const err = bd.querySelector('.err');
  setTimeout(() => input.focus(), 50);
  bd.querySelector('[data-close]').onclick = () => bd.remove();
  bd.querySelector('[data-save]').onclick = async (e) => {
    const url = input.value.trim();
    if (!/^https?:\/\/\S+$/.test(url)) { err.textContent = 'Vlož celý odkaz začínající https://'; return; }
    e.target.disabled = true;
    try {
      await setAlbum(ev, url);
      bd.remove();
      toast('Album uloženo 📸');
      location.hash = '#/akce/' + encodeURIComponent(ev.id);
    } catch (x) {
      console.error(x);
      err.textContent = 'Nepovedlo se uložit (' + (x.code || x.message) + ').';
      e.target.disabled = false;
    }
  };
}

// Jedno zachytávání kliknutí pro tlačítko + na všech obrazovkách.
export function installPlus() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-plus]')) { e.preventDefault(); openMenu(); }
  });
  window.addEventListener('hashchange', closeMenu);
}
