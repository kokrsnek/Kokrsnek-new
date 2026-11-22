// Počasí k akcím (Open-Meteo, bez klíče) a efekt deště/sněhu podle polohy.
// Nadcházející akce: předpověď po hodinách (asi 16 dní dopředu).
// Proběhlé akce: skutečné počasí (poslední ~3 měsíce z předpovědního API,
// starší z archivu).
import { placeCoords } from './util.js';
import { geocode } from './map.js';

// WMO kód → [ikona, popis]
const WMO = [
  [[0], '☀️', 'jasno'], [[1], '🌤', 'skoro jasno'], [[2], '⛅', 'polojasno'], [[3], '☁️', 'zataženo'],
  [[45, 48], '🌫', 'mlha'],
  [[51, 53, 55, 56, 57], '🌦', 'mrholení'],
  [[61, 63, 66], '🌧', 'déšť'], [[65, 67], '🌧', 'silný déšť'],
  [[80, 81], '🌦', 'přeháňky'], [[82], '🌧', 'silné přeháňky'],
  [[71, 73, 77, 85], '🌨', 'sněžení'], [[75, 86], '❄️', 'husté sněžení'],
  [[95, 96, 99], '⛈', 'bouřky']
];
function wmo(code) {
  const r = WMO.find(([c]) => c.includes(code));
  return r ? { icon: r[1], text: r[2] } : { icon: '🌡', text: '' };
}
export const wxIcon = (code) => wmo(code).icon;
const wet = (c) => c >= 51;

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DAY = 86400000;

const mem = new Map();
const done = new Map(); // klíč → hotový výsledek (pro okamžité vykreslení)
const keyOf = (ev) => ev.id + '|' + (+ev.start) + '|' + (+ev.end) + '|' + ev.place;
export const cachedWeather = (ev) => (ev && ev.place ? done.get(keyOf(ev)) : null);
const LS = 'kokrsnek2Wx';
function lsGet(k) {
  try { const c = JSON.parse(localStorage.getItem(LS) || '{}')[k]; return c && c.exp > Date.now() ? c.v : undefined; } catch (e) { return undefined; }
}
function lsSet(k, v, ttl) {
  try {
    const all = JSON.parse(localStorage.getItem(LS) || '{}');
    const now = Date.now();
    for (const x of Object.keys(all)) if (!all[x] || all[x].exp < now) delete all[x];
    all[k] = { v, exp: now + ttl };
    localStorage.setItem(LS, JSON.stringify(all));
  } catch (e) { /* nevadí */ }
}

// Okno hodin, které se k akci ukazuje.
function windowOf(ev) {
  const s = new Date(ev.start);
  if (ev.allDay) { const a = new Date(s); a.setHours(9, 0, 0, 0); const b = new Date(s); b.setHours(22, 0, 0, 0); return [a, b]; }
  const a = new Date(s); a.setMinutes(0, 0, 0);
  const end = new Date(Math.min(+ev.end, +s + DAY));
  const b = new Date(end); if (b.getMinutes()) b.setHours(b.getHours() + 1); b.setMinutes(0, 0, 0);
  if (b - a < 3 * 3600000) b.setTime(+a + 3 * 3600000);
  return [a, b];
}

// Počasí k akci, nebo null (bez místa, příliš daleko dopředu, chyba).
export function eventWeather(ev) {
  if (!ev || !ev.place) return Promise.resolve(null);
  const now = Date.now();
  if (+ev.start - now > 15 * DAY) return Promise.resolve(null);
  const key = keyOf(ev);
  if (mem.has(key)) return mem.get(key);
  const cached = lsGet(key);
  if (cached !== undefined) { done.set(key, cached); const p = Promise.resolve(cached); mem.set(key, p); return p; }
  const p = load(ev).then((v) => {
    const past = +ev.end < now;
    // Předpověď stačí obnovit za hodinu, staré skutečné počasí se už nezmění.
    const ttl = !v ? 3 * 3600000 : past && now - +ev.end > 7 * DAY ? 365 * DAY : 3600000;
    lsSet(key, v, ttl);
    done.set(key, v);
    return v;
  }).catch(() => null);
  mem.set(key, p);
  return p;
}

async function load(ev) {
  const c = placeCoords(ev.place) || await geocode(ev.place);
  if (!c) return null;
  const [a, b] = windowOf(ev);
  const now = Date.now();
  const past = +b < now;
  const archive = now - +b > 80 * DAY;
  const base = archive ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  const vars = archive ? 'temperature_2m,precipitation,weathercode' : 'temperature_2m,precipitation,precipitation_probability,weathercode';
  const u = `${base}?latitude=${c.lat.toFixed(4)}&longitude=${c.lng.toFixed(4)}&hourly=${vars}&timezone=Europe%2FPrague&start_date=${ymd(a)}&end_date=${ymd(b)}`;
  const res = await fetch(u);
  if (!res.ok) return null;
  const j = await res.json();
  const H = j.hourly;
  if (!H || !H.time) return null;
  const hours = [];
  H.time.forEach((t, i) => {
    const d = new Date(t); // místní čas (Europe/Prague)
    if (d < a || d > b) return;
    const temp = H.temperature_2m[i];
    if (temp == null) return;
    hours.push({ h: d.getHours(), t: Math.round(temp), code: H.weathercode[i] ?? 0, mm: H.precipitation?.[i] || 0, p: H.precipitation_probability ? H.precipitation_probability[i] : null });
  });
  if (!hours.length) return null;
  const temps = hours.map((x) => x.t);
  const codes = hours.map((x) => x.code);
  const worst = Math.max(...codes);
  const freq = {}; codes.forEach((x) => { freq[x] = (freq[x] || 0) + 1; });
  const common = +Object.entries(freq).sort((x, y) => y[1] - x[1])[0][0];
  const probs = hours.map((x) => x.p).filter((x) => x != null);
  const firstWet = hours.find((x) => wet(x.code));
  const mm = Math.round(hours.reduce((s, x) => s + x.mm, 0) * 10) / 10;
  let desc = wmo(common).text;
  if (firstWet && !wet(common)) desc += `, kolem ${firstWet.h}:00 ${wmo(firstWet.code).text}`;
  desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  return {
    past, hours, min: Math.min(...temps), max: Math.max(...temps),
    now: hours[0].t, icon: wmo(firstWet && hours.filter((x) => wet(x.code)).length * 3 >= hours.length ? worst : common).icon,
    startIcon: wmo(hours[0].code).icon,
    prob: probs.length ? Math.max(...probs) : null, mm, desc
  };
}

// Do sedmi sloupců pro kartu po hodinách.
export function hourColumns(w, n = 7) {
  const step = Math.max(1, Math.ceil(w.hours.length / n));
  return w.hours.filter((_, i) => i % step === 0).slice(0, n);
}

// ---------- déšť / sníh přes aplikaci podle počasí tam, kde jsi ----------
const PERM = 'kokrsnekLocationWeatherPermission'; // stejný klíč jako stará aplikace
let effectOn = false;
export function startWeatherEffect() {
  if (effectOn || !navigator.geolocation) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let perm = null;
  try { perm = localStorage.getItem(PERM); } catch (e) { /* nic */ }
  if (perm === 'denied') return;
  effectOn = true;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try { localStorage.setItem(PERM, 'granted'); } catch (e) { /* nic */ }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude.toFixed(3)}&longitude=${pos.coords.longitude.toFixed(3)}&current_weather=true`);
      const code = (await r.json()).current_weather?.weathercode;
      const kind = [51, 56, 61, 66, 80].includes(code) ? ['rain', 'light'] : [53, 63, 81].includes(code) ? ['rain', 'moderate'] : [55, 57, 65, 67, 82, 95, 96, 99].includes(code) ? ['rain', 'heavy']
        : [71, 77, 85].includes(code) ? ['snow', 'light'] : [73].includes(code) ? ['snow', 'moderate'] : [75, 86].includes(code) ? ['snow', 'heavy'] : null;
      if (kind) runEffect(...kind);
    } catch (e) { /* bez efektu */ }
  }, () => { try { localStorage.setItem(PERM, 'denied'); } catch (e) { /* nic */ } }, { maximumAge: 30 * 60000, timeout: 15000 });
}

function runEffect(type, intensity) {
  const every = { rain: { light: 160, moderate: 70, heavy: 30 }, snow: { light: 420, moderate: 220, heavy: 100 } }[type][intensity];
  const box = document.createElement('div');
  box.className = 'wxfx';
  box.setAttribute('aria-hidden', 'true');
  document.body.appendChild(box);
  const wind = Math.random() < 0.5 ? -1 : 1;
  setInterval(() => {
    if (document.hidden) return;
    const el = document.createElement('i');
    if (type === 'rain') {
      el.className = 'rain';
      el.style.cssText = `left:${Math.random() * 100}%;height:${32 + Math.random() * 20}px;--dx:${wind * (70 + Math.random() * 25)}px;--rot:${wind * 13}deg;animation-duration:${0.6 + Math.random() * 0.4}s`;
    } else {
      const sz = 8 + Math.random() * 10;
      el.className = 'snow';
      el.style.cssText = `left:${Math.random() * 100}%;width:${sz}px;height:${sz}px;opacity:${0.55 + Math.random() * 0.35};--dx:${Math.random() * 40 - 20}px;animation-duration:${4 + Math.random() * 3}s`;
    }
    box.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }, every);
}
