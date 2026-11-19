# FEEDBACK Runde 1 – UX-Tester: „Knoten“

Stand: 2026-11-19 · Rolle: UX-Tester · Getestet: `app/index.html` per `file://`, Chromium (Playwright), 375 / 768 / 1440 px, hell und dunkel, Maus, Tastatur und Touch-Emulation.
Screenshots: `projekte/todo-knoten/screenshots/ux/` (Matrix: `leer-`, `liste-`, `detail-`, `detail-voll-`, `graph-`, `menu-` je `375|768|1440-hell|dunkel.png`, dazu `flow-*`, `mobil-*`, `bug-*`).
Testskripte lagen nur im Scratchpad, nicht im Repo. App-Code wurde nicht geändert.

**Gesamturteil:** Auf dem Desktop ist die App ruhig, schnell und gut verständlich. Die Logik (Kürzel, Blockade, Zyklus-Schutz, Export/Import) hält. Am Handy ist sie in dieser Form aber nicht abnahmefähig: Layout-Fehler, zu kleine Haken und ein Graph, der Felder unter dem Finger auslöst. Dazu kommen zwei Stellen, an denen Eingaben verloren gehen oder Aufgaben ungewollt abgehakt werden. Konsole: **kein einziger JS-Fehler oder -Warnung** bei allen Abläufen.

---

## Was gut ist (bitte so lassen)

- **Desktop-Liste** (`liste-1440-hell.png`, `detail-1440-dunkel.png`): klar, dicht und ruhig. Was blockiert ist, sieht man sofort am gestrichelten Haken und dem Badge „wartet“. Fortschritt x/y und Fälligkeit („morgen“, „überfällig · 18.11.“) sind ohne Nachdenken lesbar.
- **Schnell-Eingabe:** `Steuer machen #büro !3 @morgen` ergibt genau das Erwartete. `@24.12.`, `@31.12.2026`, Umlaute in Tags und `chef@firma.de` mitten im Satz funktionieren alle korrekt (die Mailadresse bleibt im Titel).
- **Blockade:** Klickt man auf den Haken einer blockierten Aufgabe, springt er zurück und es erscheint „Blockiert: wartet noch auf „Belege sammeln““. Das ist genau die richtige Erklärung (`flow-blockiert-abhaken-1440.png`).
- **Zyklus-Schutz:** In der Auswahl wird gar nicht erst angeboten, was einen Zyklus erzeugen würde. Mit Pfad-Labels („Steuer machen › Belege sammeln“) ist eindeutig, welche Aufgabe gemeint ist.
- **Rückgängig** als Toast-Button nach Löschen, Abhaken mit Unteraufgaben, Drag & Drop und Import. Der Toast „Jetzt machbar: …“ nach dem Erledigen einer Voraussetzung ist ein schöner Moment.
- **Export → Import** ergibt bytegleich denselben Stand. Nach dem Neuladen ist alles noch da. Eine kaputte Datei wird mit klarer Meldung abgewiesen.
- **Filter:** Vorfahren werden ausgegraut mitgezeigt (`flow-filter-machbar-1440.png`). So weiß man, wo die Aufgabe hingehört. Die Suche findet auch Notiztext („bürgeramt“) und `#tag`.
- **Leerer Zustand** mit Button „Beispieldaten ansehen“: Neue Nutzer verstehen die App damit in Sekunden.
- **Dunkelmodus** ist sauber umgesetzt und hat keine kontrastarmen Ausreißer in der Liste.
- **Tastatur-Grundgerüst:** N, /, G, ?, Pfeiltasten, Enter und Esc funktionieren. Nach Esc landet der Fokus wieder auf der Zeile, nicht im Nirgendwo.

---

## Muss

### M1 · Handy/Tablet: Filter-Chips werden zu riesigen Blasen, im Graph bleibt kaum Platz
- **Beobachtung:** Unter 860 px blähen sich die Filter-Chips auf, sobald die Liste kurz ist (leerer Zustand, Suche mit wenigen Treffern) und immer in der Graph-Ansicht. Bei 375 px sind sie 70 px hoch, im Graph nimmt die Filterleiste 232 px ein (768 px: etwa 400 px). Für den Graphen bleiben bei 375 × 667 nur 330 px.
- **Warum es stört:** Der erste Eindruck auf dem Handy (leere App) wirkt kaputt. Im Graph sieht man fast nur Pillen statt Aufgaben.
- **Vorschlag:** Die Ursache ist das Grid in `.body` ohne Zeilendefinition: Im 1-Spalten-Layout werden Filterleiste und `main` zu gleich gestreckten Auto-Zeilen. Lösung: `grid-template-rows:auto 1fr` im Media-Query und/oder `align-self:start` an `nav.filters`.
- **Screenshots:** `leer-375-dunkel.png`, `graph-375-hell.png`, `graph-768-dunkel.png`, `mobil-suche-kurz-375.png`

### M2 · 375 px: Eingabezeile und Sortierung ragen über den Rand
- **Beobachtung:** Der Button „Hinzufüg…“ ist abgeschnitten (rechte Kante bei 412 px), ebenso das Sortier-Select (380 px). `#list-wrap` scrollt horizontal (scrollWidth 412 bei 375). Die Kopfzeile „Alle offenen · 14 Aufgaben“ bricht auf vier Zeilen um.
- **Warum es stört:** Das Hauptbedienelement der App, „Aufgabe hinzufügen“, ist auf dem Handy angeschnitten. Das widerspricht dem Abnahmekriterium „kein horizontales Scrollen bei 375 px“. Die Messung über `document.scrollWidth` übersieht das, weil der innere Container scrollt.
- **Vorschlag:** `.add input{min-width:0}`, damit das Eingabefeld schrumpfen darf. Auf schmalen Screens statt „Hinzufügen“ nur ein „+“-Icon (mit aria-label) zeigen. Die Kürzel-Hilfe auf dem Handy auf eine Zeile kürzen oder einklappen. In `.list-head` Label „Sortierung“ ausblenden (sr-only) und `flex-wrap:wrap` setzen.
- **Screenshots:** `liste-375-hell.png`, `leer-375-dunkel.png`, `mobil-suche-kurz-375.png`

### M3 · Tap-Ziele zu klein, vor allem der Erledigt-Haken
- **Beobachtung (375 px gemessen):** Erledigt-Haken 22 × 22, Aufklapp-Pfeil 24 × 24, Chip-„×“ 24 × 24, Zeilen-„+“ 30 × 30, Liste/Graph-Umschalter 34 hoch, Filter-Chips 36 hoch, Sortier-Select 28 hoch, Kopf-Icons 38 × 38.
- **Warum es stört:** Abhaken ist die häufigste Aktion. Mit dem Daumen bei 22 px trifft man oft den Titel und öffnet stattdessen das Detail-Blatt. Das Abnahmekriterium „Tap-Ziele ≥ 40 px“ ist verfehlt.
- **Vorschlag:** Die Trefferfläche vergrößern, ohne die Optik zu ändern: Checkbox in ein Label bzw. einen Wrapper mit 44 × 44 setzen oder unsichtbares Padding über `::before` mit `inset:-11px` nutzen. Dasselbe für `.tw`, `.chip .x` und `.row-add`. Den Umschalter und die Filter-Chips auf min. 40 px Höhe bringen.
- **Screenshots:** `liste-375-hell.png`, `detail-375-dunkel.png`

### M4 · Notizen gehen verloren, wenn man mit Esc schließt
- **Beobachtung:** Man tippt in „Notizen“ (oder Titel/Tags) und drückt Esc. Das Detail schließt, die Eingabe ist weg (Ergebnis `notes: ""`). Gespeichert wird nur beim `change`-Event, also beim Verlassen des Feldes. Das Detail wird aber vorher per `innerHTML` geleert.
- **Warum es stört:** Das ist stiller Datenverlust in der einzigen Langtext-Stelle der App. Esc ist laut Kürzel-Liste der offizielle Weg zum Schließen.
- **Vorschlag:** Vor dem Schließen bzw. Neu-Rendern des Details das aktive Feld übernehmen (z. B. `document.activeElement.blur()` vor `select(null)`). Besser: Notizen und Titel bei `input` mit kurzer Verzögerung speichern. Das deckt auch das Schließen des Tabs ab.
- **Screenshot:** – (Ablauf-Test, siehe Skript-Ausgabe: „notes after Esc: ""“)

### M5 · Graph: Leertaste auf einem Knoten hakt die Aufgabe ab
- **Beobachtung:** Ein Knoten hat den Fokus (Tab) und man drückt Leertaste. Das Detail öffnet sich, und die Aufgabe wird gleichzeitig als **erledigt** markiert, ohne Toast und ohne sichtbaren Rückgängig-Button. Ursache: Der Knoten-Handler wählt aus, danach greift der globale Leertasten-Kürzel „gewählte Aufgabe abhaken“.
- **Warum es stört:** Leertaste ist die normale Taste, um ein fokussiertes Element zu aktivieren. Wer per Tastatur durch den Graph geht, hakt dabei unbemerkt Aufgaben ab.
- **Vorschlag:** Im Knoten-Keydown `e.stopPropagation()` nach `preventDefault()` aufrufen oder im globalen Handler `.node` ausnehmen.
- **Screenshot:** `bug-leertaste-graph-hakt-ab-1440.png` („Wocheneinkauf“ steht nach einem Tastendruck auf „Erledigt“)

### M6 · Handy-Graph: Antippen eines Knotens tippt durch auf das Detail-Blatt
- **Beobachtung:** Man tippt bei 375 px einen Knoten an. Das Detail-Blatt öffnet sich bei `pointerup`, und der nachfolgende Klick landet auf dem Element, das jetzt unter dem Finger liegt. In 5 von 6 Versuchen bekam „Notizen“ den Fokus, auf echten Geräten geht dann die Tastatur auf. Je nach Position kann das auch ein Haken, ein Select oder „Löschen“ sein.
- **Warum es stört:** Man will nur nachsehen und hat plötzlich die Tastatur offen. Im schlimmsten Fall hakt man etwas ab oder öffnet einen Dialog.
- **Vorschlag:** Den Knoten erst im `click`-Event öffnen (Pan-Erkennung über `moved` beibehalten) oder den Folge-Klick nach dem Öffnen einmal abfangen (`preventDefault` beim nächsten `click`).
- **Screenshot:** `mobil-graph-knoten-375.png` (Notizfeld fokussiert, obwohl nur der Knoten angetippt wurde)

---

## Sollte

### S1 · Erster Klick nach dem Bearbeiten eines Feldes wird verschluckt
- **Beobachtung:** Man tippt in Notizen, Titel oder Tags und klickt dann direkt auf eine andere Aufgabe in der Liste oder auf das „×“ zum Schließen: Nichts passiert, man muss ein zweites Mal klicken. Der Blur löst `change` aus, das rendert Liste und Detail neu, und der angeklickte Button existiert beim `click` nicht mehr.
- **Warum es stört:** Es fühlt sich an wie „hängt“ oder „hat nicht reagiert“, gerade beim typischen Ablauf „Notiz schreiben → nächste Aufgabe“.
- **Vorschlag:** Beim Speichern aus Detailfeldern nur die betroffene Zeile aktualisieren statt `#tree` und `#detail` komplett neu aufzubauen. Alternativ das Rendern per `requestAnimationFrame`/`setTimeout(0)` nach dem Klick ausführen. M4 und S1 lassen sich gemeinsam über Speichern bei `input` lösen.
- **Screenshot:** – (Ablauf-Test: „after clicking other task: NOT switched“, „notes after X: detail open? true“)

### S2 · Strg+Z direkt nach dem Anlegen tut nichts
- **Beobachtung:** Man legt eine Aufgabe mit Enter an, der Fokus bleibt (richtigerweise) im Eingabefeld, und man drückt Strg+Z. Nichts passiert, auch kein Toast. App-Rückgängig greift nur außerhalb von Eingabefeldern.
- **Warum es stört:** „Vertippt, sofort zurück“ ist der häufigste Rückgängig-Fall überhaupt. Der Nutzer glaubt, Rückgängig sei kaputt.
- **Vorschlag:** Im leeren Feld `#new` Strg+Z an die App weitergeben. Bei nicht leerem Feld bleibt das native Text-Undo. Optional nach dem Anlegen einen kurzen Toast „angelegt · Rückgängig“ zeigen.

### S3 · Eltern abhaken hakt blockierte Unteraufgaben mit ab
- **Beobachtung:** „Steuer machen“ hat die Unteraufgaben „Belege sammeln“ und „Formular ausfüllen“. Formular wartet auf Belege und lässt sich deshalb nicht direkt abhaken. Hakt man die Elternaufgabe ab, sind trotzdem beide erledigt. Der Toast sagt nur „inklusive 2 Unteraufgaben“.
- **Warum es stört:** Das widerspricht der Regel „blockierte Aufgaben können nicht abgehakt werden“. Besonders heikel ist es, wenn die Voraussetzung **außerhalb** des Teilbaums liegt und dann offen bleibt, während die abhängige Aufgabe als erledigt gilt.
- **Vorschlag:** Entweder abweisen („2 Unteraufgaben sind noch blockiert“) oder im Toast deutlich sagen, dass auch blockierte Aufgaben erledigt wurden. Mindestens bei externen Voraussetzungen sollte die App abweisen.

### S4 · Filter und Suche wirken im Graph nicht, bleiben aber sichtbar
- **Beobachtung:** In der Graph-Ansicht ändern „Blockiert“, „Fällig“ oder die Suche „Küche“ nichts: Es bleiben immer 17 Knoten. Der Filter „Alle offenen“ ist markiert, trotzdem werden erledigte Knoten gezeigt. Nur Tags filtern.
- **Warum es stört:** Man klickt auf „Blockiert“ und denkt, der Klick sei nicht angekommen. Der Zähler „14“ passt nicht zu den 17 Knoten.
- **Vorschlag:** Filter und Suche auch im Graph anwenden, z. B. Nicht-Treffer abblenden, wie die Geister-Zeilen in der Liste. Wenn das nicht gewollt ist, Filter und Suche im Graph ausgrauen oder ausblenden und nur die Tags lassen.
- **Screenshot:** `flow-graph-filter-wirkungslos-1440.png`, `graph-1440-dunkel.png`

### S5 · Handy-Graph ist ohne Zoomen unlesbar
- **Beobachtung:** Beim Einpassen werden die Knoten bei 375 px auf 40 × 11 px verkleinert, die Schrift ist kleiner als 3 px. Die Werkzeugleiste (drei Checkboxen und „Einpassen“) belegt zwei bis drei Zeilen über dem Graph. Die Legende verdeckt unten die Knoten.
- **Warum es stört:** Man sieht Kästchen, aber keine Aufgaben. Ein Knoten in dieser Größe lässt sich nicht gezielt antippen.
- **Vorschlag:** Auf dem Handy eine Mindest-Zoomstufe beim Einpassen setzen (z. B. 0,6) und auf die erste Ebene bzw. den ausgewählten Knoten zentrieren, Rest per Wischen. Die drei Checkboxen hinter einen Button „Optionen“ legen. Die Legende einklappbar machen oder auf dem Handy weglassen.
- **Screenshots:** `graph-375-hell.png`, `graph-768-dunkel.png`

### S6 · Farbe Bernstein bedeutet zwei Dinge: „mittlere Priorität“ und „blockiert“
- **Beobachtung:** Priorität „Mittel“ färbt den Haken bernsteinfarben (durchgezogen), „blockiert“ färbt ihn bernsteinfarben gestrichelt. Bei „Hoch“ + blockiert gewinnt Rot, die Blockade erkennt man dann nur noch an der Strichelung. Priorität „Niedrig“ ist gar nicht sichtbar.
- **Warum es stört:** „Website für Kunden fertigstellen“ sieht auf den ersten Blick aus wie eine blockierte Aufgabe. DESIGN.md sagt selbst „Bernstein = blockiert“.
- **Vorschlag:** Priorität nicht über die Hakenfarbe zeigen, sondern z. B. über einen kleinen Balken oder „!“-Badge links wie im Graph (dort ist es schon ein roter Strich). Den Haken nur für Zustände nutzen (offen, blockiert, erledigt).
- **Screenshot:** `liste-1440-hell.png` (Zeile „Website für Kunden fertigstellen“ vs. „Seiten bauen“)

### S7 · Import ersetzt alles ohne Warnung
- **Beobachtung:** „Daten importieren …“ überschreibt den kompletten aktuellen Stand. Eine Aufgabe, die zwischen Export und Import angelegt wurde, ist danach weg. Hinweis gibt es nur im Nachhinein („17 Aufgaben importiert · Rückgängig“, 6 Sekunden).
- **Warum es stört:** Wer „importieren“ liest, erwartet oft „hinzufügen“. Verpasst man den Toast, sind die Daten weg. Strg+Z rettet es zwar, aber das weiß keiner.
- **Vorschlag:** Vorher `confirm("Import ersetzt alle 23 aktuellen Aufgaben. Fortfahren?")` zeigen oder den Menüpunkt in „Daten importieren (ersetzt alles) …“ umbenennen.

### S8 · Handy-Liste: Titel werden extrem abgeschnitten
- **Beobachtung:** Bei 375 px werden aus Titeln „Umzug organisie…“, „Kisten pac…“, „Umzug…“, „Wohnsitz umm…“. Platz kosten Einrückung, Badges und das immer sichtbare „+“.
- **Warum es stört:** Der Titel ist die eigentliche Information, und „Umzug…“ kann zwei verschiedene Aufgaben meinen.
- **Vorschlag:** Auf dem Handy Titel auf zwei Zeilen umbrechen lassen (`white-space:normal; -webkit-line-clamp:2`). Das Zeilen-„+“ auf dem Handy weglassen, Unteraufgaben gibt es auch im Detail-Blatt. Den Text „wartet“ im Badge ist auf dem Handy schon ausgeblendet, das ist gut.
- **Screenshot:** `liste-375-hell.png`

### S9 · Unteraufgaben einer blockierten Aufgabe gelten als „Jetzt machbar“
- **Beobachtung:** „Kisten packen“ wartet auf „Umzugskartons besorgen“. Die Unteraufgabe „Küche“ erscheint trotzdem unter „Jetzt machbar“, ist im Graph blau („jetzt machbar“) und lässt sich abhaken.
- **Warum es stört:** Der Filter „Jetzt machbar“ soll ehrlich sagen, was man **jetzt** tun kann. Küche packen ohne Kartons geht nicht.
- **Vorschlag:** Eine Aufgabe erbt die Blockade ihrer Vorfahren, zumindest für `isReady` und den Filter „Jetzt machbar“. Abhaken muss dabei nicht hart verboten werden.
- **Screenshot:** `flow-filter-machbar-1440.png`

---

## Kann

| # | Beobachtung | Warum es stört | Vorschlag | Screenshot |
|---|---|---|---|---|
| K1 | `@freitag`, `@montag` werden nicht erkannt und bleiben still im Titel („Arzt anrufen @freitag“). | Wochentage sind die natürlichste Eingabe; der alte Platzhalter hatte genau dieses Beispiel. | Wochentage (nächster Termin) unterstützen oder bei unbekanntem `@…` kurz „Datum nicht erkannt“ melden. | `flow-kuerzel-1440.png` |
| K2 | Eingabe nur aus Kürzeln (`#nurtag`) → nichts passiert, keine Meldung. | Wirkt wie ein toter Button. | Toast „Bitte einen Titel eingeben“. | – |
| K3 | Tags-Feld trennt auch an Leerzeichen: „zu hause, büro“ → `zu`, `hause`, `büro`, obwohl das Label „mit Komma trennen“ sagt. | Widerspruch zwischen Label und Verhalten. | Nur an Komma trennen, Leerzeichen innerhalb eines Tags zu `-` machen, oder Label anpassen. | – |
| K4 | Unteraufgaben-Haken im Detail sind eckig, in der Liste rund (`.field input` überschreibt `border-radius`). | Wirkt uneinheitlich, wie zwei verschiedene Bedienelemente. | `.field .chk{border-radius:50%}`. | `detail-768-hell.png` |
| K5 | Liste zeigt „2/9“ (alle Ebenen), Detail sagt „Offen: 6 Unteraufgabe(n)“ (nur direkte Kinder). | Zwei unterschiedliche Zahlen für dieselbe Aufgabe verwirren. | Einheitlich zählen, und „Unteraufgabe(n)“ durch korrekten Singular/Plural ersetzen. | `mobil-graph-knoten-375.png` |
| K6 | „Beispieldaten laden“ ein zweites Mal verdoppelt alles (17 → 34). | Testdaten mischen sich mit echten Aufgaben. | Bei vorhandenen Daten nachfragen oder Beispieldaten markieren (Tag `#beispiel`), damit man sie leicht wieder loswird. | – |
| K7 | Entf auf einer Zeile löscht sofort auch ganze Projekte („Umzug organisieren“ mit 9 Unteraufgaben), nur mit Toast-Rückgängig. | Ein versehentlicher Tastendruck kann viel löschen. | Ab Unteraufgaben > 0 kurze Bestätigung, sonst so lassen. | – |
| K8 | Tastatur: pro Zeile vier Tab-Stopps (Pfeil, Haken, Titel, +). Bis zur Filterleiste oder zum Detail sind es über 60 Tabs. | Mühsam für reine Tastaturnutzer. | Roving-Tabindex: nur der Titel ist tabbar, Pfeiltasten wechseln die Zeile (gibt es schon), ←/→ klappen auf/zu. | `flow-tastatur-fokus-1440.png` |
| K9 | Im Graph verdeckt das geöffnete Detail die rechten Knoten (z. B. „Umzugstag“ abgeschnitten); die Unteraufgaben-Linien sind im Dunkelmodus kaum sichtbar. | Die gewählte Aufgabe und ihre Nachbarn verschwinden teilweise. | Beim Öffnen des Details den gewählten Knoten in den sichtbaren Bereich schieben; `.edge.hier` im Dunkelmodus heller. | `bug-leertaste-graph-hakt-ab-1440.png`, `graph-1440-dunkel.png` |
| K10 | Theme-Knopf zeigt immer den Mond, egal ob hell oder dunkel, und man kommt nicht zurück zu „wie System“. | Man weiß nicht, was ein Klick bewirkt. | Icon je nach Zustand (Sonne/Mond); optional dritter Zustand „System“. | `liste-1440-dunkel.png` |
| K11 | Der Toast „Beispieldaten geladen · Rückgängig“ liegt 6 s über dem Inhalt, auf dem Handy z. B. über „Löschen“ im Detail-Blatt. | Verdeckt Bedienelemente. | Auf dem Handy etwas höher setzen oder beim Öffnen des Detail-Blatts ausblenden. | `mobil-detail-unten-375.png` |

---

## Geprüfte Abläufe (Kurzprotokoll)

| Aufgabe | Ergebnis |
|---|---|
| Aufgabe mit `#büro !3 @morgen` anlegen | ok |
| `@24.12.`, `@31.12.2026`, Mailadresse im Titel | ok |
| `@freitag` | nicht erkannt (K1) |
| Unteraufgabe über „+“ in Zeile und im Detail | ok, Fokus landet im Feld |
| Abhängigkeit setzen, Zyklus anbieten | ok, Zyklus wird nicht angeboten |
| Blockierte Aufgabe abhaken | korrekt abgewiesen mit Erklärung |
| Eltern mit blockiertem Kind abhaken | Kind wird mit abgehakt (S3) |
| Graph: Knoten anklicken (Maus) | ok |
| Graph: Knoten per Leertaste | hakt ab (M5) |
| Graph: Knoten antippen (Handy) | Durchtippen ins Detail (M6) |
| „In Liste zeigen“ | ok, wechselt auf „Alles“ |
| Filter Alle/Machbar/Blockiert/Fällig/Erledigt/Alles, Tags, Suche | ok in der Liste; im Graph wirkungslos (S4) |
| Drag & Drop: hinein, davor, bei Sortierung „Priorität“ | ok, Sortierung wird mit Hinweis auf „Eigene“ umgestellt |
| Rückgängig per Toast und Strg+Z | ok, außer direkt aus dem Eingabefeld (S2) |
| Export → Import → Neuladen | identisch |
| Kaputte Importdatei | sauber abgewiesen |
| Notizen + Esc | Datenverlust (M4) |
| Konsole (alle Abläufe, alle Breiten) | 0 Fehler, 0 Warnungen |

Nicht getestet: echte Touch-Drag-&-Drop-Geräte (HTML5-DnD ist auf vielen Handys nicht verfügbar; zum Umhängen bleibt „Gehört zu“ im Detail, Umsortieren geht am Handy dann gar nicht) und Screenreader-Ausgabe.
