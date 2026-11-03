# PLAN: Albion Werkbank (Neubau des „Albion Ledger“)

Rolle: Projektleiter · Stand: 2026-11-03 · Auftraggeber: Turan

## Ausgangslage
Turan hat ein eigenes Tool „Albion Ledger“ (index.html, app.js mit 1.841 Zeilen, server.js) gebaut. Probleme laut Analyse:
- Rückgabequote (RRR) musste man selbst eintragen; Stadt-, Spezialisierungs- und Fokusboni fehlten ganz.
- Rezepte kamen live von der GameInfo-API (instabil, je Item ein Abruf). Chargengrößen waren hart codiert (Mahlzeit 10, Trank 5), nicht aus den Spieldaten.
- Verzauberte Materialien wurden mit falscher ID abgefragt (`T4_METALBAR_LEVEL1` statt `T4_METALBAR_LEVEL1@1`), dadurch fehlten Marktpreise.
- Artefakt-Erkennung nur über den Text „ARTEFACT“ in der ID; Herzen, Token, Tiere usw. wurden fälschlich als rückgabefähig gerechnet.
- Rückgabe-Simulation mit erfundener 0,75-Rundungsregel.
- Insel komplett manuell, keine Daten zu Saatgut, Tieren, Futter, Wachstum.
- Keine Stationsgebühr aus dem Item-Wert, keine Marktsteuer-Logik (Premium/Einstellgebühr), keine Handelsrouten, kein Profit-Scanner.

## Ziel
Ein lokal laufendes Tool, mit dem Spieler Crafting, Refining, Handel und Insel planen und durchrechnen können, mit korrekten Spieldaten.

## Annahmen (statt Rückfragen)
- Zielgruppe: deutschsprachige Albion-Spieler auf allen drei Servern (Europa, Amerika, Asien). Itemnamen umschaltbar DE/EN.
- „Lokal für die User“: Start per Doppelklick (start.bat) bzw. start.sh, Node.js 18+ als einzige Voraussetzung, keine Installation von Paketen, Daten bleiben im Browser.
- Spieldaten aus den ao-bin-dumps (Community-Export der Spieldateien) statt GameInfo-API: vollständig, offline nutzbar, mit Rezepten, Stadtboni, Farming- und Tierdaten.
- Marktpreise aus dem Albion Online Data Project (einzige offene Preisquelle). Fehlende Preise werden markiert, nie als 0 gerechnet.
- Werte, die nicht in den Spieldaten stehen (Premium-Ernte ×2), sind als Community-Wert gekennzeichnet und einstellbar.

## Features
1. Crafting & Refining: Itemsuche (DE/EN), Tier, Verzauberung, Rezeptvariante, Menge; Standort mit automatischer RRR (Stadtbonus, Spezialisierung, Fokus, Tagesbonus, Insel, Hideout); Fokuskosten mit FCE; Stationsgebühr; Lagerbestand; Zutaten wahlweise selbst herstellen (rekursiv, z. B. komplette Refining-Kette); Verkauf mit Steuern; Einkaufsliste.
2. Markt: Städtevergleich mit Datenalter, Handelsrouten (Arbitrage inkl. Schwarzmarkt), Profit-Scanner für ganze Kategorien, Preisverlauf.
3. Insel: Farm, Kräutergarten, Weide, Zwinger; Saatgut/Jungtiere, Ernte, Samen- und Nachwuchsrückgabe, Futter, Tierprodukte, Schlachten, Fokusbedarf und Tagesbudget, Gewinn je Tag.
4. Planer: Pläne speichern, gemeinsame Einkaufsliste je Stadt, Fokus gesamt, Backup (Export/Import).

## Akzeptanzkriterien
- `npm test` grün; Rechenkern prüft bekannte Werte (RRR 15,3 / 36,7 / 53,9 %, Fokus halbiert sich je 10.000 FCE, Rezeptmengen und IDs).
- Start ohne `npm install`; App lädt unter http://127.0.0.1:4173.
- Kein JS-Fehler in der Konsole bei 1440 px und 375 px; kein horizontales Scrollen der Seite.
- Fehlende Preise sichtbar markiert; Gewinn dann als „vorläufig“ gekennzeichnet.
- Server bindet nur an 127.0.0.1, hält die API-Limits (180/Min, 300/5 Min) ein.

## Aufgaben je Rolle
- Architekt: Datenpipeline, Datenmodell, Server, Modulstruktur → ARCHITEKTUR.md
- Designer: Tokens, Hell/Dunkel, Layout → DESIGN.md
- Frontend: Ansichten Crafting, Markt, Insel, Planer
- Backend: build-data.mjs, server.js (Proxy, Cache, Ratenlimit, Datenupdate), Tests
- UX-Tester: Review-Runde → FEEDBACK-1-tester.md
