# KoKrŠNeK 2 — fáze 1 (zkušební provoz)

Nová aplikace party bez závislosti na Google Kalendáři. Běží vedle staré, nad stejným Firebase projektem (`kokrsnek-4bdc7`), a ve zkušebním provozu data party **jen čte**.

## Co umí fáze 1

- Přihlášení přes Google nebo e-mail + heslo. Nový účet musí schválit správce.
- Volbu jména („Kdo jsi?“). Podle něj se k uživateli připojí docházka, komentáře a věci ze staré aplikace.
- **Akce**: Nadcházející a Proběhlé, hledání, velká karta nejbližší akce s odpočtem.
- **Kalendář** přes ikonu v hlavičce.
- **Detail akce**:
  - termín, export do kalendáře v telefonu (.ics), navigace na místo
  - album fotek a soubory
  - kdo jde a kdo nejde, co přinést, komentáře
- **Nová akce**: ve zkušebním provozu vzniká jako *testovací*. Docházka, komentáře i věci jdou zapisovat jen u testovacích akcí.
- **Parta**:
  - schvalování členů a správa rolí
  - import akcí z Google Kalendáře
  - změna jména, odhlášení
- **Vzhled** (Parta → Vzhled): jedenáct stylů — Původní, Chata, Festival, Hlídka, Táborák, Zápisník, Značení, Neon, Komiks, Vodáci, Western. Volba se pamatuje v daném zařízení.
- **Kde jsi?** a **Chat**: běží naostro nad skutečnými daty party (`placeCheckins`, `chats`) — přepínač `CHAT_LIVE` v `config.js`.

U akcí převzatých z kalendáře jsou tlačítka Jdu / Nejdu i komentáře zamčené. Docházka se dál mění ve staré aplikaci, takže nic nechodí dvakrát a neposílají se notifikace.

## Nastavení (jednorázově)

1. **Správcovský e-mail** je `l.juracka@gmail.com` — v `config.js` (`ADMIN_EMAILS`) a ve `firestore.rules` (`isAdminEmail()`, malými písmeny). Další správce jde přidat přímo v aplikaci (Parta → člen → Udělat správcem).

2. **Firebase konzole → Authentication → Sign-in method.** Zapni **Google** a **Email/Password**. Anonymous nech zapnuté, používá ho stará aplikace.

3. **Firebase konzole → Firestore → Rules.** Vlož celý obsah `firestore.rules` a dej **Publish**.
   - Pravidlo staré aplikace je v souboru beze změny. Přibylo jen čtení pro schválené členy nové aplikace a pravidla pro kolekce `v2_members`, `v2_akce` a `v2_covers` (fotky v hlavičce akcí).

4. **Nasazení na vlastní adresu.** Nová aplikace musí běžet na *jiné adrese* než stará, ne ve složce `kokrsnek.cz/nova`.
   - Proč: service worker staré aplikace hlídá celý web. Ukládal by si soubory nové aplikace natrvalo a přepsal by svou offline kopii.
   - Nejjednodušší postup:
     1. Založ nový GitHub repozitář (např. `kokrsnek-nova`) a nahraj do něj obsah této složky.
     2. Ve Vercelu dej New Project → import repozitáře → Framework „Other“, bez build příkazu.
     3. Vznikne adresa typu `kokrsnek-nova.vercel.app`. Případně jde napojit `nova.kokrsnek.cz`.

5. **Firebase konzole → Authentication → Settings → Authorized domains.** Přidej novou adresu (např. `kokrsnek-nova.vercel.app`). Bez toho přihlášení přes Google skončí chybou.

6. **Google Cloud → API klíče.** Pokud máš klíče omezené na weby (HTTP referrers), přidej k nim novou adresu. Týká se klíče Firebase i klíče pro Google Kalendář. Pro kalendář se používá klíč „scriptable widget“ z projektu kokrsnek-4bdc7 (jen Google Calendar API, bez omezení na weby, aby fungoval i widget).

7. **Spuštění:**
   1. Otevři novou adresu a přihlas se přes Google správcovským e-mailem.
   2. Vyber jméno.
   3. Jdi do Parta → **Importovat akce**.
   4. Import jde pouštět opakovaně, akce jen aktualizuje.

## Přihlášení na iPhonu

V Safari funguje Google i e-mail. U aplikace přidané na plochu umí Google přihlášení na iOS zlobit (okno se neotevře nebo se nevrátí). V tom případě použij **e-mail + heslo**.

## Jak jsou uložená data

| Co | Kde |
|---|---|
| Členové nové aplikace | `v2_members/{uid}` — jméno, e-mail, stav (pending/approved), role |
| Akce | `v2_akce/{id}` — u akcí z kalendáře stejné id jako v Google Kalendáři |
| Docházka, komentáře, věci, alba u akcí z kalendáře | původní místa: `events/{id}/…`, `bringLists/{id}/items`, `photoAlbums/{id}` (jen čtení) |
| Totéž u testovacích akcí | `v2_akce/{id}/attendees · declines · comments · items` |

Cloud Functions na cesty `v2_…` nereagují. Testování proto nepošle nikomu žádnou notifikaci.

## Další fáze

- **Fáze 2 — naostro pro akce:**
  - `TEST_MODE = false` a pravidla s povoleným zápisem pro schválené členy
  - nové akce už jen v aplikaci
- **Fáze 3 — Kde jsi?** (check-iny, mapa, místa)
- **Fáze 4 — Chat**
- **Fáze 5:**
  - notifikace
  - přechod party
  - odpojení Google Kalendáře
  - widget

## Verze

Aktuální verze je 1.79. Číslo verze a seznam změn jsou ve `version.js` a v aplikaci se zobrazují dole v záložce Parta. Ke každé nové verzi patří záznam v seznamu změn a nový název mezipaměti ve `sw.js`.


Všechny soubory leží v jedné složce, aby šly nahrát na GitHub i z iPhonu.
