// Číslo verze a seznam změn. Při každé nové verzi:
//  1) přidej nový záznam NA ZAČÁTEK seznamu CHANGELOG,
//  2) ve sw.js zvyš název mezipaměti (CACHE), ať si telefony stáhnou nové soubory.
export const CHANGELOG = [
  {
    version: '1.13',
    date: '22. 11. 2026',
    items: [
      'Dvě akce zpět a dvě dopředu se načítají předem (docházka, komentáře, věci, album i mapa), takže po swipu v otevřené akci i na velké kartě je všechno hned vidět.',
      'Pryč jsou popisky o zkušebním provozu u docházky a v detailu akce a nápověda „swipem listuj“.'
    ]
  },
  {
    version: '1.12',
    date: '22. 11. 2026',
    items: [
      'Otevřená akce: při swipu z druhé strany rovnou přijíždí náhled sousední akce (název, datum, místo) a po puštění se otevře.',
      'Mapa v detailu umí podklad Mapy.com (turistická mapa) — stačí doplnit API klíč do config.js. Bez klíče zůstává OpenStreetMap.',
      'Návrat na nejbližší akci (tlačítko Akce nebo „nejbližší“) je jeden plynulý pohyb — karty mezi tím projedou po oblouku najednou, bez trhání a skoků. U dlouhého skoku se ukážou jen první a poslední karty.'
    ]
  },
  {
    version: '1.11',
    date: '22. 11. 2026',
    items: [
      'Detail akce: název místa je přímo v mapě (vlevo dole, vedle „Navigovat“), takže řádek s místem se při zobrazené mapě schová. Když se mapa načíst nedá, řádek zůstane.',
      'Album fotek se otevírá klepnutím kamkoli na horní plochu s obrázkem — samostatný řádek „Album fotek“ už v seznamu není.',
      'Otevřenou akci jde swipem přepnout na sousední: doleva pozdější akce, doprava dřívější (stejně jako velká karta). Stránka odjede po oblouku a další přijede z druhé strany.'
    ]
  },
  {
    version: '1.10',
    date: '22. 11. 2026',
    items: [
      'Detail proběhlé akce: místo „Kdo jde“ je „Zúčastnili se“ a místo „Co přinést“ je „Přinesli“ (co a kdo). Prázdné sekce se nezobrazují, „Nejdou“ u proběhlých akcí zmizelo.',
      'Pod místem akce je výřez mapy se špendlíkem (OpenStreetMap). Klepnutím na mapu se otevře navigace. Známá místa party mají přesné souřadnice, ostatní adresy se dohledají a zapamatují v zařízení.'
    ]
  },
  {
    version: '1.09',
    date: '22. 11. 2026',
    items: [
      'Detail proběhlé akce: bez tlačítka „Do kalendáře“.',
      'Řádek „Album fotek“ je klikací celý (bez popisku „Otevřít“), stejně tak přiložené soubory. Odkaz na Google Fotky se už neopakuje v popisu akce.',
      'U starších akcí je u data i rok a místo „před 4012 dny“ se píše „před 11 lety“ (podobně „před 7 měsíci“, „za 2 měsíce“).'
    ]
  },
  {
    version: '1.08',
    date: '22. 11. 2026',
    items: [
      'Kalendář: měsíce jde listovat swipem — doleva další měsíc, doprava předchozí. Mřížka při tom odjede a nový měsíc přijede z druhé strany (stejně u šipek).',
      'Klepnutí na název měsíce s rokem otevře výběr: řada let nahoře a pod ní všech 12 měsíců s počtem akcí. Rovnou tak skočíš třeba do roku 2010.'
    ]
  },
  {
    version: '1.07',
    date: '22. 11. 2026',
    items: [
      'Spodní nabídky (kalendář, potvrzení, fotoalbum…) jdou zavřít klepnutím na čárku nahoře nebo potažením dolů.',
      'Návrat na nejbližší akci jde karta po kartě — všechny akce mezi aktuální a nejbližší se postupně protočí.',
      'Tlačítko „Akce“ ve spodní liště reaguje hned na první klepnutí (dřív na iPhonu po posouvání až na druhé).'
    ]
  },
  {
    version: '1.06',
    date: '22. 11. 2026',
    items: [
      'Klepnutí na „Akce“ ve spodní liště vrátí velkou kartu na nejbližší akci se stejnou animací jako při swipu (a zavře hledání). Stejně funguje tlačítko „nejbližší“ pod kartou.',
      'Odstraněný přepínač Nadcházející / Proběhlé. Proběhlé akce najdeš swipem na kartě doprava, v hledání nebo v kalendáři.'
    ]
  },
  {
    version: '1.05',
    date: '22. 11. 2026',
    items: [
      'Listování velkou kartou: při swipu z druhé strany po stejném oblouku přijíždí akce, na kterou přecházíš, a po puštění zapadne na místo. Stejně to funguje i u tlačítek „dřívější / pozdější“.',
      'Když už další (nebo starší) akce není, karta se jen pruží zpátky a ukáže se upozornění.'
    ]
  },
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
