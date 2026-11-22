// Číslo verze a seznam změn. Při každé nové verzi:
//  1) přidej nový záznam NA ZAČÁTEK seznamu CHANGELOG,
//  2) ve sw.js zvyš název mezipaměti (CACHE), ať si telefony stáhnou nové soubory.
export const CHANGELOG = [
  {
    version: '1.02',
    date: '22. 11. 2026',
    items: [
      'Spodní lišta je níž u okraje displeje, pod ikonami už není prázdné místo.',
      'Obsah obrazovek začíná výš, hned pod horním okrajem.',
      'Místo plovoucího tlačítka „Nová akce“ je uprostřed spodní lišty tlačítko +. Otevře menu: Přidat akci a Přidat fotoalbum.',
      'Přidat fotoalbum: vybereš proběhlou akci a vložíš odkaz na Google Fotky. Jde to i přímo v detailu akce, která album ještě nemá. Ve zkušebním provozu jen pro správce.'
    ]
  },
  {
    version: '1.01',
    date: '22. 11. 2026',
    items: [
      'Import z Google Kalendáře používá klíč „scriptable widget“ z projektu kokrsnek-4bdc7 — původní klíč patřil jinému projektu a novou adresu odmítal (chyba 403).',
      'Když import selže, ukáže se i přesný důvod od Googlu, ne jen číslo chyby.'
    ]
  },
  {
    version: '1.00',
    date: '22. 11. 2026',
    items: [
      'První verze nové aplikace KoKrŠNeK — zkušební provoz vedle staré aplikace.',
      'Přihlášení přes Google nebo e-mail, nový účet schvaluje správce. Volba jména „Kdo jsi?“ připojí docházku, komentáře a věci ze staré aplikace.',
      'Akce: Nadcházející a Proběhlé, hledání, velká karta nejbližší akce s odpočtem a Jdu / Nejdu.',
      'Kalendář: měsíční přehled přes ikonu v hlavičce, zeleně dny, kdy jdeš.',
      'Detail akce: termín, přidání do kalendáře v telefonu, navigace, album, soubory, kdo jde, co přinést a komentáře.',
      'Nová akce: ve zkušebním provozu jako testovací akce, kterou vidí jen nová aplikace.',
      'Parta: schvalování členů, správci, import akcí z Google Kalendáře.',
      'Vzhled: čtyři styly — Původní, Chata, Festival (s dlaždicemi) a Hlídka.'
    ]
  }
];

export const VERSION = CHANGELOG[0].version;
