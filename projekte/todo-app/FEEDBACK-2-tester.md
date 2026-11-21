# FEEDBACK Runde 2 – UX-Test (Nachprüfung)

Stand: 2026-11-19 · Rolle: ux-tester · Getestet: http://127.0.0.1:4322 (`node server.mjs`), Chromium/Playwright,
1440×900 und 375×667 (iPhone-12-Emulation, Touch), hell und dunkel, `locale de-DE`.
Testdaten: 40 Aufgaben, 6 Gruppen, 28 Abhängigkeiten, längste Kette 11 Knoten (Budget → … → Kaution zurückfordern),
per localStorage eingespielt. Screenshots: `projekte/todo-app/screenshots/review-2/`.

**Ergebnis: 0 Muss / 0 Sollte / 5 Kann.** Alle 3 Muss- und 11 Sollte-Punkte aus Runde 1 sind tatsächlich behoben.
Keine Konsolenfehler/-warnungen, kein horizontales Scrollen (Liste, Graph, Kette, Bottom-Sheet, Leerzustand; 1440 und 375 px).

## Nachprüfung Runde 1

| Punkt | Ergebnis | Beleg |
|---|---|---|
| M1 Graph lesbar | behoben. Desktop 75 % (Knotenschrift ca. 10,5 px), mobil 80 %, von oben nach unten, Knoten 122×46 px, zweizeilige Titel, Start bei den ausführbaren Knoten. „Nur Kette von „…““ dimmt den Rest und zentriert die Aufgabe, auch mobil. | `d-40-graph-light.png`, `m-40-graph-light.png`, `d-graph-kette.png`, `m-graph-kette-dark.png` |
| M2 Löschen mit Abhängigen | behoben. Rückfrage nennt alle 5 Abhängigen, Toast „· 5 Aufgaben nicht mehr blockiert“, `Strg+Z` stellt alles wieder her (Blockiert 22 → 16 → 22). | `d-loeschen-rueckfrage.png` |
| M3 „Voraussetzung für“ | behoben. Abschnitt im Detail vorhanden; Erledigen meldet „1 Aufgabe jetzt machbar: „Hotel suchen““. | – |
| S1 Tab | behoben. Hineintabben + Tab verlässt die Liste ohne Änderung; nach Klick/Pfeil rückt Tab ein, mit Toast „Eingerückt unter …“ + Rückgängig. | – |
| S2 Kanten durch Knoten | behoben. Gemessen: 0 Kanten laufen durch fremde Knoten. | `d-40-graph-light.png` |
| S3 Graph + Suche/Filter | behoben. „Möbel“: 2 Treffer hervorgehoben, 25 gedimmt, Graph bleibt offen; Tag-Filter bleibt im Graphen; „Erledigte ausblenden“ schaltet. | – |
| S4 Blockiert-Chip | behoben. Desktop „wartet auf: …“ bzw. „wartet auf 2“, mobil „wartet“; Antippen springt zur Voraussetzung. | `m-sheet-dark.png` |
| S5 Alle erledigen | behoben. Dialog nennt „Davon sind 4 noch blockiert …“ und bietet „Nur nicht blockierte erledigen“. | – |
| S6 Import | behoben. „Der Import ersetzt deine 40 Aufgaben durch 0 Aufgaben aus „empty.json““, Abbrechen lässt die Daten unverändert. | – |
| S7 Als Nächstes + Suche | behoben. Meldung „Keine Treffer für „xyzz“.“ + „Suche löschen“. | – |
| S8 Leerzustand | behoben. 3 Schritte, „Beispiel-Projekt laden“, mobil Platzhalter „Neue Aufgabe …“. | – |
| S9 Exakte Treffer zuerst | behoben. „Flug“ → „Flug buchen“ vor „Flug buchen intern“. | – |
| S10 Inline-Syntax | behoben. „Belege sammeln #steuer !hoch“ → Titel ohne Tokens, Priorität 3, Tag ergänzt. | – |
| S11 Datum | entschärft wie vereinbart. Das native Feld zeigt in Chromium weiter „11/20/2026“, darunter steht aber eindeutig „Fr., 20. Nov. 2026 · morgen“. | `m-sheet-dark.png` |

## Muss
Keine.

## Sollte
Keine.

## Kann

- **K1 Zoom-Leiste verdeckt mobil Knoten, sobald der Graph verschoben ist.** Ort: mobile Graph-Ansicht, `.graph-tools`
  (Overlay oben rechts). Beim Start ist sie frei, nach „Nur Kette“ (Zentrierung) liegt sie über „Inserate durchsehen“.
  Vorschlag: Leiste kompakter (nur Symbole, ohne Prozentanzeige) oder unten rechts. Screenshot: `m-graph-kette-dark.png`.
- **K2 Suche/Tag ohne Treffer im Graphen: alles grau, keine klare Meldung.** Ort: Graph + Suche bzw. Tag „#büro“ (Aufgaben
  ohne Abhängigkeiten). Alle 27 Knoten gedimmt, nur die kleine Infozeile sagt „0 Treffer hervorgehoben“. Vorschlag: bei
  0 Treffern nicht dimmen und im Graphen sichtbar melden „Keine Treffer im Graphen – n Treffer in der Liste“.
- **K3 Mobil zeigt „Nur Kette“ nicht, von welcher Aufgabe.** Ort: `.graph-opt[data-opt=chain]`, mobil wird der Zusatz
  „von „…““ ausgeblendet. Nach Schließen des Sheets weiß man nicht mehr, wessen Kette gezeigt wird. Vorschlag: mobil
  den gewählten Knoten deutlich markieren (ist er) und den Titel in die Infozeile unter dem Graphen schreiben.
- **K4 Nach dem Leeren der Suche bleibt der Graph beim letzten Treffer stehen.** Ort: Graph, Suchfeld leeren. Die
  ausführbaren Startknoten sind dann außer Sicht. Vorschlag: beim Leeren der Suche zur Startansicht zurückkehren.
- **K5 Knotenschrift am Desktop bei 75 % ca. 10,5 px.** Ort: Graph-Startansicht 1440 px. Lesbar, für ältere Nutzer aber
  knapp; Platz wäre da (Graphfläche nur teilweise genutzt). Vorschlag: am Desktop mit 85–90 % starten, wenn die
  ausführbaren Knoten und ihre erste Folgeebene trotzdem hineinpassen.

## Was gut ist (nicht kaputtverbessern)
- Der Graph ist jetzt tatsächlich nutzbar, mobil von oben nach unten mit großen Knoten. Die Kette einer Aufgabe ist auf einen Blick zu sehen.
- Rückfragen (Löschen, Alle erledigen, Import) nennen konkrete Titel und Zahlen und bieten den sinnvollen Mittelweg an.
- Die Toasts „jetzt machbar: …“ und „· n Aufgaben nicht mehr blockiert“ beantworten genau die Frage, die man in dem Moment hat.
- Die Blockiert-Chips sagen, worauf gewartet wird, und führen per Antippen direkt dorthin.
- Undo funktioniert weiter überall zuverlässig.

## Nicht geprüft
Firefox/Safari, echtes iPhone, Screenreader, 768 px (nicht im Auftrag).
