// Číslo verze a seznam změn. Při každé nové verzi:
//  1) přidej nový záznam NA ZAČÁTEK seznamu CHANGELOG,
//  2) ve sw.js zvyš název mezipaměti (CACHE), ať si telefony stáhnou nové soubory.
export const CHANGELOG = [
  {
    version: '1.96',
    date: '25. 11. 2026',
    items: [
      'Kalendář: vícedenní akce jsou spojené do jednoho bloku přes celý týden (na konci týdne pokračují do dalšího řádku).',
      'Hledání potažením dolů i na Kde jsi? (místo nebo akce), v Chatu (jméno nebo zpráva) a ve Fotkách (album, místo, rok) – stejně jako na Akcích.'
    ]
  },
  {
    version: '1.95',
    date: '25. 11. 2026',
    items: [
      'Zkušební notifikace pro správce na minutu rozsvítí i odznaky v dolní liště (jen v jeho telefonu, naoko).'
    ]
  },
  {
    version: '1.94',
    date: '25. 11. 2026',
    items: [
      'Oprava: při swipu mezi otevřenými akcemi přes novou kartu znovu přejela ta samá (přechod obrazovek se spustil navíc).'
    ]
  },
  {
    version: '1.93',
    date: '25. 11. 2026',
    items: [
      'Detail akce: počasí už nevede na meteoblue.'
    ]
  },
  {
    version: '1.92',
    date: '25. 11. 2026',
    items: [
      'Detail akce: počasí je v poloviční kartě ve stejných barvách jako ostatní karty.',
      'Klepnutím na počasí se otevře podrobná předpověď pro místo akce (meteoblue).'
    ]
  },
  {
    version: '1.91',
    date: '25. 11. 2026',
    items: [
      'Nastavení party: správce si může poslat zkušební notifikace (chat, check-in, nová akce) – přijdou jen jemu, hned nebo za 15 s.'
    ]
  },
  {
    version: '1.90',
    date: '25. 11. 2026',
    items: [
      'Odznaky v dolní liště: u Chatu počet nepřečtených zpráv (ztlumené chaty se nepočítají), u Kde jsi? tečka za nový check-in, u Akcí tečka za novou akci nebo změnu akce, kam jdeš.',
      'Číslo na ikoně na ploše: součet nepřečtených. Při notifikaci se zvýší, po otevření se srovná.'
    ]
  },
  {
    version: '1.89',
    date: '25. 11. 2026',
    items: [
      'Úvodní animace: u ohně přibyl šnek, který hraje na basu.'
    ]
  },
  {
    version: '1.88',
    date: '25. 11. 2026',
    items: [
      'Oprava: gesto zpět od okraje obrazovky na iPhonu vracelo o dvě obrazovky (z detailu check-inu až na Akce).',
      'Po návratu z detailu check-inu (šipkou i gestem) najede Feed na ten check-in.'
    ]
  },
  {
    version: '1.87',
    date: '25. 11. 2026',
    items: [
      'Kde jsi?: klepnutím na check-in se otevře jeho detail – velký název místa, poznámka, fotka (klepnutím zvětšíš), mapa, kdo přijde nebo je poblíž, reakce a komentáře s polem dole.',
      'Na mapě v detailu je vpravo dole šipka, která spustí navigaci na místo.',
      'Odkazy z oznámení a z profilu teď otevírají rovnou detail check-inu.'
    ]
  },
  {
    version: '1.86',
    date: '25. 11. 2026',
    items: [
      'Kde jsi?: u check-inu z akce, který už není aktuální, je místo „Jsem na místě“ napsáno „Byl jsem tu“.'
    ]
  },
  {
    version: '1.85',
    date: '25. 11. 2026',
    items: [
      'Akce: hledání už nemá křížek – zavřeš ho posunutím karty nahoru (funguje i s otevřenou klávesnicí a po napsání textu).',
      'Prázdné hledání se zavře i zavřením klávesnice.'
    ]
  },
  {
    version: '1.84',
    date: '25. 11. 2026',
    items: [
      'Akce: nahoře kratší datum se svátkem – „st 25. listopadu – Kateřina“.'
    ]
  },
  {
    version: '1.83',
    date: '25. 11. 2026',
    items: [
      'Úvodní animace: kolem chaty rostou listnaté stromy.'
    ]
  },
  {
    version: '1.82',
    date: '25. 11. 2026',
    items: [
      'Kde jsi?: u check-inu jde vybrat, jak ses na místo dostal – pěšky, kolo, auto, motorka, MHD nebo šnečím tempem. Nic není předvybrané.',
      'Ikona dopravy se ukáže u avataru ve Feedu i v pruhu „Teď“, text u času check-inu. Jde změnit i v úpravě check-inu.',
      'Nový filtr Doprava – vybereš jeden nebo víc způsobů.'
    ]
  },
  {
    version: '1.81',
    date: '25. 11. 2026',
    items: [
      'Kde jsi?: nahoře pruh „Teď“ – kdo má právě aktuální check-in (oranžový kroužek = je na akci). Klepnutím sjedeš na jeho check-in.',
      'Ve Feedu i na mapě jsou i „Jsem na místě“ u akcí, s oranžovým štítkem akce (klepnutím do detailu).',
      'Nový check-in pozná dnešní akci do 1 km a nabídne „Jsi na akci?“ – jedním klepnutím check-in, „Jsem na místě“ i „Jdu“.',
      'Filtry: hledání místa nebo akce, Teď, Dnes, Týden, Na akcích, S fotkou, Já a výběr lidí. Platí pro Feed i Mapu.'
    ]
  },
  {
    version: '1.80',
    date: '25. 11. 2026',
    items: [
      'Kde jsi?: zvoneček nahoře zapíná upozornění na nové check-iny a reakce na ty tvoje (stejné nastavení jako ve staré aplikaci).',
      'Klepnutí na notifikaci o check-inu otevře přímo ten check-in.',
      'Feed ukazuje všechny check-iny (starší se načítají při posunu dolů), mapa jen check-iny za posledních 7 dní.',
      'Aktuální check-in má štítek „právě tady“. Skončí, když autor udělá nový check-in nebo otevře aplikaci dál než 1 km od místa (nejpozději po 24 h). „Přijdu taky“ a „Jsem poblíž“ jdou jen u aktuálního check-inu.',
      'Vlastní check-in jde upravit (místo, poznámka, fotka).'
    ]
  },
  {
    version: '1.79',
    date: '25. 11. 2026',
    items: [
      'Chat: po odtažení řádku doleva se jako ve Zprávách na iPhonu postupně objevují kulatá tlačítka (smazat, připnout, ztlumit), která rostou s tím, jak táhneš.'
    ]
  },
  {
    version: '1.78',
    date: '25. 11. 2026',
    items: [
      'Správce může upravit každou akci (název, místo, datum, čas, popis, album) – i převzatou z Google Kalendáře. Takovou akci pak import z kalendáře už nepřepíše.',
      'Oprava: akce „0:00 – 0:00 dalšího dne“ přepnutá na celý den se už neuloží jako dvoudenní.'
    ]
  },
  {
    version: '1.77',
    date: '25. 11. 2026',
    items: [
      'Akce: když otevřeš detail akce z velké karty posunuté na jinou akci a vrátíš se zpět, karta zůstane na té akci (na nejbližší ji vrátí „nejbližší“ nebo klepnutí na Akce dole).'
    ]
  },
  {
    version: '1.76',
    date: '25. 11. 2026',
    items: [
      'Úvodní animace: chata podle skutečné boudy – podsada se saloonem, zábradlí, cedule, štít s lebkou a nápisem KOKRŠNEK V.T.S., okenice a dřevo.'
    ]
  },
  {
    version: '1.75',
    date: '25. 11. 2026',
    items: [
      'Fotky podle akcí: akce může mít vlastní skupinu – „Osada 33. výročí“ je mezi výročními ohni.',
      'Import z Google Kalendáře nepřepíše akce, které se upravily přímo v aplikaci.'
    ]
  },
  {
    version: '1.74',
    date: '25. 11. 2026',
    items: [
      'iPhone (iOS 26): nový pokus o odstranění bílého pruhu pod spodní lištou – když Safari stránku zkrátí, aplikace ji posune o pixel dolů, stejně jako když ji lehce potáhneš prstem.'
    ]
  },
  {
    version: '1.73',
    date: '25. 11. 2026',
    items: [
      'iPhone (iOS 26): obejití chyby Safari, kdy po zavření klávesnice zůstal pod spodní lištou bílý pruh (v kalendáři, v úvodní animaci i jinde).'
    ]
  },
  {
    version: '1.72',
    date: '25. 11. 2026',
    items: [
      'Parta → Vzhled: místo dlouhé mřížky jen jeden řádek s náhledem. Po klepnutí vyjede zespodu výběr všech 11 vzhledů, vybraný se použije hned.'
    ]
  },
  {
    version: '1.71',
    date: '25. 11. 2026',
    items: [
      'Oprava: po otevření kalendáře tlačítkem už nezůstává dole bílý pruh pod spodní lištou.'
    ]
  },
  {
    version: '1.70',
    date: '25. 11. 2026',
    items: [
      'Plynulé přechody mezi obrazovkami: karty dole se prolnou s malým posunem, kalendář se rozbalí z ikony a zpět se do ní složí, nastavení, detail akce, profil a další obrazovky přijedou zprava.',
      'Swipe od levého okraje obrazovky = zpět.',
      'Když má telefon zapnuté omezení pohybu, přechody se nepouštějí.'
    ]
  },
  {
    version: '1.69',
    date: '25. 11. 2026',
    items: [
      'Úvodní animace: vlevo nahoře je po celou dobu logo party.'
    ]
  },
  {
    version: '1.68',
    date: '25. 11. 2026',
    items: [
      'Kalendář: akce „vypadnou“ do seznamu už po jedné sekundě.'
    ]
  },
  {
    version: '1.67',
    date: '25. 11. 2026',
    items: [
      'Kalendář: dny s akcí jsou vybarvené a větší, u více akcí v jednom dni je místo tečky číslo.',
      'Pod kalendářem jsou všechny akce měsíce – po dvou sekundách „vypadnou“ ze svých dnů dolů do seznamu. Klepnutím na den se seznam zúží jen na ten den, tlačítkem „Celý měsíc“ zpět.'
    ]
  },
  {
    version: '1.66',
    date: '25. 11. 2026',
    items: [
      'Akce: klepnutí na „dřívější“ a „pozdější“ otočí velkou kartu stejně jako swipe – stará karta odjede po oblouku a nová přijede z boku.'
    ]
  },
  {
    version: '1.65',
    date: '25. 11. 2026',
    items: [
      'Profil: klepnutím na položku časové osy se přesuneš přímo na místo – ke komentáři, do docházky, k lajkům, k věcem, ke zprávě v chatu party, ke check-inu, do ankety nebo do hry. Místo se krátce zvýrazní.'
    ]
  },
  {
    version: '1.64',
    date: '25. 11. 2026',
    items: [
      'Profil člena: klepni na jméno nebo avatar (u akce, v komentářích, v Kde jsi?, v chatu party, v Partě) a uvidíš všechno, co v aplikaci dělal – od nejnovějšího po úplně první stopu.',
      'Na časové ose je docházka i „Nejde“, lajky, komentáře, check-iny, věci k přinesení, zprávy a fotky z chatu party, ankety, fotoalba a hry. Filtry Akce, Kde jsi?, Komentáře, Chat party, Fotky a Hry.',
      'Zrušené účasti se od této verze zapisují do historie.'
    ]
  },
  {
    version: '1.63',
    date: '25. 11. 2026',
    items: [
      'Pecák s čárkou všude v aplikaci i v notifikacích.',
      'Hledání v Akcích: potažením dolů se otevře, potažením zpět nahoru se zavře a karta zůstane na akci, kterou jsi měl(a) otevřenou.'
    ]
  },
  {
    version: '1.62',
    date: '25. 11. 2026',
    items: [
      'V nabídkách jmen (Kdo jsi?, schvalování členů, výzvy, zprávy, docházka) je Pecák s čárkou.',
      'Zuzi už se v nabídce jmen nezobrazuje.'
    ]
  },
  {
    version: '1.61',
    date: '24. 11. 2026',
    items: [
      'Nová hra Sudoku (Chat → Hry): závod s kamarádem na stejném zadání, hra o samotě a Sudoku dne pro celou partu se žebříčkem časů.',
      'Tři obtížnosti, poznámky, krok zpět a jedna nápověda na hru. Chyby se ukážou až po vyplnění celé mřížky, každá přidá k času 30 s.'
    ]
  },
  {
    version: '1.60',
    date: '24. 11. 2026',
    items: [
      'Vzhled Vodáci: tečky u akcí posunuté o další pixel, teď už opravdu na středu svislé linie.'
    ]
  },
  {
    version: '1.59',
    date: '24. 11. 2026',
    items: [
      'Vzhled Vodáci: tečky u akcí jsou přesně uprostřed svislé linie.'
    ]
  },
  {
    version: '1.58',
    date: '24. 11. 2026',
    items: [
      'Světlý režim pro Původní vzhled: Parta → Vzhled → Tmavý / Světlý / Podle telefonu. Volba se pamatuje i po zavření aplikace.'
    ]
  },
  {
    version: '1.57',
    date: '24. 11. 2026',
    items: [
      'Opraveno: vybraný vzhled (např. Táborák, Komiks, Vodáci, Western) zůstane i po zavření a aktualizaci aplikace.'
    ]
  },
  {
    version: '1.56',
    date: '24. 11. 2026',
    items: [
      'Připraveno přepnutí naostro: od 1. 12. 2026 se aplikace sama přepne — konec zkušebního provozu, správce upravuje všechny akce, import z Google Kalendáře zmizí.',
      'Formulář na obědy běží i v nové aplikaci (kokrsnek.cz/obed).'
    ]
  },
  {
    version: '1.55',
    date: '23. 11. 2026',
    items: [
      'Detail akce: Příspěvek a Náklady mají nové ikony (peněženka, účtenka), text jen „Náklady“.',
      'Opraveno bílé tlačítko „Upravit“ u účastníků a další odkazová tlačítka (např. „+ Nová anketa“).'
    ]
  },
  {
    version: '1.54',
    date: '23. 11. 2026',
    items: [
      'Nabídka „Zapnout upozornění?“ se ukáže až po úvodní animaci, na obrazovce Akce.'
    ]
  },
  {
    version: '1.53',
    date: '23. 11. 2026',
    items: [
      'Parta (správce): u žádosti o přijetí je vidět, jestli si člověk vybral jméno ze staré aplikace, nebo nové, a jestli jméno už nemá někdo jiný. Jméno jde před přijetím změnit.'
    ]
  },
  {
    version: '1.52',
    date: '23. 11. 2026',
    items: [
      'Chat: klepnutím na fotku se otevře přes celou obrazovku, posunem do stran listuješ všemi fotkami konverzace, stažením dolů zavřeš.',
      'Chat: víc fotek vybraných najednou se ukáže jako mřížka (4 a víc s „+N“).',
      'Fotky: čip „Podle akce“ je hned vedle „Vše“.'
    ]
  },
  {
    version: '1.51',
    date: '23. 11. 2026',
    items: [
      'Akce: lupa zmizela — hledání otevřeš potažením hlavní karty dolů (na počítači kolečkem myši nahoru nebo klávesou /). Zavře se křížkem nebo klepnutím na Akce dole.'
    ]
  },
  {
    version: '1.50',
    date: '23. 11. 2026',
    items: [
      'Nová záložka Fotky: fotoalba z akcí jako galerie, filtr podle roku a „Podle akce“ (stejná akce napříč roky). Nová alba mají značku NOVÉ a počet na záložce.',
      'Parta se otevírá ozubeným kolem vpravo nahoře v Akcích (tam je i odznak čekajících žádostí). Zvoneček z Akcí zmizel — notifikace se zapínají v Partě.',
      'Po instalaci na plochu se aplikace sama nabídne zapnout upozornění (stačí jedno klepnutí).'
    ]
  },
  {
    version: '1.49',
    date: '23. 11. 2026',
    items: [
      'Android: v horní liště u upozornění je místo bílého čtverečku bílý šnek.'
    ]
  },
  {
    version: '1.48',
    date: '23. 11. 2026',
    items: [
      'Hry: když máš hru otevřenou, upozornění „Jsi na tahu“ nechodí.',
      'Upozornění už nechodí dvakrát — kdo má novou aplikaci, dostává je jen do ní.'
    ]
  },
  {
    version: '1.47',
    date: '23. 11. 2026',
    items: [
      'Správce dostane upozornění na telefon, když někdo pošle žádost o přijetí do party.',
      'Na záložce Parta svítí odznak s počtem čekajících žádostí.'
    ]
  },
  {
    version: '1.46',
    date: '23. 11. 2026',
    items: [
      'Nové ikony v chatu (tučné obrysové): ztlumit, připnout, smazat, fotka, hlasovka a hra místo systémových emoji — i v menu zprávy (Připnout nahoru) a u připnuté zprávy.'
    ]
  },
  {
    version: '1.45',
    date: '23. 11. 2026',
    items: [
      'Chat: odsunutím konverzace doleva se odkryjí tlačítka Ztlumit, Připnout a Smazat (jako ve WhatsAppu). Připnuté chaty jsou nahoře.',
      'Ve vlákně zmizela lupa a zvoneček — hledací pole se ukáže samo nahoře, když odscroluješ od poslední zprávy.',
      'Šipka dole vrátí na poslední zprávu. Šťouchnutí je zatím skryté.'
    ]
  },
  {
    version: '1.44',
    date: '23. 11. 2026',
    items: [
      'Hry v chatu: piškvorky (15×15, pět v řadě), lodě (10×10, 5 lodí) a pexeso s emoji party.',
      'V soukromé konverzaci tlačítko 🎮 — výzva přijde jako karta ve zprávách a druhý dostane upozornění, když je na tahu.',
      'Přehled her: rozehrané hry, nová hra s kamarádem nebo proti počítači a statistiky výher.'
    ]
  },
  {
    version: '1.43',
    date: '22. 11. 2026',
    items: [
      'Narozeniny a svátky členů party: jednou denně po otevření dialog s konfetami — oslavenec dostane přání, ostatní připomínku „Nezapomeň popřát…“.',
      'Kde jsi? → nová záložka Místa: kde se parta nejčastěji schází, kdo tam byl kolikrát, kdy naposledy a jak daleko to je.',
      'Ukazatel offline: když není signál, nahoře se ukáže „Jsi offline — ukazuju uložená data“.',
      'Verze pro počítač: na široké obrazovce je lišta vlevo, akce ve dvou až třech sloupcích a detail uprostřed.'
    ]
  },
  {
    version: '1.42',
    date: '22. 11. 2026',
    items: [
      'U proběhlé akce tlačítko „💰 Příspěvek“ s QR platbou a číslem účtu ke zkopírování.',
      '„🧾 Náklady“ — účtenka s položkami, příspěvky a výsledkem (v plusu / v mínusu) a roční přehled. Zadává a upravuje správce, stejná data jako stará aplikace.'
    ]
  },
  {
    version: '1.41',
    date: '22. 11. 2026',
    items: [
      'Chat: hlasovky (🎤 vedle pole pro psaní), úprava vlastní zprávy, připnutí zprávy nahoru, ztlumení vlákna (zvoneček), hledání ve zprávách (lupa).',
      'U poslední vlastní zprávy je vidět „Přečteno 14:05“ (ve skupině „Viděli: …“) a nahoře „píše…“, když druhý zrovna píše.',
      'Ankety: v seznamu chatu sekce Ankety s „+ Nová anketa“, hlasování s výsledky a jmény, autor může anketu uzavřít.',
      'Hipnutí 👊 v soukromé konverzaci — druhý dostane notifikaci.',
      'Vše ve stejném formátu jako stará aplikace, takže to vidí obě.'
    ]
  },
  {
    version: '1.40',
    date: '22. 11. 2026',
    items: [
      'Správce zakládá akce naostro: uvidí je celá parta v nové aplikaci a přijde notifikace „📅 Nová akce“ (testovací akci jde pořád založit zaškrtnutím „Jen testovací“).',
      'Akce založené v aplikaci jde upravovat a mazat (správce). Akce z Google Kalendáře se dál opravují v kalendáři.'
    ]
  },
  {
    version: '1.39',
    date: '22. 11. 2026',
    items: [
      'Push notifikace: zapínají se zvonečkem na Akcích nebo v Parta → Notifikace. Chodí na stejné věci jako ve staré aplikaci (lajky, Jdu, komentáře, chat, check-iny…).',
      'Klepnutí na notifikaci otevře rovnou danou akci nebo konverzaci.',
      'Na iPhonu fungují jen u aplikace přidané na plochu.'
    ]
  },
  {
    version: '1.38',
    date: '22. 11. 2026',
    items: [
      'Docházka Jdu / Nejdu funguje naostro i u akcí z kalendáře — zapisuje se stejně jako ve staré aplikaci (parta dostane notifikaci).',
      'Co přinést: přidávání věcí, „Vezmu“ a mazání vlastních položek u všech akcí.',
      'V den akce je v detailu tlačítko „Jsem na místě“ (s ověřením polohou do 250 m) a seznam, kdo už je na místě.',
      'Správce může u proběhlé akce dodatečně upravit „Zúčastnili se“ (bez notifikace partě).'
    ]
  },
  {
    version: '1.37',
    date: '22. 11. 2026',
    items: [
      'Komentáře jdou psát u všech akcí, i u proběhlých a převzatých z kalendáře. Ukládají se stejně jako ve staré aplikaci (parta dostane notifikaci) a svůj komentář jde smazat.'
    ]
  },
  {
    version: '1.36',
    date: '22. 11. 2026',
    items: [
      'Úvodní animace trvá 6 s: po otištění razítka se kolem něj zvedne prach a celá scéna se pořádně otřese, závěr zůstane o sekundu déle.'
    ]
  },
  {
    version: '1.35',
    date: '22. 11. 2026',
    items: [
      'Úvodní animace trvá 5 s: záběr u ohně zůstane o sekundu déle a ve 3. sekundě se šikmo otiskne razítko KoKrŠNeK.',
      'Animace se teď ukáže při každém otevření aplikace (i se zapnutým „Omezit pohyb“). Klepnutím jde přeskočit.'
    ]
  },
  {
    version: '1.34',
    date: '22. 11. 2026',
    items: [
      'Vodáci: tlačítka „Pádluju“ a „Gauč doma“.',
      'Vodáci: záchranný kruh v liště se už neusekává o vlnu.',
      'Počasí pod nulou se píše „−2 až −1 °C“ místo „-2--1 °C“.'
    ]
  },
  {
    version: '1.33',
    date: '22. 11. 2026',
    items: [
      'Tři další vzhledy (Parta → Vzhled):',
      'Komiks — rastrové tečky, černé obrysy a stíny, datum ve výbuchu, akce jako okna komiksu, „+“ jako žlutý výbuch.',
      'Vodáci — řeka a vlny, kanoe pluje k nejbližší akci, tlačítka „Nasedám“ a „Zůstávám na břehu“, seznam jako zastávky po proudu, „+“ jako záchranný kruh.',
      'Western — pergamen, nejbližší akce jako plakát HLEDÁ SE, seznam jako dřevěné cedule, lišta z prken a „+“ jako šerifská hvězda.'
    ]
  },
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
