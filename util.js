// Drobné pomocné funkce: escapování, data, české tvary, ikony.

export const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const DAYS_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
export const DAYS_FULL = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
export const MONTHS_NOM = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
export const MONTHS_SHORT = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

export function plural(n, one, few, many) {
  return n === 1 ? one : (n >= 2 && n <= 4 ? few : many);
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const fmtTime = (d) => `${d.getHours()}:${pad2(d.getMinutes())}`;
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export function dayDiff(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

// "dnes", "zítra", "za 14 dní", "včera", "před 3 dny"
export function relDays(date, now = new Date()) {
  const d = dayDiff(now, date);
  if (d === 0) return 'dnes';
  if (d === 1) return 'zítra';
  if (d === -1) return 'včera';
  if (d > 1) return `za ${d} ${plural(d, 'den', 'dny', 'dní')}`;
  const a = -d;
  return `před ${a} ${a === 1 ? 'dnem' : 'dny'}`;
}

// Délka úseku času: "28 dní", "2 dny 4 h", "5 h 12 min", "8 min"
export function fmtSpan(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d >= 3) return `${d} ${plural(d, 'den', 'dny', 'dní')}`;
  if (d >= 1) return `${d} ${plural(d, 'den', 'dny', 'dní')} ${h} h`;
  if (h >= 1) return `${h} h ${m} min`;
  return `${m} min`;
}

// "so 5. 12. · 16:00–23:00" / "čt 24. 12. · celý den"
export function fmtWhen(ev) {
  const s = ev.start, e = ev.end;
  const day = `${DAYS_SHORT[s.getDay()]} ${s.getDate()}. ${s.getMonth() + 1}.`;
  if (ev.allDay) {
    const lastDay = new Date(e.getTime() - 1);
    if (!sameDay(s, lastDay) && lastDay > s) {
      return `${day} – ${DAYS_SHORT[lastDay.getDay()]} ${lastDay.getDate()}. ${lastDay.getMonth() + 1}.`;
    }
    return `${day} · celý den`;
  }
  if (!sameDay(s, e)) return `${day} ${fmtTime(s)} – ${DAYS_SHORT[e.getDay()]} ${e.getDate()}. ${e.getMonth() + 1}. ${fmtTime(e)}`;
  return `${day} · ${fmtTime(s)}${e > s ? '–' + fmtTime(e) : ''}`;
}

export function fmtLongDate(d) {
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()}. ${MONTHS_GEN[d.getMonth()]}`;
}

// Čas komentáře: "dnes 7:40", "včera 21:14", "12. 11."
export function fmtStamp(value) {
  const d = toDate(value);
  if (!d) return '';
  const diff = dayDiff(d, new Date());
  if (diff === 0) return `dnes ${fmtTime(d)}`;
  if (diff === 1) return `včera ${fmtTime(d)}`;
  return `${d.getDate()}. ${d.getMonth() + 1}.${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

// Firestore Timestamp | ISO text | Date → Date
export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function initial(name) {
  return (String(name || '?').trim().charAt(0) || '?').toUpperCase();
}

// Stálá barva avataru podle jména.
const AVATAR_COLORS = ['#3E8F68', '#5B6CB8', '#9A6B3F', '#B85B6C', '#5BA6B8', '#8A5BB8', '#B8885B', '#6C8A4A', '#4A6C8A', '#A8584A'];
export function avatarColor(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function looseName(n) {
  return String(n || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Obrysové ikony (stejná sada jako v návrzích).
const P = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calendarGrid: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 21h14"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
};
export function icon(name, size = 20, sw = 2) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
