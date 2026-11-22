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
  return `<path d="${d} L400 210 L0 210Z" fill="${color}"/>`;
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

export function coverArt(ev) {
  const theme = coverTheme(ev);
  const season = seasonOf(ev, theme);
  const P = SEASONS[season];
  const r = rng(ev.id || ev.title);
  const sunX = 60 + r() * 280, sunY = 40 + r() * 30;
  const sun = P.night
    ? `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="16" fill="${P.sun}"/><circle cx="${(sunX + 7).toFixed(0)}" cy="${(sunY - 4).toFixed(0)}" r="14" fill="${P.sky[0]}"/>`
    : `<circle cx="${sunX.toFixed(0)}" cy="${sunY.toFixed(0)}" r="${season === 'evening' ? 26 : 18}" fill="${P.sun}" opacity=".95"/>`;
  const stars = (P.night || season === 'evening')
    ? Array.from({ length: 18 }, () => `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 90).toFixed(0)}" r="${(0.5 + r()).toFixed(1)}" fill="#fff" opacity=".7"/>`).join('')
    : '';
  const id = 'g' + Math.floor(r() * 1e9);
  return `<svg class="coverart" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient></defs>
    <rect width="400" height="210" fill="url(#${id})"/>
    ${stars}${sun}
    ${hill(r, 140, 50, P.hills[0])}
    ${hill(r, 165, 35, P.hills[1])}
    ${hill(r, 190, 22, P.hills[2])}
    ${MOTIFS[theme](r)}
  </svg>`;
}
