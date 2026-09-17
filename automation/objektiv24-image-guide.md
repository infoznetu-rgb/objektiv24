# Objektív24 — pravidlá obrázkov pre automatické návrhy

## Cieľ
Každý automaticky pripravený návrh musí mať relevantný, bezpečne použiteľný obrázok. Ak sa nenájde vhodná fotografia s jasnou licenciou, použije sa vlastná AI ilustrácia.

## Poradie výberu
1. Relevantná fotografia z Wikimedia Commons s licenciou CC0, Public Domain, CC BY alebo CC BY-SA.
2. Iný primárny zdroj iba vtedy, ak explicitne povoľuje opätovné použitie.
3. Ak nič bezpečné nie je, vytvoriť AI ilustráciu v štýle Objektív24.

## Zakázané
- obrázky skopírované z médií bez licencie,
- watermarky,
- nesúvisiace generické stock fotografie,
- falošná fotografia udalosti alebo osoby,
- AI obrázok vydávaný za dokumentárnu fotografiu,
- text, titulky, logá médií alebo falošné dokumenty priamo v obrázku.

## Jednotný AI štýl
Moderná realistická editorial ilustrácia pre slovenský spravodajský web. Horizontálny formát 16:9, čistá kompozícia, jeden hlavný motív, prirodzené svetlo, tmavomodré až neutrálne prostredie s jemným limetkovým akcentom značky Objektív24. Bez textu a watermarku. Vizuál musí byť dobre čitateľný aj ako malá mobilná miniatúra.

## Prompty podľa typu témy

### 1. Peniaze domácností
Realistická editorial scéna domácnosti pri stole s účtami, kalkulačkou, mobilom alebo notebookom. Dôraz na praktické rozhodovanie, nie luxus ani paniku.

### 2. Dôchodky a dávky
Neutrálna civilná ilustrácia dokumentov, bankovej karty, kalendára alebo návštevy pobočky. Bez zobrazovania zraniteľných ľudí stereotypným spôsobom.

### 3. Dane a Finančná správa
Čistý administratívny motív: formulár, kalkulačka, notebook, úradné prostredie. Nepoužívať falošné daňové dokumenty s čitateľným textom.

### 4. Podvody a kyberbezpečnosť
Smartfón alebo notebook so symbolickým varovaním, bezpečnostným zámkom alebo podozrivou správou bez čitateľného textu. Žiadne hackerské klišé s kuklou.

### 5. Úrady a služby štátu
Moderné slovenské administratívne prostredie, občan pri digitálnej službe, počítač, dokumenty alebo verejná budova bez klamlivej identifikácie konkrétnej inštitúcie.

### 6. Doprava a pravidlá
Reálna cesta, križovatka, auto, chodec alebo kolobežka. Bez inscenovanej nehody, ak článok nie je o konkrétnej nehode.

### 7. Spotrebiteľské varovanie
Produkt, balík, nákupný košík, e-shop na mobile alebo reklamácia. Produkt nech nie je zameniteľný s konkrétnou značkou, ak to nie je potrebné.

### 8. Zdravie a veterinárne témy
Neutrálna informačná ilustrácia prostredia, predmetu alebo zvieraťa. Bez dramatických pacientov, zranení alebo falošných medicínskych scén.

### 9. Energia a bývanie
Dom, solárne panely, merač energie, kúrenie alebo účty za energie. Moderný realistický editorial vzhľad.

### 10. Politika a verejné rozhodnutia
Použiť neutrálnu symbolickú ilustráciu parlamentu, rokovacej sály, dokumentov alebo verejnej inštitúcie. Nevytvárať fotorealistické falošné zábery konkrétnych politikov, mítingov alebo udalostí. Bez kampanových sloganov.

## Uloženie AI obrázka
- cesta v repozitári: `assets/ai/YYYY/MM/<slug>.png`
- verejná URL: `https://objektiv24.sk/assets/ai/YYYY/MM/<slug>.png`
- článok má byť označený ako `Ilustračný obrázok · AI`

## Technická kontrola
Pred vložením návrhu musí byť obrázok verejne dostupný cez výslednú URL. Ak upload alebo dostupnosť zlyhá, návrh nevytvárať.
