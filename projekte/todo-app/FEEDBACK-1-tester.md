# FEEDBACK Runde 1 – UX-Test (Erstnutzer-Sicht)

Stand: 2026-11-19 · Rolle: ux-tester · Getestet: http://localhost:4322 (node server.mjs) und `standalone.html` per file://
Chromium (Playwright), 1440×900 und 375×667 (iPhone-12-Emulation, Touch), hell und dunkel, `locale de-DE`.
Testdaten: leer, kleine Liste per Hand, und ein realistischer Umzug mit **40 Aufgaben, 6 Gruppen, 29 Abhängigkeiten in Ketten
bis Tiefe 9** (erzeugt über `logic.js`, per localStorage eingespielt).
Screenshots: `projekte/todo-app/screenshots/review-1/` (Präfix `d-` = Desktop, `m-` = Mobil).

Kurzfazit: Die Liste, die Schnelleingabe und die Rückfragen sind wirklich gut. Die Abhängigkeits-Funktion ist aber nur
halb zu Ende gedacht: Man sieht nicht, **was** eine Aufgabe freischaltet, Löschen hebt Blockaden ohne Hinweis auf, und der
Graph ist ab etwa 25 Knoten nicht mehr zu lesen, auf dem Handy gar nicht. Gerade das Alleinstellungsmerkmal der App
ist im Moment der schwächste Teil.

---

## Muss (3)

### M1 Der Graph ist bei realistischer Größe unlesbar, auf dem Handy nicht bedienbar
- **Ort:** Ansicht Graph, `js/graph.js` `fit()` (Einpassen beim Öffnen und bei Größenänderung).
- **Beobachtung:** Bei 29 Knoten und 9 Ebenen setzt „Einpassen“ den Zoom auf **49 % (Desktop)** und **25 % (375 px)**.
  Die Schrift in den Knoten hat dann etwa 6 px (Desktop) bzw. 3 px (Handy). Auf dem Handy ist ein Knoten **47×13 px** groß
  (gemessen), also ein Drittel der Mindest-Tippfläche von 44 px. Gleichzeitig bleibt auf dem Desktop mehr als die Hälfte der
  Graph-Fläche leer (breit und flach). Titel werden schon bei 100 % nach ca. 15 Zeichen abgeschnitten
  („Umzugsfirma Ang…“, „Mietvertrag unt…“), sodass auch Hineinzoomen nur halb hilft.
- **Warum es stört:** Wer den Graphen öffnet, will auf einen Blick sehen: „Was hält mich auf, was kommt danach?“ Er sieht
  stattdessen ein orangefarbenes Gewirr und muss erst zoomen und schieben. Am Handy gibt man an dieser Stelle auf.
- **Vorschlag:**
  1. `fit()` nie unter ca. 75 % (Desktop) bzw. 80 % (mobil) einpassen; lieber links oben bei den ausführbaren Knoten
     starten und den Rest per Pan erreichbar lassen (Hinweis „Ziehen zum Verschieben“).
  2. Mobil (Hochformat) das Layout **von oben nach unten** statt von links nach rechts legen, dann passt die Breite.
  3. **Fokus-Modus:** Aufgabe antippen/auswählen zeigt nur deren Vorgänger- und Nachfolgerkette, Rest gedimmt
     (Knopf „Nur Kette dieser Aufgabe“). Das macht den Graphen auch bei 200 Knoten nützlich.
  4. Knoten auf zwei Zeilen erlauben (Titel umbrechen statt abschneiden) oder Knoten breiter machen.
- **Screenshots:** `d-40-graph-light.png`, `d-40-graph-dark.png`, `m-40-graph.png`, `m-graph-zoom.png`

### M2 Löschen einer Aufgabe mit Abhängigen hebt deren Blockade stillschweigend auf
- **Ort:** Detail „Aufgabe löschen“, Taste `Entf` in der Liste; `app.js` Löschaktion + Toast.
- **Beobachtung:** „Wohnung finden“ (5 Unter-Todos) gelöscht. Toast: „„Wohnung finden“ gelöscht (inkl. 5 Unter-Todos).“
  Tatsächlich sind dabei **10 Aufgaben ihre Blockade losgeworden** (Blockiert-Zähler 25 → 16). „Kündigung schreiben“ wartete
  auf „Mietvertrag unterschreiben“, steht jetzt ohne Schloss da und taucht in „Als Nächstes“ auf. Gleiches mit `Entf` auf
  „Mietvertrag unterschreiben“: Toast nennt nur den Titel, 7 abhängige Aufgaben werden ohne Wort freigegeben.
- **Warum es stört:** Die Voraussetzung wurde nicht erledigt, sondern entfernt. Die App behauptet danach, man könne kündigen,
  bevor man einen neuen Mietvertrag hat. Das merkt der Nutzer nicht, weil der Toast nach 6 s weg ist.
  (Undo funktioniert einwandfrei, aber man muss wissen, dass man es braucht.)
- **Vorschlag:** Hat die Aufgabe (oder eins ihrer Unter-Todos) Abhängige, **vorher fragen**:
  „„Mietvertrag unterschreiben“ ist Voraussetzung für 7 Aufgaben (Kündigung schreiben, Kaution überweisen, …). Beim Löschen
  werden diese nicht mehr blockiert. [Trotzdem löschen] [Abbrechen]“. Ohne Abhängige bleibt es beim schnellen Löschen + Toast.
  Mindestens aber Toast-Text erweitern: „… · 7 Aufgaben nicht mehr blockiert“.
- **Screenshots:** `d-loeschen-eltern.png` (Kündigung schreiben ohne Schloss, Toast ohne Hinweis), `d-loeschen-entf.png`

### M3 Abhängigkeiten nur von einer Seite sichtbar und anlegbar
- **Ort:** Detail-Panel / Bottom-Sheet, Abschnitt „Blockiert durch“ (`js/ui/detail.js`).
- **Beobachtung:** Das Detail von „Mietvertrag unterschreiben“ zeigt nur, worauf die Aufgabe wartet. Dass **7 Aufgaben auf
  sie warten**, steht nirgends (nur im Graphen, der mobil unlesbar ist, siehe M1). Wer bei Aufgabe A denkt „A muss vor B
  passieren“, kann das von A aus nicht eintragen, sondern muss B suchen, öffnen und dort A wählen.
- **Warum es stört:** Die wichtigste Frage bei Abhängigkeiten ist „Was schalte ich frei, wenn ich das hier erledige?“ –
  genau die beantwortet die App außerhalb des Graphen nicht. Erstnutzer denken außerdem oft in Vorwärtsrichtung.
- **Vorschlag:** Unter „Blockiert durch“ einen zweiten Abschnitt **„Voraussetzung für“** mit denselben Chips (klickbar →
  öffnet die Aufgabe) und derselben Combobox inkl. Zyklus-Ausgrauen. In der Liste beim Erledigen einer Voraussetzung im
  Toast melden: „2 Aufgaben jetzt machbar: Kaution überweisen, Kündigung schreiben“.
- **Screenshots:** `d-detail-ohne-abhaengige.png`, `d-40-graph-detail.png`

---

## Sollte (11)

### S1 `Tab` in der Liste ändert beim bloßen Durchtabben die Struktur
- **Ort:** Liste, `js/ui/list.js` / `keys.js` (Tab = Einrücken).
- **Beobachtung:** Schnelleingabe → Tab → Tab landet in der Liste; zwei Pfeiltasten runter und noch einmal Tab:
  **„Bücher packen“ wurde Unter-Todo von „Keller ausmisten“**. Es gibt nur eine Ansage für Screenreader, keinen sichtbaren
  Hinweis. Beim ersten Eintritt in die Liste weiß niemand, dass Tab hier nicht „weiter“ bedeutet.
- **Warum es stört:** Tab ist für jeden Tastaturnutzer die Navigationstaste. Daten ändern sich, ohne dass man es wollte.
- **Vorschlag:** Einrücken zusätzlich auf `Alt+→`/`Alt+←` (oder `Strg+]`/`Strg+[`) legen und Tab nur einrücken lassen,
  wenn die Zeile bereits ausgewählt bzw. per Pfeiltaste angesteuert wurde (also nicht direkt nach dem Hineintabben).
  Bei jeder Strukturänderung per Tastatur Toast „Eingerückt unter „Keller ausmisten“ · Rückgängig“.
- **Screenshot:** `d-tab-rueckt-ein.png`

### S2 Lange Kanten laufen durch fremde Knoten (falsche Aussage im Graphen)
- **Ort:** `logic.layoutGraph` / `graph.js` Kantenpfad.
- **Beobachtung:** Die Kante „Helfer fragen → Möbel abbauen“ (über 5 Ebenen) läuft als gerade Linie **mitten durch „Küche
  packen“** und sieht aus, als ginge sie von „Küche packen“ aus. Ähnlich die Kante zu „Einweihungsparty planen“.
- **Vorschlag:** Für Kanten über mehrere Ebenen Platzhalterpunkte je Ebene einfügen (klassisches Sugiyama-Dummy-Knoten-
  Verfahren) und die Kante durch die Lücken führen; zusätzlich Kanten hinter Knoten zeichnen und Knoten mit deckender Füllung.
- **Screenshot:** `d-40-graph-fokus.png`

### S3 Graph ignoriert Suche und Filter
- **Ort:** Graph-Ansicht + Suchfeld / Tag-Filter.
- **Beobachtung:** Suche „Möbel“ im Graphen: weiter alle 29 Knoten, nichts hervorgehoben. Ein Klick auf einen Filter in der
  Seitenleiste springt zurück in die Liste.
- **Vorschlag:** Suche im Graphen hebt Treffer hervor und dimmt den Rest (plus „Zum Treffer springen“). Option „Erledigte
  ausblenden“ und Tag-Filter auch im Graphen.
- **Screenshot:** `d-graph-suche.png`

### S4 Blockiert-Kennzeichen sagt nicht, worauf gewartet wird
- **Ort:** Aufgabenzeile, Chip „blockiert“ (mobil nur Schloss-Icon).
- **Beobachtung:** 25 Zeilen mit „blockiert“, aber keine sagt, worauf. Nur ein `title`-Tooltip „Blockiert durch 1 Aufgabe“
  (auf Touch nicht erreichbar). Mobil steht nur ein kleines orangefarbenes Schloss ohne Text.
- **Vorschlag:** Chip-Text „wartet auf: Mietvertrag…“ (bei mehreren „wartet auf 2“), Klick auf den Chip öffnet bzw.
  springt zur blockierenden Aufgabe. Mobil mindestens „wartet“ statt nur Icon.
- **Screenshots:** `d-40-liste-light.png`, `m-40-liste.png`

### S5 „Alle erledigen“ beim Elternteil erledigt auch blockierte Unter-Todos ohne Hinweis
- **Ort:** Rückfrage „Unter-Todos mit erledigen?“.
- **Beobachtung:** „Packen“ abgehakt → „Alle erledigen“: auch „Bücher packen“, „Küche packen“, „Möbel abbauen“ wurden
  erledigt, obwohl sie noch blockiert waren. Beim einzelnen Abhaken fragt die App dagegen „Trotzdem erledigen?“ (gut!).
- **Vorschlag:** Im Dialog ergänzen: „Davon sind 4 noch blockiert.“ und eine Option „Nur nicht blockierte erledigen“.
- **Screenshot:** `d-eltern-abhaken.png`

### S6 Gültiger Import ersetzt alle Daten ohne Rückfrage
- **Ort:** Seitenleiste „Import (JSON)“.
- **Beobachtung:** Import einer gültigen, aber leeren Datei: 40 Aufgaben sofort weg, nur Toast „Import übernommen
  (0 Aufgaben). Rückgängig“. Wer versehentlich die falsche (alte) Exportdatei wählt, merkt es evtl. erst nach 6 s.
- **Vorschlag:** Vorher Dialog: „Import ersetzt deine 40 Aufgaben durch 0 Aufgaben aus „datei.json“ (Export vom …).
  [Ersetzen] [Abbrechen]“ – idealerweise mit Hinweis „Vorher exportieren“.
- **Screenshot:** `d-import-leer-ersetzt.png`

### S7 „Als Nächstes“ + Suche ohne Treffer zeigt falsche Meldung
- **Ort:** Ansicht „Als Nächstes“, Leerzustand `#next-empty`.
- **Beobachtung:** Suche „xyzz“ in „Als Nächstes“ → „Nichts ist gerade machbar. Alles erledigt oder blockiert.“ – falsch,
  es gibt 8 machbare Aufgaben, nur die Suche passt nicht. In der Liste kommt korrekt „Keine Treffer für „xyzz““.
- **Vorschlag:** Gleiche Suchtreffer-Leermeldung mit „Suche löschen“ wie in der Liste verwenden.
- **Screenshot:** `m-suche-leer.png`

### S8 Unter-Todos und Abhängigkeiten werden beim Start nicht erklärt
- **Ort:** Leerzustand der Liste, Platzhalter der Schnelleingabe.
- **Beobachtung:** Der Leerzustand erklärt nur `!hoch` und `morgen`. Dass es Unter-Todos (`>` oder im Detail) und
  Abhängigkeiten (im Detail „Blockiert durch“) gibt, erfährt man nur, wenn man zufällig eine Aufgabe anklickt oder `?`
  drückt. Dass man eine Aufgabe **anklicken** muss, um Details zu sehen, steht auch nirgends. Mobil wird der Platzhalter
  abgeschnitten („Neue Aufgabe … (!hoch #tag mor“).
- **Vorschlag:** Leerzustand mit drei kurzen Zeilen: „Aufgabe tippen + Enter · Antippen für Details, Unter-Todos und
  „Blockiert durch“ · `>` am Anfang = Unter-Todo der gewählten Aufgabe“. Optional Knopf „Beispiel-Projekt laden“ (macht
  auch den Graphen sofort erlebbar). Mobil kürzerer Platzhalter: „Neue Aufgabe …“.
- **Screenshots:** `d-leer-light.png`, `m-leer-light.png`

### S9 Abhängigkeits-Suche sortiert exakte Treffer nicht nach vorn
- **Ort:** Combobox „Blockiert durch“.
- **Beobachtung:** Eingabe „Flug“ → erster Treffer „Flug buchen intern (Urlaub planen)“, dann erst „Flug buchen“. Mit Enter
  oder Tippen auf den ersten Treffer wählt man leicht die falsche Aufgabe (ist mir im Test genau so passiert).
- **Vorschlag:** Sortierung: exakter Titel > Titel beginnt mit Suchwort > enthält; bei Gleichstand oberste Ebene zuerst.
- **Screenshots:** `d-dep-suche.png`, `d-dep-gesetzt.png`

### S10 Inline-Bearbeiten wendet die Schnelleingabe-Syntax nicht an
- **Ort:** Doppelklick/F2 auf einen Titel.
- **Beobachtung:** Titel per Doppelklick zu „Zahnarzt Termin #privat !hoch“ geändert → Titel enthält den Text wörtlich,
  Priorität bleibt 0. In der Schnelleingabe wird dieselbe Eingabe ausgewertet.
- **Vorschlag:** Entweder beim Inline-Bearbeiten ebenfalls parsen (mit Vorschau-Chips), oder bewusst nicht und dann
  `!`/`#`-Tokens nicht still in den Titel übernehmen. Konsistenz ist hier wichtiger als die Richtung.

### S11 Datumsfeld im Detail zeigt US-Format
- **Ort:** Detail „Fälligkeit“ (`<input type="date">`).
- **Beobachtung:** Trotz `lang="de"` und `locale de-DE` erscheint „mm/dd/yyyy“ bzw. „11/20/2026“, während die Chips
  „fällig morgen (20.11.2026)“ deutsch anzeigen. BUILD.md nennt das als Browser-Eigenheit; für einen Nutzer mit
  englischem System-Chrome bleibt es trotzdem verwirrend (12.11. oder 11.12.?).
- **Vorschlag:** Auf einem echten Gerät mit deutschem System prüfen. Falls es dort bleibt: neben dem Feld die
  relative Angabe anzeigen („Fr, 20. Nov. – morgen“), dann ist die Bedeutung eindeutig.
- **Screenshots:** `d-detail-light.png`, `m-sheet-light.png`

---

## Kann (7)

- **K1 Tab-Reihenfolge:** Vom Seitenanfang braucht man Sprunglink + 9 Seitenleisten-Knöpfe bis zur Schnelleingabe.
  Zweiten Sprunglink „Zur Schnelleingabe“ ergänzen (oder Schnelleingabe vor die Seitenleiste in die DOM-Reihenfolge).
- **K2 Toast überdeckt den Footer-Link** „Tastenkürzel (?)“ auf dem Desktop (`d-nur-tokens.png`, `d-dep-open.png`).
  Footer-Abstand nach unten vergrößern oder Toast höher setzen.
- **K3 „Daten bleiben lokal im Browser“** steht doppelt (Seitenleiste unten und Footer). Einmal reicht; im Footer lassen.
- **K4 Zähler „Graph 29“** in der Seitenleiste: unklar, was gezählt wird. Weglassen oder Tooltip „29 Aufgaben mit
  Abhängigkeiten“.
- **K5 Leerer Titel im Detail** wird beim Verlassen still auf den alten Titel zurückgesetzt (`d-titel-leer.png`). Das ist
  richtig, aber eine kurze Inline-Meldung „Titel darf nicht leer sein – alter Titel wiederhergestellt“ wäre klarer.
  (Leere Schnelleingabe und nur Kürzel werden korrekt abgefangen: „Titel fehlt – nur Kürzel erkannt.“)
- **K6 Import-Fehlermeldungen** sind technisch („notes muss Text sein“, „order muss Zahl sein“). Für eine selbst
  exportierte Datei reicht die erste Zeile + „Ist das eine Exportdatei dieser App?“ und die Details aufklappbar.
- **K7 Mobile Graph-Ansicht:** Die Schnelleingabe unten nimmt dort Platz weg, obwohl man im Graphen selten Aufgaben
  anlegt. Im Graphen ausblenden oder einklappen und die Graph-Fläche bis unten ziehen.

---

## Was gut ist (bitte nicht kaputtverbessern)

- **Schnelleingabe:** Live-Chips unter dem Feld („fällig morgen (20.11.2026)“, „Priorität hoch“, „#tag“) sind vorbildlich;
  man sieht vor Enter, was erkannt wird. Die Vorschau „Unter-Todo von „Projekt A““ bei `>` beantwortet genau die Frage, die
  man in dem Moment hat. Feld bleibt nach Enter fokussiert – Serien-Erfassung geht flüssig.
- **Unter-Todos im Detail:** Feld „Unter-Todo hinzufügen“ ist direkt sichtbar, Fokus bleibt drin, Fortschritt „0/2“ mit
  Balken erscheint sofort am Elternteil. Unter-Todos im Detail sind klickbar und öffnen die Aufgabe.
- **Zyklus-Schutz:** Kandidaten werden vorab ausgegraut mit „würde Kreis erzeugen“ – besser als jede Fehlermeldung.
- **Rückfragen:** „Trotzdem erledigen? … noch blockiert durch: „Kartons besorgen““ und „Unter-Todos mit erledigen?“ mit drei
  klaren Knöpfen sind genau richtig dosiert.
- **Undo:** Löschen per Detail oder `Entf` stellt per Toast **und** per `Strg+Z` den exakt gleichen Zustand wieder her
  (geprüft per JSON-Vergleich), `Strg+Shift+Z` wiederholt, Toast „Rückgängig gemacht · Wiederholen“.
- **„Als Nächstes“:** Die graue Pfadzeile („Umzug organisieren“) über der Aufgabe gibt Kontext ohne Baum. Sortierung
  heute > Priorität passt. Das ist die nützlichste Ansicht der App.
- **Kaputter Import:** Ungültiges JSON, falsche Struktur und Binärmüll werden abgelehnt mit „deine Daten sind unverändert“;
  Daten blieben tatsächlich unverändert.
- **Mobil:** kein horizontales Scrollen (auch mit sehr langem Titel und 3 Tags: „+2“), Schnelleingabe unten am Daumen,
  Bottom-Sheet startet bei 60 %, lässt sich am Griff auf 100 % ziehen und nach unten wegwischen, Menü als Off-Canvas sauber.
- **Hell/Dunkel:** beide Themes ruhig und kontrastreich, Statusfarben im Dunkeln gut unterscheidbar, Theme-Schalter vorhanden.
- **`standalone.html` per file://:** Anlegen, Unter-Todo, Abhängigkeit, Graph, Reload (Persistenz) und Export funktionieren,
  keine Konsolenfehler.
- Keine Konsolenfehler/-warnungen in allen Durchläufen.

## Nicht geprüft / Grenzen
- Kein echter Screenreader, kein echtes iPhone (virtuelle Tastatur, Safe-Area, Safari-Datumsfeld nur emuliert).
- Wischen auf dem Sheet-Inhalt (statt am Griff) nicht zuverlässig automatisierbar, nur Griff getestet.
- 768 px nicht im Auftrag dieser Runde.
