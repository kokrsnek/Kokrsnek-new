// Firebase (modulární SDK z CDN, bez sestavování).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp, Timestamp, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

let firestore;
try {
  // Data zůstávají v telefonu — aplikace se otevře i bez signálu.
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  firestore = initializeFirestore(app, {});
}
export const db = firestore;

// Serverové funkce (callable) — stejné jako ve staré aplikaci, např. nearbyPlaces.
let fnMod = null;
export async function callFunction(name, data) {
  if (!fnMod) fnMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js');
  const fns = fnMod.getFunctions(app, 'us-central1');
  const r = await fnMod.httpsCallable(fns, name)(data);
  return r.data;
}

// Soubory (hlasovky) ve Firebase Storage — stejná místa jako stará aplikace.
let stMod = null;
export async function uploadFile(path, blob, contentType) {
  if (!stMod) stMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
  const r = stMod.ref(stMod.getStorage(app), path);
  await stMod.uploadBytes(r, blob, { contentType, contentDisposition: 'inline' });
  return stMod.getDownloadURL(r);
}

export {
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
  collection, collectionGroup, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch, serverTimestamp, Timestamp, arrayUnion
};
