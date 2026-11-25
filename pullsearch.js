// Hledání potažením dolů (stejné jako na Akcích): když je obsah nahoře a potáhneš ho dolů,
// ukáže se pole hledání. Zavře se potažením zpět nahoru, nebo zavřením klávesnice, když je prázdné.
// Když je něco napsané a výsledků je víc než na obrazovku, tah po výsledcích je posouvá
// a hledání se zavře tahem po řádku s polem.
import { icon, esc } from './util.js';

export function pullSearch({ scroll, before = scroll, placeholder = 'Hledat', onQuery, skip = null, extra = '', onExtra = null }) {
  const pull = document.createElement('div');
  pull.className = 'pullind'; pull.setAttribute('aria-hidden', 'true');
  pull.innerHTML = `<div class="pullpill">${icon('search', 18)}<span>${esc(placeholder)}</span></div><div class="pulltxt">↓ Táhni dál</div>`;
  const sbox = document.createElement('div');
  sbox.className = 'sboxrow'; sbox.style.display = 'none';
  sbox.innerHTML = `<input class="input" type="search" placeholder="${esc(placeholder)}" aria-label="Hledat" autocomplete="off" enterkeyhint="search">${extra}`;
  if (onExtra) sbox.lastElementChild.addEventListener('click', (e) => { e.preventDefault(); onExtra(); });
  before.before(pull, sbox);
  const input = sbox.querySelector('input'), pullTxt = pull.querySelector('.pulltxt');
  let open = false, q = '';

  const set = (o) => {
    open = o;
    sbox.style.display = o ? 'flex' : 'none';
    if (o) { input.focus(); return; }
    const had = !!q;
    q = ''; input.value = ''; input.blur();
    if (had) onQuery('');
  };
  input.addEventListener('input', () => { q = input.value.trim(); onQuery(q); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  let extraAt = 0;
  sbox.addEventListener('pointerdown', (e) => { if (e.target !== input) extraAt = Date.now(); });
  input.addEventListener('blur', () => setTimeout(() => { if (open && !q && document.activeElement !== input && Date.now() - extraAt > 400) set(false); }, 120));

  const PULL = 70;
  let py0 = 0, px0 = 0, pd = 0, axis = null, pulling = false, closing = false;
  const atTop = () => (scroll.scrollTop || 0) <= 2 && (window.scrollY || 0) <= 2;
  scroll.addEventListener('touchstart', (e) => {
    pulling = false; closing = false; axis = null; pd = 0;
    if (e.touches.length !== 1 || (skip && e.target.closest(skip))) return;
    py0 = e.touches[0].clientY; px0 = e.touches[0].clientX;
    if (open) {
      const scrollable = scroll.scrollHeight > scroll.clientHeight + 4;
      if ((scroll.scrollTop || 0) > 2 || (q && scrollable)) return;
      closing = true; return;
    }
    if (atTop()) pulling = true;
  }, { passive: true });
  scroll.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - py0, dx = e.touches[0].clientX - px0;
    if (closing) {
      if (dy < -8 && Math.abs(dy) > Math.abs(dx) && e.cancelable) e.preventDefault();
      if (dy < -45 && Math.abs(dy) > Math.abs(dx) * 1.3) { closing = false; set(false); }
      else if (dy > 20 || Math.abs(dx) > 40) closing = false;
      return;
    }
    if (!pulling) return;
    if (!axis) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      axis = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.3 ? 'down' : 'no';
      if (axis === 'no') { pulling = false; return; }
    }
    if (e.cancelable) e.preventDefault();
    pd = Math.max(0, dy) * 0.55;
    pull.style.transition = 'none';
    pull.style.height = Math.min(pd, 110) + 'px';
    pull.classList.toggle('ready', pd >= PULL);
    pullTxt.textContent = pd >= PULL ? '↓ Pusť pro hledání' : '↓ Táhni dál';
  }, { passive: false });
  const end = () => {
    closing = false;
    if (!pulling) return;
    pulling = false;
    pull.style.transition = ''; pull.style.height = '0px'; pull.classList.remove('ready');
    if (axis === 'down' && pd >= PULL) set(true);
  };
  scroll.addEventListener('touchend', end);
  scroll.addEventListener('touchcancel', end);
  // Tah nahoru po řádku hledání zavře vždycky.
  let sy0 = null;
  sbox.addEventListener('touchstart', (e) => { sy0 = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  sbox.addEventListener('touchmove', (e) => {
    if (sy0 == null) return;
    const dy = e.touches[0].clientY - sy0;
    if (dy < -8 && e.cancelable) e.preventDefault();
    if (dy < -30) { sy0 = null; set(false); }
  }, { passive: false });
  // Počítač: kolečkem nahoru na začátku stránky.
  let wAcc = 0, wT = 0;
  scroll.addEventListener('wheel', (e) => {
    if (open || !atTop() || e.deltaY >= 0) { wAcc = 0; return; }
    if (Date.now() - wT > 400) wAcc = 0;
    wT = Date.now(); wAcc -= e.deltaY;
    if (wAcc > 160) { wAcc = 0; set(true); }
  }, { passive: true });
  return { close: () => set(false), isOpen: () => open, query: () => q };
}

// Porovnání bez diakritiky a velikosti písmen.
export const nq = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
