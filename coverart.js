// Ilustrace do hlavičky akce, když akce nemá vlastní fotku.
// Podle názvu a popisu pozná téma (oheň, voda, zima, kola…), podle data
// roční období a podle id akce drobné obměny (kopce, hvězdy, poloha slunce).
import { looseName } from './util.js';

const THEMES = [
  ['fire', ['ohen', 'carodej', 'taborak', 'opekan', 'vatra']],
  ['winter', ['mikulas', 'vanoc', 'silvest', 'novy rok', 'novoroc', 'zim', 'snih', 'sanko', 'lyz', 'brusl']],
  ['water', ['vodnic', 'sjizd', 'koupal', 'rybnik', 'splav', 'lod', 'kanoe', 'raft', 'plav', 'voda', 'jezer']],
  ['bike', ['kola', 'kolo', 'cyklo', 'bike']],
  ['bowling', ['bowling', 'kuzelk']],
  ['grill', ['grilov', 'gril', 'barbecue', 'bbq', 'udit', 'zabijac', 'gulas']],
  ['music', ['country', 'koncert', 'kino', 'ples', 'vecirek', 'party', 'disko', 'zabava', 'karaoke', 'hudb']],
  ['hike', ['pochod', 'vyslap', 'vylet', 'tura', 'hledani jara', 'hor', 'kopec', 'les']],
  ['cabin', ['bouda', 'chata', 'prespav', 'vyroci', 'oteviren', 'brigad', 'pracak']]
];

export function coverTheme(ev) {
  const t = looseName(ev.title || '');
  const d = looseName(ev.description || '').slice(0, 400);
  for (const [name, words] of THEMES) if (words.some((w) => t.includes(w))) return name;
  for (const [name, words] of THEMES) if (words.some((w) => d.includes(w))) return name;
  return 'plain';
}

// Jednoduchý generátor náhodných čísel ze semínka (stejná akce = stejný obrázek).
function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

const SEASONS = {
  winter: { sky: ['#1B2A4A', '#46618F'], hills: ['#8FA3BF', '#B7C6D9', '#E3EAF2'], sun: '#F4F1E8', night: true },
  spring: { sky: ['#7DB8D9', '#D6ECD2'], hills: ['#5E9C55', '#7DB86A', '#A6D38A'], sun: '#FFE9A8' },
  summer: { sky: ['#3F8FCB', '#BFE3F2'], hills: ['#3E7D3A', '#5C9B47', '#86BB5C'], sun: '#FFD85A' },
  autumn: { sky: ['#C9714A', '#F2C38B'], hills: ['#7A4A2A', '#A8642F', '#D08A3E'], sun: '#FFE0A0' },
  evening: { sky: ['#2B1F45', '#C5655A'], hills: ['#2E2A3F', '#463B57', '#6B4E63'], sun: '#FFB46B' }
};
function seasonOf(ev, theme) {
  const m = ev.start.getMonth();
  if (theme === 'winter' || m === 11 || m <= 1) return 'winter';
  if (['fire', 'music', 'bowling'].includes(theme)) return 'evening';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

function hill(r, y, amp, color) {
  let d = `M0 ${y}`;
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const x = (400 / n) * i;
    const cx = x - 400 / n / 2;
    d += ` Q${cx.toFixed(0)} ${(y - amp * (0.4 + r())).toFixed(0)} ${x.toFixed(0)} ${(y - amp * 0.3 * r()).toFixed(0)}`;
  }
  return `<path class="hl" d="${d} L400 210 L0 210Z" fill="${color}"/>`;
}

const MOTIFS = {
  fire: (r) => `<g transform="translate(${200 + (r() - 0.5) * 60} 168)">
      <ellipse cx="0" cy="18" rx="60" ry="9" fill="#000" opacity=".25"/>
      <path d="M-30 14 L28 2 M-28 2 L30 14" stroke="#5A3520" stroke-width="9" stroke-linecap="round"/>
      <path d="M0 -58 C18 -34 26 -18 20 2 C16 14 -16 14 -20 2 C-26 -16 -10 -24 -6 -40 C-2 -30 4 -28 0 -58Z" fill="#F26B2E"/>
      <path d="M2 -30 C12 -16 14 -6 10 4 C6 10 -8 10 -10 3 C-13 -6 -4 -12 2 -30Z" fill="#FFC94A"/>
      ${[0, 1, 2, 3, 4].map(() => `<circle cx="${((r() - 0.5) * 70).toFixed(0)}" cy="${(-70 - r() * 60).toFixed(0)}" r="${(1 + r() * 2).toFixed(1)}" fill="#FFD36B" opacity=".85"/>`).join('')}
    </g>`,
  winter: (r) => `<g>
      ${[0, 1, 2].map((i) => { const x = 70 + i * 120 + (r() - 0.5) * 40, s = 0.8 + r() * 0.5; return `<g transform="translate(${x.toFixed(0)} ${(150 + r() * 20).toFixed(0)}) scale(${s.toFixed(2)})"><rect x="-4" y="10" width="8" height="14" fill="#4A3426"/><path d="M0 -50 L24 12 L-24 12Z" fill="#2F5D46"/><path d="M0 -50 L14 -14 L-14 -14Z" fill="#fff" opacity=".85"/><path d="M-18 -4 L18 -4" stroke="#fff" stroke-width="3" opacity=".7"/></g>`; }).join('')}
      ${Array.from({ length: 40 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 200).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}" fill="#fff" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`).join('')}
    </g>`,
  water: (r) => `<g>
      <rect x="0" y="150" width="400" height="60" fill="#2F7FB8"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M${(r() * 60).toFixed(0)} ${160 + i * 12} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#BFE3F2" stroke-width="2" fill="none" opacity=".6"/>`).join('')}
      <g transform="translate(${(150 + r() * 100).toFixed(0)} 160)"><path d="M-34 0 Q0 16 34 0 L28 -6 L-28 -6Z" fill="#E2664F"/><circle cx="-10" cy="-14" r="5" fill="#2B2B2B"/><circle cx="10" cy="-14" r="5" fill="#2B2B2B"/><path d="M-26 -10 L16 -30" stroke="#6B4A2E" stroke-width="3"/></g>
    </g>`,
  bike: (r) => `<g transform="translate(${(170 + r() * 60).toFixed(0)} 160)" stroke="#1E1E24" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="-34" cy="12" r="20"/><circle cx="34" cy="12" r="20"/>
      <path d="M-34 12 L-8 -16 L22 -16 L34 12 M-8 -16 L4 12 L22 -16 M4 12 L-34 12 M-14 -24 L-2 -24 M22 -16 L18 -28 L28 -30"/>
    </g>`,
  bowling: (r) => `<g transform="translate(200 165)">
      ${[-48, -24, 0, 24, 48].map((x, i) => `<g transform="translate(${x} ${i % 2 ? -6 : 0})"><path d="M0 -44 C8 -44 8 -32 5 -26 C12 -16 12 4 6 14 L-6 14 C-12 4 -12 -16 -5 -26 C-8 -32 -8 -44 0 -44Z" fill="#F7F5EE"/><path d="M-6 -22 L6 -22 M-7 -17 L7 -17" stroke="#E2664F" stroke-width="3"/></g>`).join('')}
      <circle cx="${(-110 + r() * 20).toFixed(0)}" cy="2" r="18" fill="#2B3A8C"/><circle cx="-115" cy="-4" r="2.5" fill="#111"/><circle cx="-107" cy="-6" r="2.5" fill="#111"/>
    </g>`,
  grill: (r) => `<g transform="translate(${(185 + r() * 30).toFixed(0)} 150)">
      <path d="M-44 -6 L44 -6 Q40 28 0 30 Q-40 28 -44 -6Z" fill="#2B2B2B"/>
      <path d="M-30 30 L-40 62 M30 30 L40 62" stroke="#2B2B2B" stroke-width="5"/>
      <path d="M-40 -8 L40 -8" stroke="#999" stroke-width="3"/>
      <rect x="-26" y="-16" width="22" height="9" rx="4" fill="#A0522D"/><rect x="2" y="-16" width="22" height="9" rx="4" fill="#B5652F"/>
      ${[-16, 0, 16].map((x) => `<path d="M${x} -24 q-6 -10 0 -20 q6 -10 0 -20" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>`).join('')}
    </g>`,
  music: (r) => `<g fill="#F7F5EE">
      ${Array.from({ length: 5 }, () => { const x = 40 + r() * 320, y = 40 + r() * 90, s = 0.7 + r() * 0.7; return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})" opacity=".85"><ellipse cx="0" cy="18" rx="8" ry="6"/><rect x="6" y="-14" width="3" height="32"/><path d="M9 -14 q12 4 12 16 q-4 -8 -12 -8Z"/></g>`; }).join('')}
      ${Array.from({ length: 26 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 120).toFixed(0)}" r="${(0.6 + r() * 1.4).toFixed(1)}" opacity=".8"/>`).join('')}
    </g>`,
  hike: (r) => `<g>
      <path d="M${(160 + r() * 60).toFixed(0)} 210 C200 180 170 160 210 140 C240 126 230 112 250 100" stroke="#E9DFC4" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="2 10"/>
      <g transform="translate(252 98)"><path d="M0 0 L0 -34" stroke="#3A2A1E" stroke-width="3"/><path d="M0 -34 L20 -28 L0 -22Z" fill="#E2664F"/></g>
      ${[0, 1, 2, 3].map(() => { const x = r() * 400, y = 150 + r() * 40; return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><path d="M0 -26 L12 4 L-12 4Z" fill="#2F5D46"/><rect x="-2" y="4" width="4" height="6" fill="#4A3426"/></g>`; }).join('')}
    </g>`,
  cabin: (r) => `<g transform="translate(${(180 + r() * 50).toFixed(0)} 170)">
      <path d="M-46 -2 L0 -44 L46 -2Z" fill="#6B3E26"/>
      <rect x="-38" y="-4" width="76" height="40" fill="#A0663E"/>
      ${[0, 1, 2, 3].map((i) => `<path d="M-38 ${4 + i * 9} L38 ${4 + i * 9}" stroke="#7A4A2A" stroke-width="2"/>`).join('')}
      <rect x="-8" y="10" width="16" height="26" fill="#3A2416"/>
      <rect x="18" y="6" width="12" height="11" fill="#FFD36B"/>
      <rect x="20" y="-40" width="8" height="16" fill="#5A3520"/>
      <path d="M24 -44 q-8 -10 0 -18 q8 -8 0 -16" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/>
    </g>`,
  plain: () => ''
};

// Barvy podle vzhledu: každý vzhled má vlastní paletu pro den a pro noc (zima, večer),
// takže roční období zůstane poznat, jen v barvách a stylu zvoleného vzhledu.
// Doplňky (rastr, linky, mřížka) kreslí overlay(), obrysy a záři themes.css (.coverart).
const LOOKS = {
  chata: { snow: '#ECE6DA', day: { sky: ['#CFDCCB', '#F4EFE6'], hills: ['#4E7A5E', '#2F5D46', '#1F3F2F'], sun: '#E3A15A' },
    night: { sky: ['#1F2A24', '#4E5F52'], hills: ['#3E5446', '#2F4537', '#22332A'], sun: '#F4EFE6' } },
  festival: { snow: '#F7F5EE', day: { sky: ['#F5D90A', '#FF5C8A'], hills: ['#2A2233', '#1E1E24', '#0D0D10'], sun: '#FFFFFF' },
    night: { sky: ['#0D0D10', '#2A2233'], hills: ['#FF5C8A', '#C93A6A', '#0D0D10'], sun: '#F5D90A' } },
  hlidka: { snow: '#E6EBF3', day: { sky: ['#C9D2E6', '#EEF1F5'], hills: ['#5A6678', '#3A4660', '#1D2B4F'], sun: '#C84E0F' },
    night: { sky: ['#14213D', '#2E3E66'], hills: ['#4A5878', '#33405F', '#1D2B4F'], sun: '#FFFFFF' } },
  taborak: { snow: '#DCC8B4', day: { sky: ['#3A1C10', '#E0521F'], hills: ['#55402E', '#3D2A1C', '#241811'], sun: '#FFD27A' },
    night: { sky: ['#140E0A', '#5A2410'], hills: ['#3D2A1C', '#2A1C13', '#1A120C'], sun: '#FFB27A' } },
  zapisnik: { snow: '#FFFDF6', day: { sky: ['#FFFDF6', '#FBF5E6'], hills: ['#E2E8F4', '#F1EAD6', '#FFFDF6'], sun: '#FFE98A' },
    night: { sky: ['#E2E8F4', '#FBF5E6'], hills: ['#D2DBEE', '#E8E0CB', '#FFFDF6'], sun: '#FFFDF6' } },
  znaceni: { snow: '#FFFFFF', day: { sky: ['#F3EFE2', '#F3EFE2'], hills: ['#C9D8B4', '#B5CA98', '#9DBB7E'], sun: '#F2C200' },
    night: { sky: ['#E9E6DC', '#F3EFE2'], hills: ['#DCE3D2', '#C9D3BD', '#B3C2A4'], sun: '#FFFFFF' } },
  neon: { snow: '#C3CCE6', day: { sky: ['#1B1650', '#7C5CFF'], hills: ['#141A33', '#0E1240', '#070B18'], sun: '#FF5CA8' },
    night: { sky: ['#070B18', '#1B1650'], hills: ['#141A33', '#0E1240', '#070B18'], sun: '#22D3EE' } },
  komiks: { snow: '#FFFFFF', day: { sky: ['#7CD3FF', '#E6F7FF'], hills: ['#3DDC84', '#2BB86A', '#FFD400'], sun: '#FFD400' },
    night: { sky: ['#2B3A8C', '#7CD3FF'], hills: ['#5B6CB8', '#3D4C9C', '#FFFFFF'], sun: '#FFD400' } },
  vodaci: { snow: '#E3F4F8', day: { sky: ['#1A8FB0', '#E9F6F8'], hills: ['#7CC7D9', '#1A8FB0', '#0B5C73'], sun: '#FFD35A' },
    night: { sky: ['#08303D', '#1A8FB0'], hills: ['#2D6E82', '#0B5C73', '#08303D'], sun: '#FFD35A' } },
  hardware: { snow: '#EDEBDC', day: { sky: ['#0F5C3A', '#127047'], hills: ['#0B4A2E', '#1E2124', '#17191B'], sun: '#39FF6A' },
    night: { sky: ['#0A3D27', '#0F5C3A'], hills: ['#0B4A2E', '#1E2124', '#17191B'], sun: '#39FF6A' } },
  western: { snow: '#F6E7C4', day: { sky: ['#F1DFB8', '#D9BC85'], hills: ['#C9A66B', '#A8713C', '#8A5528'], sun: '#9C2A12' },
    night: { sky: ['#3B2414', '#8A5528'], hills: ['#6B3E1C', '#5A2E12', '#3B2414'], sun: '#FFE29A' } }
};
const look = () => (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || '';

// Doplňková vrstva přes celý obrázek podle vzhledu.
function overlay(t, id) {
  if (t === 'komiks') return `<defs><pattern id="${id}h" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#111" opacity=".22"/></pattern></defs><rect width="400" height="210" fill="url(#${id}h)"/>`;
  if (t === 'zapisnik') return `<defs><pattern id="${id}h" width="400" height="16" patternUnits="userSpaceOnUse"><path d="M0 15.5 H400" stroke="#9DB6D8" stroke-width="1"/></pattern></defs><rect width="400" height="210" fill="url(#${id}h)" opacity=".7"/><path d="M26 0 V210" stroke="#F2A0A0" stroke-width="2"/>`;
  if (t === 'hardware') return `<defs><pattern id="${id}h" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r=".9" fill="#C98A3A" opacity=".35"/></pattern></defs><rect width="400" height="210" fill="url(#${id}h)"/>`;
  if (t === 'neon') return Array.from({ length: 7 }, (_, i) => `<path d="M0 ${150 + i * i * 1.6} H400" stroke="#22D3EE" stroke-width=".8" opacity="${(0.15 + i * 0.05).toFixed(2)}"/>`).join('');
  if (t === 'znaceni') return `<g transform="translate(372 24)"><rect x="-14" y="-10" width="28" height="20" fill="#fff" stroke="#141414" stroke-width="1.5"/><rect x="-14" y="-3.3" width="28" height="6.6" fill="#D2232A"/></g>`;
  if (t === 'western') return `<rect width="400" height="210" fill="none" stroke="#5A2E12" stroke-width="10" opacity=".35"/>`;
  return '';
}

export function coverArt(ev) {
  const theme = coverTheme(ev);
  const season = seasonOf(ev, theme);
  const t = look();
  const L = LOOKS[t];
  const P = L ? { ...(SEASONS[season].night || season === 'evening' ? L.night : L.day), night: SEASONS[season].night } : SEASONS[season];
  if (L && season === 'winter') P.hills = [P.hills[0], P.hills[1], L.snow];
  const r = rng(ev.id || ev.title);
  const sunX = 60 + r() * 280, sunY = 40 + r() * 30;
  const sun = P.night
    ? `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="16" fill="${P.sun}"/><circle cx="${(sunX + 7).toFixed(0)}" cy="${(sunY - 4).toFixed(0)}" r="14" fill="${P.sky[0]}"/>`
    : `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${season === 'evening' ? 26 : 18}" fill="${P.sun}" opacity=".95"/>`;
  const stars = (P.night || season === 'evening')
    ? Array.from({ length: 18 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 90).toFixed(0)}" r="${(0.5 + r()).toFixed(1)}" fill="#fff" opacity=".7"/>`).join('')
    : '';
  const id = 'g' + Math.floor(r() * 1e9);
  return `<svg class="coverart${t ? ' ca-' + t : ''}" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient></defs>
    <rect width="400" height="210" fill="url(#${id})"/>
    ${stars}${sun}
    ${hill(r, 140, 50, P.hills[0])}
    ${hill(r, 165, 35, P.hills[1])}
    ${hill(r, 190, 22, P.hills[2])}
    <g class="mt">${MOTIFS[theme](r)}</g>
    ${overlay(t, id)}
  </svg>`;
}
