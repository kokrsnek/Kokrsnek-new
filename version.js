// Číslo verze a seznam změn. Při každé nové verzi:
//  1) přidej nový záznam NA ZAČÁTEK seznamu CHANGELOG,
//  2) ve sw.js zvyš název mezipaměti (CACHE), ať si telefony stáhnou nové soubory.
export const CHANGELOG = [
  {
    version: '1.32',
    date: '22. 11. 2026',
    items: [
      'Čtyři nové vzhledy (Parta → Vzhled):',
      'Táborák — žhavé uhlíky, nejbližší akce jako oranžový plakát s obřím datem, seznam jako časová osa, plovoucí lišta s „+“ jako uhlík.',
      'Zápisník — linkovaný papír, akce na lepicím papírku, ručně psané nadpisy, záložky diáře na pravém okraji a „+“ jako razítko.',
      'Značení — turistické značky, akce jako žlutá směrovka, barevné pásové značky v seznamu, tmavá hranatá lišta.',
      'Neon — noc se skleněnými kartami a září, přepínač záložek nahoře a plovoucí „+“ vpravo dole.'
    ]
  },
  {
    version: '1.31',
    date: '22. 11. 2026',
    items: [
      'Úvodní animace (4 s) při prvním spuštění: šnek s batohem jde při západu slunce po stezce k chatě, oheň vzplane a šnek v klobouku hraje na kytaru. Klepnutím jde přeskočit.',
      'Animaci jde kdykoli přehrát znovu v Partě (tlačítko pod Odhlásit se).'
    ]
  },
  {
    version: '1.30',
    date: '22. 11. 2026',
    items: [
      'Vlastní emoji party (Pivo, Gril, Táborák, Hastrman, šnek KoKrŠNeK…) v záložce „Naše“, běžné emoji v záložce „Běžné“.',
      'Emoji jdou použít v reakcích v chatu, u check-inů a nově i u komentářů akcí (dlouhé podržení komentáře).',
      'Profilová fotka: v Partě klepni na své kolečko a vyber fotku. Ukáže se všude místo písmena (chat, komentáře, docházka, check-iny).'
    ]
  },
  {
    version: '1.29',
    date: '22. 11. 2026',
    items: [
      'Počasí: na kartě nejbližší akce teplota a šance na srážky, v detailu nadcházející akce karta po hodinách (předpověď asi 2 týdny dopředu).',
      'U proběhlé akce řádek „Počasí bylo…“ se skutečnou teplotou a srážkami.',
      'Lajky jako ve staré aplikaci: srdíčko na kartě akce, počet v seznamu a v detailu kdo dal lajk. Sčítají se se starou aplikací a parta dostane notifikaci.',
      'Déšť nebo sníh přes aplikaci podle počasí tam, kde právě jsi.'
    ]
  },
  {
    version: '1.28',
    date: '22. 11. 2026',
    items: [
      'Menu „+“: nová položka „Zpráva v chatu“ — vybereš celou partu nebo jednoho člověka a rovnou se otevře konverzace.',
      '„Přidat akci“ a „Přidat fotoalbum“ se v menu „+“ ukazují jen správci.'
    ]
  },
  {
    version: '1.27',
    date: '22. 11. 2026',
    items: [
      'Kde jsi?: místo ikonky polohy má každý check-in malý výřez mapy (OpenStreetMap) se špendlíkem. Klepnutím se místo otevře v Google Mapách.'
    ]
  },
  {
    version: '1.26',
    date: '22. 11. 2026',
    items: [
      'Dlouhý dotyk už nikde neoznačuje text a neotevírá systémovou nabídku „Zkopírovat / Vyhledat“ — jen nabídku aplikace (reakce, odpovědět, kopírovat, smazat).',
      'V polích pro psaní jde text označovat a vkládat jako dřív.'
    ]
  },
  {
    version: '1.25',
    date: '22. 11. 2026',
    items: [
      'Chat na iPhonu: oprava třesení při posouvání konverzace (oprava výšky se přepínala dokola). Roztažení na celý displej teď funguje stejně jako ve Službách.'
    ]
  },
  {
    version: '1.24',
    date: '22. 11. 2026',
    items: [
      'Chat na iPhonu: dolní okraj se už neusekne, po dobu chatu se na celý displej roztáhne i samotná stránka.'
    ]
  },
  {
    version: '1.23',
    date: '22. 11. 2026',
    items: [
      'Chat na iPhonu (aplikace na ploše): pole pro psaní je u fyzické dolní hrany displeje. iOS dával stránce menší výšku než displej, chat se teď natáhne až dolů (stejná oprava jako ve Službách).'
    ]
  },
  {
    version: '1.22',
    date: '22. 11. 2026',
    items: [
      'Chat: pole pro psaní sedí úplně u dolní hrany displeje, pod ním už není tmavý pruh.'
    ]
  },
  {
    version: '1.21',
    date: '22. 11. 2026',
    items: [
      'Chat: zmizel prázdný pruh pod polem pro zprávu, obrazovka sedí přesně na displej (i u aplikace na ploše iPhonu).',
      'Při psaní se konverzace přizpůsobí klávesnici, pole zprávy zůstává hned nad ní.'
    ]
  },
  {
    version: '1.20',
    date: '22. 11. 2026',
    items: [
      'Soukromá konverzace: nahoře místo „soukromá zpráva“ je „online“ se zelenou tečkou, nebo kdy byl naposledy aktivní (dnes v 14:05, včera v…, datum).',
      'Seznam vláken: zelená tečka u avataru toho, kdo je právě online.',
      'Nová aplikace hlásí tvůj online stav stejně jako stará (kdo byl aktivní v poslední minutě, je online).'
    ]
  },
  {
    version: '1.19',
    date: '22. 11. 2026',
    items: [
      'Chat a Kde jsi? běží naostro: zprávy, fotky, reakce, check-iny, Přijdu taky / Jsem poblíž, emoji a komentáře jdou do skutečných dat party — stará aplikace je vidí a parta dostává notifikace jako obvykle.',
      'Testovací vlákno a testovací check-iny zmizely. Akce zůstávají ve zkušebním provozu.',
      'Konverzace se otevírá na nejnovějších zprávách a pole pro psaní je vždy dole na obrazovce (zprávy se posouvají nad ním).',
      '„Jsem poblíž“ posílá autorovi check-inu i polohu (jako stará aplikace). Fotky do chatu a ke check-inům se zmenšují na menší velikost.'
    ]
  },
  {
    version: '1.18',
    date: '22. 11. 2026',
    items: [
      'Nový check-in vypadá a funguje jako ve staré aplikaci: pole „Kde jsi“, Tvoje místa (nejčastější z tvých check-inů), Místa v okolí (stejná služba Google Places jako stará aplikace, první tři a „Další místa v okolí“), poznámka, Přidat fotku a dole Zrušit / Odeslat.'
    ]
  },
  {
    version: '1.17',
    date: '22. 11. 2026',
    items: [
      'Chat: seznam vláken (Celá parta, soukromé zprávy, testovací vlákno) s poslední zprávou, a konverzace — fotky, hlasovky, odpovědi a reakce ze staré aplikace jsou vidět.',
      'V chatu jde psát, posílat fotky, odpovídat a reagovat dlouhým podržením zprávy. Ve zkušebním provozu jen v testovacím vláknu, skutečná vlákna party se jen čtou.',
      'Kde jsi?: Feed check-inů party (podle dnů, s fotkami, poznámkou, Přijde/Poblíž, reakcemi a komentáři) a Mapa s posledními check-iny.',
      'Nový check-in (tlačítko nahoře nebo + → Check-in): zjistí polohu, nabídne název místa (známá místa party a Mapy.com), poznámka a fotka. Ve zkušebním provozu se ukládá jako testovací — parta ho neuvidí ani nedostane notifikaci.'
    ]
  },
  {
    version: '1.16',
    date: '22. 11. 2026',
    items: [
      'Mapa v detailu akce je z Mapy.com (turistická mapa) s jejich logem.',
      'Klepnutí na mapu otevře místo na Mapy.com, tlačítko „Navigovat“ spustí navigaci v Google Mapách.',
      'Swipe v otevřené akci: po zastavení karty už neproblikne mapa (čeká se i na načtení mapových dlaždic) ani logo — přijetá stránka zůstane navrchu, dokud není nová úplně hotová.'
    ]
  },
  {
    version: '1.15',
    date: '22. 11. 2026',
    items: [
      'Fotka v hlavičce akce: tlačítkem s obrázkem vlevo dole vybereš fotku z telefonu (zmenší se a uloží k akci). Jde ji změnit nebo odebrat.',
      'V pravém dolním rohu hlavičky je vždy průhledné logo KoKrŠNeK.',
      'Když má akce album, je nad fotkou štítek „Otevřít album“ (klepnutí kamkoli na fotku album otevře).',
      'Akce bez vlastní fotky dostane vygenerovanou ilustraci podle názvu a popisu (oheň, zima, voda, kola, pochod, bowling, grilovačka, hudba, bouda) v barvách ročního období podle data. Každá akce má drobné vlastní obměny.'
    ]
  },
  {
    version: '1.14',
    date: '22. 11. 2026',
    items: [
      'Swipe v otevřené akci: z druhé strany přijíždí celá stránka sousední akce — kdo šel, co přinesli, komentáře i mapa — z předem načtených dat. Po puštění zůstane přesně tak, jak přijela.',
      'Mapa: dlouhé adresy s názvem podniku (např. „Vila MORAVIA, Pasohlávky 50E, …“) se dohledají i bez názvu podniku.'
    ]
  },
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
