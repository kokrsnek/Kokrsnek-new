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

// Zkušební provoz: nová aplikace data party jen ČTE. Docházka, komentáře
// apod. jdou zapisovat jen u testovacích akcí (ty žijí celé v v2_akce).
// Až se bude přepínat naostro (fáze 2), změní se na false.
export const TEST_MODE = true;

// Jména, pod kterými lidé používají současnou aplikaci — nabídka v "Kdo jsi?".
export const PARTY_NAMES = [
  'Šuraj', 'Dáša', 'Míra', 'Pecak', 'Peca', 'Pif', 'Guči', 'Gudas', 'Iva',
  'Majkl', 'Alex', 'Bazi', 'Čento', 'Pavel', 'Dejv', 'Zuzi', 'Android'
];

// Číslo verze a seznam změn jsou ve version.js.

// Adresa nové aplikace (odkazy v odběru kalendáře).
export const APP_URL = 'https://kokrsnek-new.vercel.app';
