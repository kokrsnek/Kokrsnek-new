// Emoji v aplikaci: vlastní sada party („Naše“) + běžné emoji („Běžné“).
// Vlastní emoji se ukládají jako klíč „k:pivo“, běžné jako samotný znak.
import { esc, icon } from './util.js';
import { CUSTOM } from './emoji-data.js';

export { CUSTOM };
export const COMMON = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🍺', '🎉', '👏', '🙏', '😍', '🤔', '😎', '🤮', '💩', '🥳', '🙈', '💪'];
const byId = Object.fromEntries(CUSTOM.map((e) => [e.id, e]));

export const isCustom = (k) => typeof k === 'string' && k.startsWith('k:') && !!byId[k.slice(2)];

// Emoji jako HTML: vlastní jako obrázek v řádku textu, běžné jako text.
export function emo(key, size = 20) {
  if (isCustom(key)) {
    const e = byId[key.slice(2)];
    return `<span class="kemo" title="${esc(e.label)}" style="width:${size}px;height:${size}px"><svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-label="${esc(e.label)}" role="img">${e.svg}</svg></span>`;
  }
  return `<span class="semo" style="font-size:${Math.round(size * 0.9)}px">${esc(key)}</span>`;
}

// Pořadí reakcí: nejdřív podle počtu, vlastní a běžné dohromady.
export function sortedReactions(map) {
  return Object.entries(map || {}).filter(([, l]) => (l || []).length).sort((a, b) => b[1].length - a[1].length);
}

const TAB_KEY = 'kokrsnek2EmoTab';
const getTab = () => { try { return localStorage.getItem(TAB_KEY) || 'nase'; } catch (e) { return 'nase'; } };
const setTab = (t) => { try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* nic */ } };

// Nabídka emoji (spodní list). selected = klíče, které už mám vybrané.
// actions = tlačítka pod emoji [{ id, label, kind }].
// Vrátí { emoji } nebo { action } nebo null.
export function emojiSheet({ selected = [], actions = [], title = '' } = {}) {
  return new Promise((resolve) => {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    let tab = getTab();
    const sel = new Set(selected);
    const grid = () => tab === 'nase'
      ? CUSTOM.map((e) => `<button class="${sel.has('k:' + e.id) ? 'on' : ''}" data-e="k:${e.id}" aria-label="${esc(e.label)}">${emo('k:' + e.id, 34)}</button>`).join('')
      : COMMON.map((e) => `<button class="${sel.has(e) ? 'on' : ''}" data-e="${esc(e)}">${emo(e, 32)}</button>`).join('');
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
      ${title ? `<h3>${esc(title)}</h3>` : ''}
      <div class="emotabs"><button data-tab="nase" class="${tab === 'nase' ? 'on' : ''}">Naše</button><button data-tab="bezne" class="${tab === 'bezne' ? 'on' : ''}">Běžné</button></div>
      <div class="emogrid" data-grid>${grid()}</div>
      ${actions.length ? `<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">${actions.map((a) => `<button class="btn big block ${a.kind || ''}" data-a="${esc(a.id)}">${a.icon ? `<span class="aic">${icon(a.icon, 20)}</span>` : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}
    </div>`;
    const done = (v) => { bd.remove(); resolve(v); };
    bd.addEventListener('click', (e) => {
      if (e.target === bd) return done(null);
      const t = e.target.closest('[data-tab]');
      if (t) {
        tab = t.dataset.tab; setTab(tab);
        bd.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        bd.querySelector('[data-grid]').innerHTML = grid();
        return;
      }
      const em = e.target.closest('[data-e]');
      if (em) return done({ emoji: em.dataset.e });
      const a = e.target.closest('[data-a]');
      if (a) return done({ action: a.dataset.a });
    });
    document.body.appendChild(bd);
  });
}

// Dlouhé podržení prvku (selector) uvnitř boxu → cb(prvek). Funguje i pravým klikem.
export function onLongPress(box, selector, cb, ms = 450) {
  let t = null, x0 = 0, y0 = 0;
  box.addEventListener('touchstart', (e) => {
    const el = e.target.closest(selector);
    if (!el) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    t = setTimeout(() => { t = null; if (navigator.vibrate) navigator.vibrate(10); cb(el); }, ms);
  }, { passive: true });
  box.addEventListener('touchmove', (e) => {
    if (t && (Math.abs(e.touches[0].clientX - x0) > 8 || Math.abs(e.touches[0].clientY - y0) > 8)) { clearTimeout(t); t = null; }
  }, { passive: true });
  ['touchend', 'touchcancel'].forEach((ev) => box.addEventListener(ev, () => { clearTimeout(t); t = null; }, { passive: true }));
  box.addEventListener('contextmenu', (e) => { const el = e.target.closest(selector); if (el) { e.preventDefault(); cb(el); } });
}
