// Push notifikace (Firebase Cloud Messaging) — stejně jako stará aplikace:
// token telefonu se uloží do pushTokens/{token} {user, token, at}, a cloudové
// funkce pak posílají notifikace na lajky, docházku, komentáře, chat atd.
// Na iPhonu fungují jen u aplikace přidané na plochu (iOS 16.4+).
import { app, db, doc, setDoc, deleteDoc } from './firebase.js';
import { VAPID_KEY } from './config.js';
import { myName } from './auth.js';

const LS_ON = 'kokrsnek2PushOn', LS_TOKEN = 'kokrsnek2PushToken';
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* nic */ } } };

let mod = null;
async function messaging() {
  if (!mod) mod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
  if (!(await mod.isSupported())) throw new Error('unsupported');
  return mod;
}

export const pushSupported = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
export const isPushOn = () => ls.get(LS_ON) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted';
export const isStandaloneIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.standalone || matchMedia('(display-mode: standalone)').matches);

async function token() {
  const m = await messaging();
  const reg = await navigator.serviceWorker.register('sw.js');
  await navigator.serviceWorker.ready;
  return m.getToken(m.getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
}

async function save(t) {
  const me = myName();
  const old = ls.get(LS_TOKEN);
  if (old && old !== t) await deleteDoc(doc(db, 'pushTokens', old)).catch(() => {});
  await setDoc(doc(db, 'pushTokens', t), { user: me, token: t, at: new Date().toISOString(), via: 'v2' });
  ls.set(LS_TOKEN, t);
}

// Zapnout — musí se volat z klepnutí (iOS jinak o povolení nepožádá).
export async function enablePush() {
  if (!pushSupported()) throw new Error(isStandaloneIos() ? 'ios-home' : 'unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const t = await token();
  if (!t) throw new Error('no-token');
  await save(t);
  ls.set(LS_ON, '1');
}

export async function disablePush() {
  const t = ls.get(LS_TOKEN);
  if (t) await deleteDoc(doc(db, 'pushTokens', t)).catch(() => {});
  ls.set(LS_TOKEN, null); ls.set(LS_ON, null);
}

// Při každém otevření tiše ověří token (prohlížeč ho občas vymění).
export async function refreshPush() {
  if (!isPushOn() || !myName()) return;
  try {
    const t = await token();
    if (t) await save(t);
    const m = await messaging();
    m.onMessage(m.getMessaging(app), (p) => {
      const d = p.data || {};
      try { new Notification(d.title || 'KoKrŠNeK', { body: d.body || '', icon: 'icon-192.png' }); } catch (e) { /* nic */ }
    });
  } catch (e) { /* nevadí */ }
}

// Kam po klepnutí na notifikaci — service worker si cíl uloží do IndexedDB
// (iOS ignoruje adresu při otevření aplikace), aplikace si ho po startu vyzvedne.
export function consumePendingNav(go) {
  try {
    const req = indexedDB.open('kokrsnek2Nav', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pending');
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('pending', 'readwrite');
        const st = tx.objectStore('pending');
        const g = st.get('latest');
        g.onsuccess = () => {
          const v = g.result;
          if (v && Date.now() - (v.at || 0) < 10 * 60000 && v.hash) go(v.hash);
          st.delete('latest');
        };
      } catch (e) { /* nic */ }
    };
  } catch (e) { /* nic */ }
}
