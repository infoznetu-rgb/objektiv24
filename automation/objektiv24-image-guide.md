# Objektív24 — pravidlá obrázkov pre automatické návrhy

## Cieľ
Každý automaticky pripravený návrh má dostať obrazový plán, ktorý čo najlepšie zodpovedá téme a zároveň neklame čitateľa. Prednosť má skutočná fotografia s jasným právom na použitie. AI je záloha, nie náhrada dokumentárnej fotografie.

## Poradie výberu
1. Relevantná fotografia z Wikimedia Commons s licenciou CC0, Public Domain, CC BY alebo CC BY-SA.
2. Vlastná fotografia Objektív24.
3. Oficiálny obrázok primárneho zdroja iba vtedy, ak je povolené jeho opätovné použitie alebo máme súhlas.
4. Ak nič bezpečné nie je, vlastná AI ilustrácia v štýle Objektív24.

## Čo má automatický návrh pripraviť
Pri vytvorení článku má systém pripraviť aj:
- `image_search_query` — krátky konkrétny motív vhodný na vyhľadávanie fotografie, ideálne v angličtine pre Wikimedia Commons,
- návrh ALT textu,
- pri AI fallbacku stručné obrazové zadanie,
- odporúčanie, či je téma citlivá a AI má byť iba symbolická.

Samotná fotografia sa nesmie automaticky považovať za schválenú. Pred publikovaním ju musí redaktor vizuálne skontrolovať.

## Povinné metadáta obrázka
Redakcia ukladá k článku:
- `image_url`
- `image_type`: `photo`, `official`, `own` alebo `ai`
- `image_alt`
- `image_source_url`
- `image_credit`
- `image_license`
- `image_position` — ohnisko výrezu
- `image_search_query`
- `image_reviewed`

Pri fotografii z Wikimedia Commons sa autor, licencia a zdroj prevezmú z metadát Commons. Na verejnom webe sa zdroj a typ obrázka zobrazujú automaticky.

## Zakázané
- obrázky skopírované z médií bez licencie,
- watermarky,
- nesúvisiace generické stock fotografie len preto, aby článok „nejaký obrázok mal“,
- fotografia, ktorá predstiera konkrétnu udalosť, hoci vznikla inde,
- falošná fotografia udalosti alebo osoby,
- AI obrázok vydávaný za dokumentárnu fotografiu,
- AI podoba konkrétnej reálnej osoby v udalosti, ktorá sa nestala alebo nie je doložená,
- text, titulky, logá médií alebo falošné dokumenty priamo v obrázku.

## Ako vyberať skutočnú fotografiu
Hľadať najprv predmet alebo prostredie, nie dramatickú rekonštrukciu udalosti. Príklady:
- uzávera cesty → reálna cesta, dopravné obmedzenie, cyklistická premávka; nie vymyslená konkrétna nehoda,
- dávky → dokumenty, domácnosť, pobočka; nie stereotypná fotografia „chudobnej rodiny“,
- zdravotníctvo → nemocnica, ambulancia, zdravotnícke prostredie; nie falošný pacient,
- energia → dom, solárne panely, merač, vykurovanie,
- podvod → mobil, počítač, bezpečnostný motív bez čitateľnej falošnej SMS,
- politika → budova, rokovacia sála, dokumenty; pri konkrétnej osobe používať iba skutočnú licencovanú fotografiu.

## Jednotný AI štýl
Moderná fotorealistická editorial ilustrácia pre slovenský spravodajský web. Horizontálny formát 16:9, čistá kompozícia, jeden hlavný motív, prirodzené svetlo, realistické materiály a prostredie. Bez textu a watermarku. Vizuál musí byť dobre čitateľný aj ako malá mobilná miniatúra.

AI obrázok musí byť na webe označený `Ilustračný obrázok · AI`.

## Prompty podľa typu témy

### Peniaze domácností
Realistická editorial scéna domácnosti pri stole s účtami, kalkulačkou, mobilom alebo notebookom. Dôraz na praktické rozhodovanie, nie luxus ani paniku.

### Dôchodky a dávky
Neutrálna civilná ilustrácia dokumentov, bankovej karty, kalendára alebo návštevy pobočky. Bez zobrazovania zraniteľných ľudí stereotypným spôsobom.

### Dane a Finančná správa
Čistý administratívny motív: formulár, kalkulačka, notebook, úradné prostredie. Nepoužívať falošné daňové dokumenty s čitateľným textom.

### Podvody a kyberbezpečnosť
Smartfón alebo notebook so symbolickým varovaním, bezpečnostným zámkom alebo podozrivou správou bez čitateľného textu. Žiadne hackerské klišé s kuklou.

### Úrady a služby štátu
Moderné slovenské administratívne prostredie, občan pri digitálnej službe, počítač, dokumenty alebo verejná budova bez klamlivej identifikácie konkrétnej inštitúcie.

### Doprava a pravidlá
Reálna cesta, križovatka, auto, chodec, cyklista alebo kolobežka. Bez inscenovanej nehody, ak článok nie je o konkrétnej nehode.

### Spotrebiteľské varovanie
Produkt, balík, nákupný košík, e-shop na mobile alebo reklamácia. Produkt nech nie je zameniteľný s konkrétnou značkou, ak to nie je potrebné.

### Zdravie a veterinárne témy
Neutrálna informačná ilustrácia prostredia, predmetu alebo zvieraťa. Bez dramatických pacientov, zranení alebo falošných medicínskych scén.

### Energia a bývanie
Dom, solárne panely, merač energie, kúrenie alebo účty za energie. Moderný realistický editorial vzhľad.

### Politika a verejné rozhodnutia
Použiť neutrálnu symbolickú ilustráciu parlamentu, rokovacej sály, dokumentov alebo verejnej inštitúcie. Nevytvárať fotorealistické falošné zábery konkrétnych politikov, mítingov alebo udalostí. Bez kampanových sloganov.

## Uloženie vlastných a AI obrázkov
Obrázky nahrané cez Redakciu sa ukladajú do Supabase Storage bucketu `article-images`, nie ako veľké base64 dáta v databáze. AI obrázky majú v ceste segment `/assets/ai/`, aby zostalo označenie typu zachované aj pri starších častiach webu.

## Kontrola pred vydaním
Článok sa nemá publikovať, kým:
- nemá relevantný obrázok,
- nemá ALT opis,
- pri cudzej fotografii nemá zdroj a licenciu,
- obrázok neprešiel redakčnou kontrolou `image_reviewed=true`.

## Testovací hybridný režim automatických článkov
Pre automatické publikovanie používaj poradie: (1) reálna licencovaná fotografia, (2) fotorealistická AI ilustrácia iba pri bezpečnej praktickej téme, (3) tematický fallback. AI test je obmedzený na prvých 10 publikovaných článkov s `image_type='ai_illustration'` alebo legacy `ai`; potom AI automatiku nepoužívaj, kým ju redakcia znovu nepotvrdí.

AI je povolená najmä pre rubriky Úrady a služby, Peniaze a práca, Rodina a zdravie, Spotrebiteľ a bezpečnosť a všeobecnú Dopravu a regióny. Zakázaná je pri politike a voľbách, nehodách, kriminalite, tragédiách, konkrétnych zásahoch polície alebo hasičov a citlivých zdravotných udalostiach.

Preferovaný typ v databáze je `image_type='ai_illustration'` (legacy `ai` zostáva podporované). Povinné metadata AI obrázka: `image_credit='Objektív24 / AI ilustrácia'`, `image_license='Interná ilustračná grafika'`, vecný ALT text a `image_reviewed=true`. Verejný web musí zobrazovať označenie **Ilustračný obrázok · AI**.
