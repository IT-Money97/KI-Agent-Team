# ARCHITEKTUR: Albion Werkbank

Rolle: Architekt · Stand: 2026-11-03

## Stack
Einfachster Stack, der lokal ohne Installation läuft: Node.js 18+ (nur Standardbibliothek) als lokaler Server, Browser-Oberfläche in Vanilla-JavaScript (ES-Module), kein Build-Schritt, keine npm-Pakete. Begründung: Spieler sollen nur Node installieren und `start.bat` doppelklicken. Astro/Next wären für ein lokales Rechentool Overhead.

## Ordner
```
app/
  server.js               lokaler Server: statische Dateien, Markt-Proxy, Datenupdate
  start.bat / start.sh    Start für Windows bzw. Mac/Linux
  package.json            Skripte: start, test, update-data (keine Abhängigkeiten)
  tools/build-data.mjs    lädt ao-bin-dumps und erzeugt public/data/gamedata.json
  public/
    index.html, styles.css
    data/gamedata.json    gebaute Spieldaten (4 MB, gzip 0,3 MB)
    js/calc.js            Rechenkern ohne DOM (auch in Node-Tests)
    js/data.js            Laden, Suche, Varianten, Standorte
    js/market.js          Preisabfragen, Preis-Snapshot, Kauf-/Verkaufsseite
    js/store.js           localStorage-Zustand
    js/ui.js              DOM-Helfer
    js/views/*.js         craft, market, island, planner
  test/calc.test.mjs      node:test
```

## Datenquellen
| Zweck | Quelle | Nutzung |
|---|---|---|
| Rezepte, Item-Werte, Chargen, Fokus, Rückgabefähigkeit | ao-bin-dumps `items.json` | beim Datenbau |
| Itemnamen DE/EN | ao-bin-dumps `formatted/items.json` | beim Datenbau |
| Stadtboni (Herstellen/Veredeln, Spezialisierungen, Insel, Hideouts) | `craftingmodifiers.json` | beim Datenbau |
| Ertragsboni der Städte/Inseln für Pflanzen/Tiere | `farmingmodifiers.json` | beim Datenbau |
| Ernte-/Produktmengen | `loot.json` | beim Datenbau |
| Fokusbonus 0,59, Marktsteuern 8 %/2,5 % | `gamedata.xml` (als Konstanten übernommen) | fest im Datenbau |
| Marktpreise, Verlauf | Albion Online Data Project `/api/v2/stats/prices`, `/history` | live über Proxy |

GameInfo-API wird nicht mehr gebraucht. Das Wiki war aus der Bauumgebung nicht erreichbar; Formeln wurden mit den Spieldaten und Community-Quellen (albionmarket.gg, Albion Free Market) gegengeprüft.

## Datenmodell (gamedata.json)
- `items[id]`: `n` (DE), `e` (EN), `t` Tier, `l` Verzauberung, `k` Typ, `s`/`s1`/`s2` Shopkategorien, `c` Crafting-Kategorie (für Stadtboni), `v` Item-Wert, `w` Gewicht, `q` hat Qualität, `nu`/`fc` Nährwert/Futterkategorie.
- `recipes[id]`: Liste von Rezeptvarianten `{ a: Menge je Herstellung, f: Fokus, s: Silber, p: Rückgabe als Produkt, r: [[id, Anzahl, 0 = nicht rückgabefähig]] }`.
- IDs sind kanonisch wie im Markt: verzauberte Ressourcen `T4_PLANKS_LEVEL1@1`, Ausrüstung `T4_MAIN_SWORD@1`.
- `locations`: Städte, Rasten, Hideouts mit `refining`, `crafting`, `island`, `mods`.
- `farmMods[Stadt][farmable]`: Ertragsbonus Stadt/Insel.
- `farming.crops`, `farming.animals`, `farming.foods`.

## Rechenmodell (calc.js)
- Produktionsbonus PB = Standortbonus + Spezialisierung + Fokus (0,59) + Tagesbonus; Rückgabe RRR = PB / (1 + PB). Insel: Standortbonus 0.
- Materialbedarf = Anzahl × Herstellungen × (1 − RRR), nur für rückgabefähige Zutaten (`maxreturnamount` ≠ 0).
- Fokus = Basisfokus × 0,5^(FCE / 10.000).
- Stationsgebühr = Item-Wert × Menge je Herstellung × 0,1125 × Gebühr / 100. Item-Wert von Ausrüstung = Summe der Zutatenwerte.
- Verkauf netto = Preis × (1 − Steuer − Einstellgebühr); Steuer 4 % mit, 8 % ohne Premium; Einstellgebühr 2,5 % nur bei Aufträgen.
- Pflanzen: Ernte = Ø Lootliste × Premiumfaktor × (1 + Inselbonus); Samenrückgabe = Grundchance (+ Fokusbonus/2 beim Gießen).
- Tiere: Futter = Nährwertbedarf / (Nährwert × 2 bei Lieblingsfutter); Nachwuchs = Grundchance (+ Fokusbonus/2 je Fokus-Fütterung).

## Server
- Bindet nur an 127.0.0.1; prüft den Host-Header (Schutz vor DNS-Rebinding).
- `/api/market/prices|history`: Whitelist für Server, Städte, Item-IDs und Qualitäten; Cache 3 Min. (Preise) bzw. 30 Min. (Verlauf); Ratenlimit 150/Min und 280/5 Min (unter dem API-Limit 180/300).
- `POST /api/data/update` mit Header `x-werkbank: 1`: baut die Spieldaten neu.
- Statische Dateien nur aus `public/`, gzip ab 100 KB.

## Datenschutz
Keine Konten, kein Tracking, keine personenbezogenen Daten. Einstellungen, Pläne und Preis-Schnappschuss liegen in `localStorage` des Browsers. Externe Abrufe nur an raw.githubusercontent.com (Datenupdate) und albion-online-data.com (Preise).
