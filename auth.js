// Přihlášení (Google nebo e-mail) a členství v partě (v2_members/{uid}).
import {
  auth, db, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, doc, setDoc, updateDoc, deleteDoc, onSnapshot,
  collection, serverTimestamp
} from './firebase.js';
import { ADMIN_EMAILS } from './config.js';

export const session = {
  ready: false,      // už víme, jestli je někdo přihlášený
  user: null,        // Firebase uživatel
  member: null,      // dokument z v2_members (nebo null, když ještě není)
  memberLoaded: false
};

const listeners = new Set();
export function onSession(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => { try { fn(session); } catch (e) { console.error(e); } });

export const isAdminEmail = (user) =>
  !!user && !!user.email && user.emailVerified &&
  ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(user.email.toLowerCase());

export const isApproved = () => session.member?.status === 'approved';
export const isAdmin = () => isApproved() && session.member?.role === 'admin';
export const myName = () => session.member?.name || '';

let memberUnsub = null;
export function initAuth() {
  getRedirectResult(auth).catch((e) => console.warn('Návrat z přihlášení:', e?.code));
  onAuthStateChanged(auth, (user) => {
    session.user = user;
    session.ready = true;
    session.member = null;
    session.memberLoaded = false;
    if (memberUnsub) { memberUnsub(); memberUnsub = null; }
    if (!user) { emit(); return; }
    emit();
    memberUnsub = onSnapshot(doc(db, 'v2_members', user.uid), (snap) => {
      session.member = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      session.memberLoaded = true;
      emit();
    }, (err) => {
      console.error('Členství:', err);
      session.memberLoaded = true;
      emit();
    });
  });
}

// Nejdřív okno (popup); když ho prohlížeč zablokuje, přesměrování.
// Na iPhonu v režimu "na plochu" umí Google přihlášení zlobit — pak je
// spolehlivější přihlášení e-mailem.
export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}
export const signInEmail = (email, pass) => signInWithEmailAndPassword(auth, email.trim(), pass);
export const registerEmail = (email, pass) => createUserWithEmailAndPassword(auth, email.trim(), pass);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const logout = () => signOut(auth);

// Po prvním přihlášení: "Kdo jsi?" → žádost o přijetí (nebo rovnou správce).
export async function createMember(name) {
  const u = session.user;
  if (!u) throw new Error('Nikdo není přihlášený.');
  const admin = isAdminEmail(u);
  await setDoc(doc(db, 'v2_members', u.uid), {
    name: name.trim(),
    email: u.email || '',
    provider: u.providerData?.[0]?.providerId || '',
    status: admin ? 'approved' : 'pending',
    role: admin ? 'admin' : 'member',
    createdAt: serverTimestamp()
  });
}

// Tajný token pro odběr kalendáře (adresa kalendar.ics?t=…). Nový token = stará adresa přestane fungovat.
export async function newIcsToken() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  const t = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await updateDoc(doc(db, 'v2_members', session.user.uid), { icsToken: t });
  session.member = { ...session.member, icsToken: t };
  return t;
}

export const changeMyName = (name) => updateDoc(doc(db, 'v2_members', session.user.uid), { name: name.trim() });

// Správa členů (jen správce).
export function watchMembers(cb) {
  return onSnapshot(collection(db, 'v2_members'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => { console.error('Členové:', err); cb(null); });
}
export const approveMember = (uid) => updateDoc(doc(db, 'v2_members', uid), {
  status: 'approved', approvedBy: session.user.uid, approvedAt: serverTimestamp()
});
export const setRole = (uid, role) => updateDoc(doc(db, 'v2_members', uid), { role });
export const removeMember = (uid) => deleteDoc(doc(db, 'v2_members', uid));

export function authErrorText(e) {
  const map = {
    'auth/invalid-email': 'Tohle nevypadá jako e-mail.',
    'auth/missing-password': 'Chybí heslo.',
    'auth/weak-password': 'Heslo musí mít aspoň 6 znaků.',
    'auth/email-already-in-use': 'Tenhle e-mail už je zaregistrovaný — zkus se přihlásit.',
    'auth/invalid-credential': 'Špatný e-mail nebo heslo.',
    'auth/wrong-password': 'Špatné heslo.',
    'auth/user-not-found': 'Účet s tímhle e-mailem neexistuje.',
    'auth/too-many-requests': 'Moc pokusů. Zkus to za chvíli.',
    'auth/popup-closed-by-user': 'Přihlášení bylo zavřeno.',
    'auth/cancelled-popup-request': 'Přihlášení bylo zavřeno.',
    'auth/network-request-failed': 'Není připojení k internetu.',
    'auth/unauthorized-domain': 'Tahle adresa není ve Firebase povolená (Authorized domains).',
    'auth/operation-not-allowed': 'Tenhle způsob přihlášení není ve Firebase zapnutý.'
  };
  return map[e?.code] || 'Něco se nepovedlo. ' + (e?.code || e?.message || '');
}
