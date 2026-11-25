// Přechody mezi obrazovkami (používá app.js → mount).
// Karty dole: prolnutí s malým posunem podle pořadí. Kalendář: rozbalí se z ikony.
// Ostatní (nastavení, detail, profil, hry…): přijede zprava, předchozí ustoupí a ztmavne;
// zpět obráceně. Stará obrazovka se na dobu přechodu přesune do pevné vrstvy navrchu/pod.
const TABS = ['/akce', '/kde', '/chat', '/fotky'];
const tabOf = (p) => (p === '/akce' ? 0 : /^\/kde(\/mapa|\/mista)?$/.test(p) ? 1 : p === '/chat' ? 2 : p === '/fotky' ? 3 : -1);
const isCal = (p) => /^\/kalendar/.test(p || '');
let navStack = [], lastPath = null, lastMountAt = 0;
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function navKind(path) {
  const prev = lastPath;
  const quick = Date.now() - lastMountAt < 450;   // přesměrování (location.replace) hned po otevření
  lastPath = path; lastMountAt = Date.now();
  if (!prev) { navStack = [path]; return null; }
  if (tabOf(path) >= 0) {
    const kind = tabOf(prev) >= 0 ? { k: 'tab', dir: tabOf(path) >= tabOf(prev) ? 1 : -1 } : { k: 'pop', cal: isCal(prev) };
    navStack = [path];
    return quick ? null : kind;
  }
  if (isCal(path) && isCal(prev)) { navStack[navStack.length - 1] = path; return null; }
  if (quick) { navStack[navStack.length - 1] = path; return null; }
  if (navStack.length >= 2 && navStack[navStack.length - 2] === path) { navStack.pop(); return { k: 'pop', cal: isCal(prev) }; }
  navStack.push(path);
  return { k: 'push', cal: isCal(path) };
}

function paintBg(el) {
  const b = getComputedStyle(document.body), h = getComputedStyle(document.documentElement);
  const clear = (c) => !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  el.style.backgroundColor = clear(b.backgroundColor) ? (clear(h.backgroundColor) ? 'var(--bg)' : h.backgroundColor) : b.backgroundColor;
  el.style.backgroundImage = b.backgroundImage !== 'none' ? b.backgroundImage : h.backgroundImage;
}


// Před vykreslením nové obrazovky: starou přesunout do pevné vrstvy.
export function navOut(root, path) {
  const kind = path ? navKind(path) : null;
  if (!kind || !root.firstChild || reduceMotion()) return null;
  const r = root.getBoundingClientRect();
  const old = document.createElement('div');
  old.className = 'navold';
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;display:flex;flex-direction:column;min-height:${Math.max(0, innerHeight - r.top)}px;padding-left:${getComputedStyle(root).paddingLeft}`;
  while (root.firstChild) inner.appendChild(root.firstChild);
  old.appendChild(inner);
  document.body.appendChild(old);
  return { kind, old, oldCal: inner.querySelector('a[href="#/kalendar"]') };
}
export function navIn(root, ctx) { if (ctx) animateNav(root, ctx.kind, ctx.old, ctx.oldCal); }

function animateNav(root, kind, old, oldCal) {
  // Lišty s position:fixed (spodní menu) uvnitř posouvané/zvětšované obrazovky
  // Safari na iPhonu po animaci nechá na špatném místě (bílý pruh dole) —
  // během animace jsou schované a po ní se znovu vykreslí.
  const bars = kind.k === 'tab' ? [] : [...root.querySelectorAll('.tabbar')];
  bars.forEach((t) => { t.style.visibility = 'hidden'; });
  let finished = false;
  const done = () => {
    if (finished) return; finished = true;
    old.remove(); root.style.cssText = '';
    bars.forEach((t) => {
      t.style.display = 'none'; void t.offsetHeight; t.style.display = '';
      t.style.visibility = '';
      t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    });
    requestAnimationFrame(() => window.scrollTo(window.scrollX, window.scrollY));
  };
  const A = (el, kf, ms, ease = 'cubic-bezier(.25,.8,.25,1)') => el.animate(kf, { duration: ms, easing: ease });
  try {
    if (kind.k === 'tab') {
      // nová lišta dole už je na místě; ze staré vrstvy ji schovat
      old.querySelectorAll('.tabbar').forEach((t) => { t.style.visibility = 'hidden'; });
      old.style.zIndex = '40';
      A(old, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-kind.dir * 16}px)` }], 180).onfinish = done;
      [...root.querySelectorAll('.screen > :not(.tabbar)')].forEach((el) => A(el, [{ opacity: 0, transform: `translateX(${kind.dir * 16}px)` }, { opacity: 1, transform: 'none' }], 220));
      setTimeout(done, 400);
      return;
    }
    if (kind.k === 'push' && kind.cal) {
      const ic = oldCal && oldCal.getBoundingClientRect();
      old.style.zIndex = '0';
      root.style.position = 'relative'; root.style.zIndex = '41'; paintBg(root);
      if (ic) root.style.transformOrigin = `${ic.left + ic.width / 2 - root.getBoundingClientRect().left}px ${ic.top + ic.height / 2}px`;
      A(root, [{ opacity: 0, transform: 'scale(.15)', borderRadius: '50%' }, { opacity: 1, transform: 'scale(1)', borderRadius: '0' }], 320, 'cubic-bezier(.2,.9,.25,1)').onfinish = done;
      A(old, [{ transform: 'scale(1)' }, { transform: 'scale(.96)' }], 320);
      setTimeout(done, 600);
      return;
    }
    if (kind.k === 'pop' && kind.cal) {
      const ic = root.querySelector('a[href="#/kalendar"]');
      const r = ic && ic.getBoundingClientRect();
      old.style.zIndex = '41'; paintBg(old.firstChild);
      if (r) old.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
      A(old, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.15)' }], 260, 'cubic-bezier(.4,0,.6,1)').onfinish = done;
      A(root, [{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], 260);
      setTimeout(done, 500);
      return;
    }
    if (kind.k === 'push') {
      old.style.zIndex = '0';
      root.style.position = 'relative'; root.style.zIndex = '41'; root.style.boxShadow = '-8px 0 24px rgba(0,0,0,.18)'; paintBg(root);
      A(root, [{ transform: 'translateX(100%)' }, { transform: 'none' }], 300).onfinish = done;
      A(old, [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateX(-22%)', filter: 'brightness(.85)' }], 300);
      setTimeout(done, 600);
      return;
    }
    // pop
    old.style.zIndex = '41'; paintBg(old.firstChild); old.firstChild.style.boxShadow = '-8px 0 24px rgba(0,0,0,.18)';
    A(old, [{ transform: 'none' }, { transform: 'translateX(100%)' }], 260, 'cubic-bezier(.4,0,.6,1)').onfinish = done;
    A(root, [{ transform: 'translateX(-22%)', filter: 'brightness(.85)' }, { transform: 'none', filter: 'brightness(1)' }], 260);
    setTimeout(done, 500);
  } catch (e) { console.error(e); done(); }
}

// Swipe od levého okraje = zpět (na vnořených obrazovkách).
(() => {
  let x0 = 0, y0 = 0, on = false;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0]; on = t.clientX < 22 && navStack.length > 1 && e.touches.length === 1; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!on) return; on = false;
    const t = e.changedTouches[0];
    if (t.clientX - x0 > 70 && Math.abs(t.clientY - y0) < 60) history.back();
  }, { passive: true });
})();