// =====================================================================
// Nastavení nové aplikace KoKrŠNeK
// =====================================================================

// Stejný Firebase projekt jako současná aplikace (kokrsnek-4bdc7).
export const firebaseConfig = {
  apiKey: 'AIzaSyDnWBkXpnGCSPMKPrbroJtP2QVt48YtURw',
  authDomain: 'kokrsnek-4bdc7.firebaseapp.com',
  projectId: 'kokrsnek-4bdc7',
  storageBucket: 'kokrsnek-4bdc7.firebasestorage.app',
  messagingSenderId: '1079843186893',
  appId: '1:1079843186893:web:b826958d3884ea34412184'
};

// Google Kalendář — jen pro import akcí (Parta → Import z Google Kalendáře).
export const GOOGLE_API_KEY = 'AIzaSyBpgUzhWDC3YMQh4wX818DSaLIvWNQl_oA';
export const GOOGLE_CALENDAR_ID = 'kokrsnek@gmail.com';

// Správci: kdo se přihlásí s tímhle (ověřeným) e-mailem, je rovnou schválený
// správce. Stejný seznam musí být i ve firestore.rules (funkce isAdminEmail).
// E-mail správce (přihlášení přes Google).
export const ADMIN_EMAILS = ['l.juracka@gmail.com'];

// Přepnutí naostro: od půlnoci 1. 12. 2026 je nová aplikace jediná.
// Do té doby zkušební provoz (testovací akce a vlákno, import z Google
// Kalendáře). Po přepnutí se všechno přepne samo, nic se nenasazuje.
export const CUTOVER = new Date('2026-12-01T00:00:00+01:00');
export const LIVE = Date.now() >= CUTOVER.getTime();
export const TEST_MODE = !LIVE;

// Jména, pod kterými lidé používají současnou aplikaci — nabídka v "Kdo jsi?".
export const PARTY_NAMES = [
  'Šuraj', 'Dáša', 'Míra', 'Pecak', 'Peca', 'Pif', 'Guči', 'Gudas', 'Iva',
  'Majkl', 'Alex', 'Bazi', 'Čento', 'Pavel', 'Dejv'
];
// Jak se jméno ukazuje v nabídkách. Uložené jméno zůstává stejné jako ve staré
// aplikaci (pod ním jsou zprávy, docházka i notifikace), mění se jen popisek.
export const NAME_LABELS = { Pecak: 'Pecák' };
export const nameLabel = (n) => NAME_LABELS[n] || n;

// Číslo verze a seznam změn jsou ve version.js.

// Adresa nové aplikace (odkazy v odběru kalendáře).
export const APP_URL = LIVE ? 'https://kokrsnek.cz' : 'https://kokrsnek-new.vercel.app';

// API klíč Mapy.com pro podklad mapy v detailu akce (developer.mapy.com → Můj účet
// → projekt → API klíč). Prázdný = použije se OpenStreetMap.
export const MAPY_API_KEY = 'nY-91216wSSQ5waRO4ABMmtDldTuDGTPzp8kd8WcsQM';

// Chat a Kde jsi? běží naostro: zprávy, reakce, check-iny a komentáře jdou do
// skutečných dat party (stará aplikace je vidí a posílá notifikace).
export const CHAT_LIVE = true;

// Push notifikace: veřejný VAPID klíč z Firebase konzole (Project settings →
// Cloud Messaging → Web Push certificates) — stejný jako ve staré aplikaci.
export const VAPID_KEY = 'BBuBiHO0wjvozSfhsSTyVWNpZV_gTHNJ6q9-0Q2Pnr-YyFUdnaLL48Gf97IE6p_xodvsQPIRNp5rAFGhtX5tWyk';
