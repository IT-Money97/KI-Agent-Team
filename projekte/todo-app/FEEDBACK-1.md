# FEEDBACK Runde 1 – Zusammenfassung

Quellen: `FEEDBACK-1-tester.md` (UX-Tester, 3 Muss / 11 Sollte / 7 Kann) und `FEEDBACK-1-pl.md` (Projektleiter, 11 von 12 Kriterien erfüllt).

## Entscheidungen
- **Firefox (PL M-1):** In der Bauumgebung ist nur Chromium vorhanden, Firefox wird nicht nachinstalliert. Bleibt als Restrisiko im Ergebnisbericht; Turan klickt die Kernabläufe einmal in Firefox durch.
- **Größenbudget (Kriterium 12):** Es zählt nur, was der Browser lädt. Wegen der Muss-Punkte (Graph, Abhängige) wird das Budget von 150 KB auf **200 KB** angehoben; Logik-Kommentare dürfen bleiben.

## Muss (an frontend)
1. **Graph lesbar machen** (Tester M1): Einpassen nicht unter ca. 75 % (mobil 80 %), Start bei den ausführbaren Knoten; mobil Layout von oben nach unten; Fokus-Modus „Nur Kette dieser Aufgabe“ (Vorgänger + Nachfolger, Rest gedimmt); Titel zweizeilig statt nach 15 Zeichen abschneiden.
2. **Löschen mit Abhängigen** (Tester M2): Hat die Aufgabe oder ein Unter-Todo Abhängige, vorher nachfragen und die betroffenen Aufgaben nennen; Toast nennt Anzahl freigegebener Aufgaben.
3. **„Voraussetzung für“ im Detail** (Tester M3): zweiter Abschnitt mit Chips und Auswahl inkl. Zyklus-Ausgrauen; beim Erledigen Toast „jetzt machbar: …“.

## Sollte (an frontend)
4. Tab-Verhalten in der Liste (Tester S1, PL S-1): Tab rückt nur ein, wenn die Zeile per Pfeiltaste/Klick aktiv gewählt wurde; Strukturänderungen per Tastatur mit sichtbarem Toast inkl. Rückgängig.
5. Lange Kanten nicht durch fremde Knoten (Tester S2): Dummy-Knoten je Ebene, Kanten hinter deckenden Knoten.
6. Graph reagiert auf Suche (Treffer hervorheben, Rest dimmen) und Option „Erledigte ausblenden“ (Tester S3).
7. Blockiert-Chip nennt, worauf gewartet wird, und springt per Klick dorthin; mobil Text statt nur Schloss (Tester S4).
8. „Alle erledigen“ nennt blockierte Unter-Todos und bietet „Nur nicht blockierte erledigen“ (Tester S5).
9. Import fragt vorher („ersetzt X Aufgaben durch Y“) (Tester S6).
10. „Als Nächstes“ + Suche ohne Treffer: richtige Leermeldung (Tester S7).
11. Leerzustand erklärt Unter-Todos, Details und „Blockiert durch“; Knopf „Beispiel laden“; mobil kurzer Platzhalter (Tester S8).
12. Abhängigkeits-Suche: exakte Treffer zuerst (Tester S9).
13. Inline-Bearbeiten wertet dieselbe Syntax aus wie die Schnelleingabe (Tester S10).
14. Datumsanzeige im Detail in deutschem Format (Tester S11).
15. Knopf „Alle Daten löschen“ mit Rückfrage und Undo (PL S-3).
16. `tests/static.test.mjs` misst die Größe aus der `ASSETS`-Liste in `sw.js`, Budget 200 KB; BUILD.md/ARCHITEKTUR.md nachziehen (PL S-2).

## Kann
Kann-Punkte aus beiden Dateien nur, wenn sie wenig Aufwand sind.

## Erledigt (frontend, 2026-11-19)
Prüfung: 53/53 Unit-Tests, E2E 95/95 (1440/375 px, hell/dunkel, keine Konsolenfehler), axe 0 Verstöße (26 Scans mit
40 Aufgaben), 375 px ohne horizontales Scrollen, 167,3 KB von 200 KB, `CACHE = 'todo-app-v3'`, Bundle neu. Details: `BUILD.md`.

### Muss
1. **Erledigt.** Graph: Mindestzoom 75 % / mobil 80 %, Start bei den ausführbaren Knoten, mobil von oben nach unten
   (`layoutGraph` `direction: 'TB'`), Umschalter „Nur Kette von „…““ (Vorgänger + Nachfolger, Rest gedimmt, gewählte
   Aufgabe zentriert), Titel zweizeilig. Mit 40 Aufgaben / 10 Ebenen am Desktop und mobil geprüft.
2. **Erledigt.** Löschen fragt nach, wenn die Aufgabe oder ein Unter-Todo Abhängige außerhalb des Teilbaums hat, und nennt
   sie (`externalDependents`); Toast „… · n Aufgaben nicht mehr blockiert“ mit Rückgängig.
3. **Erledigt.** Detail-Abschnitt „Voraussetzung für“ mit Chips und Combobox inkl. Zyklus-Ausgrauen; beim Erledigen Toast
   „… jetzt machbar: …“ mit Rückgängig.

### Sollte
4. **Erledigt.** Tab rückt nur nach Pfeiltaste/Klick ein; beim Hineintabben und nach `Esc` verlässt Tab die Liste.
   Zusätzlich `Alt+→/←`. Ein-/Ausrücken mit Toast + Rückgängig. Abweichung: Verschieben (`Alt+↑/↓`) ohne Toast, nur Ansage.
5. **Erledigt.** Dummy-Knoten je Zwischenebene in `layoutGraph`, Kanten laufen durch Lücken (gemessen: 0 Kanten durch
   fremde Knoten bei 40 Aufgaben); Knoten deckend über den Kanten.
6. **Erledigt.** Suche hebt Treffer im Graph hervor und dimmt den Rest (Graph bleibt geöffnet), Tag-Filter wirkt,
   Umschalter „Erledigte ausblenden“.
7. **Erledigt.** Chip „wartet auf: Titel“ bzw. „wartet auf n“, Klick springt zur ersten Voraussetzung (klappt Vorfahren
   auf); mobil Text „wartet“ statt nur Schloss; Zeilen-Ansage nennt die Voraussetzungen.
8. **Erledigt.** Rückfrage nennt blockierte Unter-Todos und bietet „Nur nicht blockierte erledigen“.
9. **Erledigt.** Import fragt vorher „Daten ersetzen? … ersetzt deine X Aufgaben durch Y“ (Rückgängig bleibt).
10. **Erledigt.** „Als Nächstes“ + Suche ohne Treffer zeigt „Keine Treffer …“.
11. **Erledigt.** Leerzustand erklärt in 3 Schritten Unter-Todos, Details und „Blockiert durch“, Knopf „Beispiel-Projekt
    laden“; mobil Platzhalter „Neue Aufgabe …“.
12. **Erledigt.** `searchByTitle` in logic.js (exakt < Anfang < Wortanfang < enthält), in beiden Comboboxen genutzt.
13. **Erledigt.** Inline-Bearbeiten wertet `!prio #tag Datum` aus. Abweichung: keine Live-Vorschau-Chips beim Inline-Bearbeiten.
14. **Erledigt.** Unter dem Datumsfeld steht das Datum in deutschem Format mit relativer Angabe (natives Feld bleibt,
    sein Format bestimmt die Browsersprache).
15. **Erledigt.** „Alle Daten löschen …“ in der Seitenleiste unten, mit Rückfrage und Rückgängig.
16. **Erledigt.** `tests/static.test.mjs` misst `ASSETS` + `sw.js` gegen 200 KB; PLAN Kriterium 12, BUILD.md und
    ARCHITEKTUR.md (neue Logik-API, 53 Tests) nachgezogen.

### Kann
- **Tester K1 erledigt:** zweiter Sprunglink „Zur Schnelleingabe“.
- **Tester K2 erledigt:** Toast am Desktop höher gesetzt, Footer-Link bleibt frei.
- **Tester K3 erledigt:** Hinweis „Daten bleiben lokal im Browser“ nur noch im Footer.
- **Tester K4 erledigt:** Graph-Zähler mit Erklärung „Aufgaben mit Abhängigkeiten“; Graph-Infozeile nennt nicht gezeigte Aufgaben.
- **Tester K5 erledigt:** Meldung „Titel darf nicht leer sein – alter Titel wiederhergestellt.“ (Detail und Inline).
- **Tester K6 erledigt:** Import-Fehler zeigen die erste Meldung plus „Ist das eine Exportdatei dieser App?“, Details aufklappbar.
- **Tester K7 erledigt:** Schnelleingabe in der mobilen Graph-Ansicht ausgeblendet, Graph-Fläche größer; Zoom-Leiste als
  Overlay, erster Knoten bleibt frei.
- **PL K-1 erledigt** (wie Tester K4). **PL K-2 erledigt:** `Esc` in der Schnelleingabe setzt den Fokus auf die Liste.
  **PL K-3 erledigt:** `server.mjs` öffnet `http://127.0.0.1:<port>/`. **PL K-4 erledigt:** `.vercelignore` enthält
  `standalone.html`. **PL K-5 erledigt:** PLAN Abschnitt 3 nennt Port 4322.

### Nicht erledigt
- **PL M-1 Firefox: abgelehnt (Entscheidung oben).** In der Bauumgebung nur Chromium; bleibt Restrisiko, manueller
  Durchlauf durch Turan. Hinweis: `field-sizing: content` (Autosize Titel/Notizen) wirkt in Firefox nicht, dort feste Höhe.
