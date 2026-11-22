// Číslo verze a seznam změn. Při každé nové verzi:
//  1) přidej nový záznam NA ZAČÁTEK seznamu CHANGELOG,
//  2) ve sw.js zvyš název mezipaměti (CACHE), ať si telefony stáhnou nové soubory.
export const CHANGELOG = [
  {
    version: '1.04',
    date: '22. 11. 2026',
    items: [
      'Kalendář: vedle nadpisu je ikona „Akce v kalendáři“ — stejně jako ve Službách: Odebírat v iPhonu, Přidat do Google kalendáře, Stáhnout jednorázově, Zkopírovat adresu a Zneplatnit adresu.',
      'Odběr se sám aktualizuje, když se akce změní nebo přibude (obsahuje akce od loňska a všechny naplánované). Každý člen má vlastní tajnou adresu.',
      'Stáhnout jednorázově: nadcházející akce nebo celý kalendář jako soubor, otevře nabídku sdílení telefonu.',
      'Tlačítko „Do kalendáře“ v detailu akce teď také otevře nabídku sdílení (dřív jen stáhlo soubor).'
    ]
  },
  {
    version: '1.03',
    date: '22. 11. 2026',
    items: [
      'Hledání prohledává všechny akce najednou — nadcházející, probíhající i proběhlé (rozdělené do skupin, proběhlé podle roku).',
      'Velkou kartu akce jde listovat: swipe doprava ukáže předchozí akci, swipe doleva další. Pod kartou jsou i tlačítka „dřívější / pozdější“ a „nejbližší“ pro návrat.',
      'U proběhlé akce na kartě: kdo tam byl a tlačítko na album fotek.',
      'Navigovat vede u známých míst party (Hastrman, Bouda, Funibrouk, Sjíždění) přímo na GPS, ne na hledání podle názvu. Poznává i GPS nebo odkaz na mapu zapsaný v místě akce.'
    ]
  },
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
