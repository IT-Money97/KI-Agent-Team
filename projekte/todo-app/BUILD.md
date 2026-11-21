# BUILD: Todo-App (Frontend, Stand Runde 2)

Stand: 2026-11-19 · Rolle: frontend · Grundlage: PLAN.md, ARCHITEKTUR.md, DESIGN.md, FEEDBACK-1.md

## Runde 2 (Feedback Runde 1)
Alle Muss- (1–3) und Sollte-Punkte (4–16) aus `FEEDBACK-1.md` sind umgesetzt, dazu die Kann-Punkte K1–K7 (Tester) und
K-1–K-5 (PL). Status je Punkt: Abschnitt „Erledigt“ in `FEEDBACK-1.md`. Firefox (PL M-1) bleibt Restrisiko.
- Logik (mit Tests): `layoutGraph` mit Dummy-Knoten und Richtung `TB`, `dependencyChain`, `externalDependents`,
  `searchByTitle`.
- Service Worker: `CACHE = 'todo-app-v3'`. `standalone.html` neu gebündelt (167,2 KB, 11 Module).
- Größenbudget laut Orchestrator auf 200 KB angehoben (PLAN Kriterium 12 angepasst, Test misst `ASSETS` aus `sw.js`).

## Prüfungen (Runde 2)
| Prüfung | Ergebnis |
|---|---|
| `node --test app/tests/` | **53/53 grün** (45 Logik, 3 Store, 1 Server, 4 Static) |
| Vom Browser geladene Dateien (`ASSETS` + `sw.js`) | **171.333 Byte (167,3 KB)** < 204.800 (200 KB); null externe Requests |
| Playwright E2E (`app/tests/e2e.playwright.cjs`), 1440 + 375 px, hell + dunkel | **95/95 OK**, keine Konsolenfehler/-warnungen |
| axe-core (WCAG 2.1 A/AA + Best Practice), 40 Aufgaben: Liste, Detail mit beiden Comboboxen offen, Menü, Graph, Graph mit Optionen, Als Nächstes; 1440/375 × hell/dunkel | **0 Verstöße** (26 Scans) |
| Lighthouse 12 (leerer Zustand, http://127.0.0.1:4322) mobil | Performance 98 · Accessibility 100 · Best Practices 100 · SEO 100 |
| Lighthouse Desktop | 100 · 100 · 100 · 100 |
| Graph mit 40 Aufgaben (30 verknüpft, 10 Ebenen), Desktop + mobil, hell + dunkel | Zoom 75 % / 80 %, Knoten 150×39 / 120×45 px, Titel zweizeilig, Start bei ausführbaren Knoten, **0 Kanten durch fremde Knoten**, Kette „Möbel aufbauen“: 19 hervorgehoben, 11 gedimmt |
| Horizontales Scrollen 375 px (Liste, Sheet, Menü, Graph) | keins |
| `standalone.html` per file:// / Offline nach erstem Laden | lädt / lädt aus SW-Cache |
| 2.000 Aufgaben (inkl. Playwright-Roundtrip) | Filterwechsel 103–132 ms, Abhaken 93–107 ms; in der Seite gemessen (ohne Roundtrip, Runde 1) 21–37 ms; Graph mit 988 Knoten 228–251 ms |

Neue E2E-Abläufe: Leerzustand + Beispiel laden, Alle Daten löschen + Undo, Durchtabben ändert nichts / Tab nach
Pfeiltaste rückt ein (Toast mit Rückgängig) / Alt+→ ←, Inline-Bearbeiten mit Syntax, „wartet auf: …“ + Sprung,
„Voraussetzung für“ setzen inkl. Zyklus ausgegraut und exaktem Treffer zuerst, deutsches Datum, Löschen mit Abhängigen
(Rückfrage, Abbrechen, „2 Aufgaben nicht mehr blockiert“, Undo), Toast „jetzt machbar“, „Nur nicht blockierte
erledigen“, Als Nächstes + Suche ohne Treffer, Graph: Nur Kette / Suche dimmt / Erledigte ausblenden / Hinweis auf
nicht gezeigte Aufgaben, Import mit Rückfrage.

Screenshots (`projekte/todo-app/screenshots/`, 40 Aufgaben): `desktop-liste.png`, `desktop-graph.png` (Nur Kette),
`desktop-dunkel.png` (Detail mit „Voraussetzung für“), `mobil-liste.png`, `mobil-graph.png` (von oben nach unten).

## Umsetzung (kurz)
- `js/app.js`: View-State, alle Aktionen über `logic.js` (keine duplizierte Logik), Toast mit Rückgängig, Rückfragen
  (`<dialog>`) für „Unter-Todos mit erledigen?“ und „Trotzdem erledigen?“ (blockiert), Export/Import, Theme.
- `js/ui/list.js`: `role="tree"` mit roving tabindex, `aria-level/expanded/selected`, beschreibendes `aria-label` je Zeile;
  erledigte stehen innerhalb ihres Elternteils unten (Anzeige-Index, Verschieben rechnet auf die echte Reihenfolge um);
  Drag & Drop über Pointer Events (Maus + Touch) am Griff, nur innerhalb der Ebene, mit Einfügemarke; Zeilen-Diffing.
- `js/ui/detail.js`: Panel einmal aufgebaut, gezielte Aktualisierung (kein Fokus-/Klickverlust beim Autospeichern);
  Abhängigkeits-Combobox (`role=combobox/listbox`, `aria-activedescendant`, Mehrfachauswahl, Pfad je Treffer,
  zyklische Kandidaten `aria-disabled` + Hinweis, Fehlermeldung `role="alert"`); Bottom-Sheet ziehbar (60 % / 100 % / schließen).
- `js/graph.js`: SVG aus `layoutGraph`, Status ausführbar/offen/blockiert/erledigt mit Farbe + Symbol + Strichart,
  Pfeile (aktive Blockade orange), Zoom 25–200 % (Rad, Pinch, Knöpfe), Pan, Einpassen (automatisch bei Größenänderung,
  bis der Nutzer selbst zoomt), Knoten per Tab/Enter, Fokus hebt Kanten hervor und scrollt den Knoten ins Bild, Legende.
- `js/keys.js`: Kürzel laut DESIGN.md; aus, solange ein Feld fokussiert ist (außer Esc; Strg+Z nur in leeren Feldern).

## Annahmen und Abweichungen
1. **Datum ohne `@` (DESIGN.md Schnelleingabe):** `parseQuickInput` erweitert (neu: `parseDateWord`, 2 Tests).
   Ohne `@` werden nur **klein geschriebene** Wörter erkannt (`heute`, `morgen`, `übermorgen`, ausgeschriebene Wochentage)
   sowie `12.12.`, `12.12.2026`, `2026-12-12`. **Wochentag-Kürzel `mo..so` nur mit `@`** (z. B. `@fr`), weil „so“ ein häufiges
   Wort ist. „Morgen“ groß (Nomen) bleibt Titel. Wochentag = nächstes Vorkommen (1–7 Tage, gleicher Tag = nächste Woche);
   `TT.MM.` in der Vergangenheit = nächstes Jahr. Erstes Datum gilt, `@` hat Vorrang.
2. **`>` für Unter-Todo** bezieht sich auf die ausgewählte Aufgabe, sonst auf die zuletzt fokussierte Zeile; die Vorschau
   zeigt das Ziel an. Ohne beides: Fehlermeldung.
3. **Enter** öffnet das Detail; ist es für diese Zeile schon offen, startet Inline-Bearbeitung (zusätzlich `F2`, Doppelklick).
   Fokus bleibt beim Öffnen auf der Zeile (schnelles Weiternavigieren).
4. **Tab in der Liste** (Runde 2): rückt nur ein, wenn die Zeile per Pfeiltaste/Klick gewählt wurde; beim Hineintabben
   und nach `Esc` verlässt Tab die Liste normal. Zusätzlich immer `Alt+→/←`. Ein-/Ausrücken zeigt einen Toast mit
   Rückgängig; Verschieben (`Alt+↑/↓`) nur per Live-Ansage (sichtbar durch die Bewegung der Zeile).
5. Theme-Schalter zyklisch System → Hell → Dunkel; bei „System“ wird `data-theme` entfernt.
6. Import ersetzt alle Daten (ein Undo-Schritt, Toast mit Rückgängig); ungültige Datei: Dialog mit Fehlern, Daten unverändert.
7. „Alle Daten löschen …“ (Runde 2) in der Seitenleiste unten, mit Rückfrage und Rückgängig.
8. Icon/Manifest/theme-color auf die neue Akzentfarbe `#2954c8` umgestellt (vorher Platzhalter-Grün).
9. Datumsfeld nutzt das native `<input type="date">`; das Anzeigeformat hängt von der Browsersprache ab
   (Screenshots aus Headless-Chromium mit englischem Format). Seit Runde 2 steht darunter immer das Datum in deutschem
   Format mit relativer Angabe (z. B. „Freitag, 20. November 2026 · morgen“).
10. Inline-Bearbeiten wertet die Schnelleingabe-Syntax aus, zeigt aber keine Live-Vorschau-Chips (nur die Schnelleingabe).
11. Graph mobil: Titel werden nach zwei Zeilen mit „…“ gekürzt (voller Titel im Detail und in der Ansage).
12. Graph zeigt nur Aufgaben mit Abhängigkeiten; die Infozeile nennt, wie viele nicht gezeigt werden.

## Bekannte Lücken / Risiken
- Größe: 167,3 KB von 200 KB (Puffer ~32 KB).
- Lighthouse nur im leeren Zustand gemessen (Lighthouse kann keinen localStorage vorbelegen); befüllte Zustände per axe geprüft.
- Firefox nicht automatisiert getestet (nur Chromium). `field-sizing: content` (Titel/Notizen-Autosize) wirkt nur in
  Chromium; andere Browser zeigen feste Höhe mit Scrollen.
- Kein Screenreader-Durchlauf mit echtem NVDA/VoiceOver (nur axe + Semantik-Prüfung) – Aufgabe ux-tester.
- Drag & Drop sortiert nur innerhalb einer Ebene (laut PLAN); Ebenenwechsel per Tab/Shift+Tab.
- Toast-Region zeigt jeweils nur die letzte Meldung.

## Befehle
```
cd projekte/todo-app/app
node --test tests/                     # Unit-Tests (53)
node tools/bundle.mjs                  # standalone.html neu erzeugen
node server.mjs                        # http://localhost:4322
NODE_PATH=$(npm root -g) node tests/e2e.playwright.cjs   # E2E (Server muss laufen, Playwright global)
```
