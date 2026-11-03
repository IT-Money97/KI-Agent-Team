# Ergebnis: Albion Werkbank (Neubau des Albion-Crafting-Tools)

Datum: 2026-11-03 · Ordner: `projekte/albion-tool/` · App: `projekte/albion-tool/app/`

## Was ist entstanden
Ein lokales Tool für Albion-Online-Spieler, das ohne Installation von Paketen läuft (nur Node.js 18+, Start per `start.bat` bzw. `start.sh`):
- **Crafting & Refining**: alle 9.400 Rezepte aus den Spieldaten, automatische Rückgabequote je Stadt/Insel/Hideout inkl. Spezialisierung, Fokus und Tagesbonus, Fokus mit FCE, Stationsgebühr, Lager, Zutaten selbst herstellen (ganze Refining-Ketten), Verkauf mit Steuern, Vergleich mit/ohne Fokus, Einkaufsliste.
- **Markt**: Städtevergleich mit Datenalter, Handelsrouten inkl. Schwarzmarkt, Profit-Scanner für ganze Kategorien, Preisverlauf.
- **Insel**: Farm, Kräutergarten, Weide, Zwinger mit echten Daten zu Ernte, Samenrückgabe, Nachwuchs, Futter, Tierprodukten, Schlachten, Fokus und Gewinn pro Tag.
- **Planer**: gespeicherte Pläne, gemeinsame Einkaufsliste je Stadt, Fokusbedarf, Backup.

## Was am alten Tool falsch war (Auszug)
- Rückgabequote musste man selbst eintragen; Stadt- und Fokusboni fehlten.
- Verzauberte Materialien wurden mit falscher ID abgefragt (`…_LEVEL1` statt `…_LEVEL1@1`), deshalb fehlten Preise.
- Nur Items mit „ARTEFACT“ im Namen galten als nicht rückgabefähig.
- Chargengrößen hart codiert, Rezepte einzeln live von der GameInfo-API.
- Insel komplett ohne Spieldaten.

## Datenquellen
- Spieldaten: ao-bin-dumps (Rezepte, Item-Werte, Stadtboni, Farming, Tiere, Loot); lokal gebaut, in der App per Knopf aktualisierbar.
- Marktpreise: Albion Online Data Project (Community), über lokalen Proxy mit Cache und Ratenlimit.
- Das offizielle Wiki und die Markt-API waren aus der Bauumgebung gesperrt. Formeln wurden mit den Spieldaten und Community-Quellen gegengeprüft; die Markt-Ansichten wurden mit Testdaten geprüft.

## Qualität
- `npm test`: 10/10 grün (u. a. RRR 15,3/36,7/53,9 %, Fokusformel, Rezept-IDs, Mahlzeiten-Chargen, Saat- und Futterwerte).
- Browser-Test 1440 px und 375 px, hell und dunkel: keine Konsolenfehler, kein horizontales Scrollen.
- Eine Review-Runde durch den UX-Tester, alle Muss- und Sollte-Punkte erledigt (`projekte/albion-tool/FEEDBACK-1.md`).

## Annahmen und offene Punkte
- Premium verdoppelt die Ernte (Community-Wert, einstellbar).
- Fokus beim Gießen/Füttern: 1.000 je Feld laut Spieldaten; Nachwuchs-Chance mit Fokus bei Pferden/Ochsen ist eine Schätzung.
- Erster echter Test mit Live-Marktdaten muss auf Turans PC passieren (`start.bat`).
- Noch nicht drin: Arbeiter (Laborer), Handelsvolumen in Routen, Karten-Layout der Materialtabelle am Handy.
