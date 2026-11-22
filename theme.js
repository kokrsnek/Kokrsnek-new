// Styly vzhledu a jejich přepínání. Volba se pamatuje v tomhle zařízení.
export const THEMES = [
  { id: 'puvodni', name: 'Původní', note: 'tmavá, zelená', bg: '#1C1B20', card: '#26252B', ink: '#F2EFE9', a: '#6FC59A', b: '#E2664F', status: '#1C1B20',
    font: 'Space Grotesk', fonts: 'family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700' },
  { id: 'chata', name: 'Chata', note: 'krémová, lesní', bg: '#F4EFE6', card: '#FFFDF8', ink: '#2A2620', a: '#2F5D46', b: '#B4532A', status: '#2F5D46',
    font: 'Fraunces', fonts: 'family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700' },
  { id: 'festival', name: 'Festival', note: 'černá, žlutá', bg: '#0D0D10', card: '#1E1E24', ink: '#F7F5EE', a: '#F5D90A', b: '#FF5C8A', status: '#0D0D10',
    font: 'Bricolage Grotesque', fonts: 'family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700' },
  { id: 'hlidka', name: 'Hlídka', note: 'světlá, modrá', bg: '#EEF1F5', card: '#FFFFFF', ink: '#14213D', a: '#1D2B4F', b: '#C84E0F', status: '#1D2B4F',
    font: 'Barlow Condensed', fonts: 'family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700' }
];
const KEY = 'kokrsnek2Theme';

export function currentTheme() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch (e) { /* soukromé okno apod. */ }
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

function loadFonts(t) {
  const id = 'font-' + t.id;
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.id = id; l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${t.fonts}&display=swap`;
  document.head.appendChild(l);
}

export function applyTheme(id, save = true) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  loadFonts(t);
  if (t.id === 'puvodni') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.status);
  if (save) { try { localStorage.setItem(KEY, t.id); } catch (e) { /* nevadí */ } }
  return t;
}

// Náhledy pro výběr stylu (Parta → Vzhled). Každý náhled je ve svých barvách a písmu.
export function preloadAllFonts() { THEMES.forEach(loadFonts); }
