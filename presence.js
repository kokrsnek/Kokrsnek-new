// Online stav party (presence/{jméno}.lastActive) — stejné jako stará aplikace:
// srdeční tep každých 25 s, kdo byl aktivní v poslední minutě, je online.
import { db, doc, setDoc, onSnapshot, collection } from './firebase.js';
import { myName } from './auth.js';

const BEAT_MS = 25000, ONLINE_MS = 60000;
let timer = null;

export function startPresence() {
  if (timer) return;
  const beat = () => {
    const me = myName();
    if (!me || document.hidden) return;
    setDoc(doc(db, 'presence', me), { lastActive: new Date().toISOString() }, { merge: true }).catch(() => {});
  };
  beat();
  timer = setInterval(beat, BEAT_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}

export const isOnline = (iso) => !!iso && Date.now() - new Date(iso).getTime() < ONLINE_MS;

export function lastSeenText(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'naposledy aktivní právě teď';
  if (min < 60) return `naposledy aktivní před ${min} min`;
  const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `naposledy aktivní dnes v ${t}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `naposledy aktivní včera v ${t}`;
  return `naposledy aktivní ${d.getDate()}. ${d.getMonth() + 1}.${d.getFullYear() !== today.getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

export const watchPresence = (cb) => onSnapshot(collection(db, 'presence'), (s) => {
  const m = {}; s.docs.forEach((d) => { m[d.id] = d.data().lastActive; }); cb(m);
}, () => cb({}));
export const watchOne = (name, cb) => onSnapshot(doc(db, 'presence', name), (s) => cb(s.exists() ? s.data().lastActive : null), () => cb(null));
