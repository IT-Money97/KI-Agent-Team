# DESIGN: Todo-App

Stand: 2026-11-19 · Tokens: `app/css/tokens.css` (einzige Quelle für Farben, Abstände, Radien, Schrift, Schatten, Übergänge, z-index).
Jede Entscheidung hat einen Begründungssatz (**B:**), damit der Tester sie hinterfragen kann.

## 1. Gestaltungsprinzip: sehr simpel, ruhig, schnell
- **Wirkung in 3 Worten:** klar, leise, flink. **B:** Die App ist ein tägliches Werkzeug; sie soll wie eine Einkaufsliste wirken, nicht wie ein Projektmanagement-Tool.
- **Moodboard:** viel Weißraum, graue Flächen statt Rahmen, eine einzige blaue Akzentfarbe, Status nur über kleine Farbsignale plus Symbol/Text, keine Illustrationen, keine Bilder. **B:** Ruhe entsteht durch wenige gleichzeitig konkurrierende Signale.
- **Referenzen:** Things 3 (Ruhe, Schnelleingabe), Todoist (Syntax-Eingabe), Linear (Tastaturbedienung, Kürzel-Hilfe). **B:** Bewährte Muster senken die Lernkurve für einen technisch versierten Einzelnutzer.
- **Progressive Tiefe:** Zeile zeigt nur Titel + max. 3 Metadaten; alles andere im Detail-Panel. **B:** Tiefe nur bei Bedarf (PLAN Ziel).
- **Bildkonzept:** keine Fotos, keine Platzhalter; nur Inline-SVG-Icons (eigene, ca. 12 Stück, 16/20 px, `stroke: currentColor`). **B:** Null externe Requests und < 150 KB Gesamtgröße.

## 2. Farben und Kontrast (AA)
Werte und Kontrastverhältnisse stehen als Kommentar in `tokens.css`; alle Text-Tokens ≥ 4,5:1, Bedienelement-Ränder ≥ 3:1, beide Themes.

| Rolle | Token | Hell | Dunkel | B: |
|---|---|---|---|---|
| Text | `--c-text` | #1c1c1a (17,2:1) | #ececea (15,2:1) | Kein reines Schwarz/Weiß, wirkt weicher. |
| Nebentext | `--c-text-muted` | #5c5c57 (6,7:1) | #a3a39e (7,0:1) | Metadaten treten zurück, bleiben aber AA. |
| Akzent / ausführbar | `--c-accent` | #2954c8 (6,6:1) | #8ab0ff (8,4:1) | Eine Akzentfarbe = Primäraktion und "jetzt machbar". |
| Erledigt | `--c-done` | #2a7a46 | #6fcf8e | Grün ist universell "fertig". |
| Blockiert | `--c-blocked` | #a64b00 | #f0a35c | Orange = "wartet", bewusst nicht Rot, um es von "überfällig" zu trennen. |
| Überfällig / Prio hoch / Löschen | `--c-danger` | #b3261e | #ff8a80 | Rot nur für echten Handlungsdruck. |
| Prio mittel / heute fällig | `--c-warn` | #8a5a00 | #e3c26a | Abgestuft zwischen neutral und Rot. |

Status wird **nie nur über Farbe** vermittelt (immer Symbol und/oder Text). **B:** WCAG 1.4.1, Farbfehlsichtigkeit.
Theme: `data-theme` auf `<html>` setzen (`light`/`dark`), fehlt es, gilt die Systemeinstellung. **B:** Abgeleitete Tokens (z. B. `--focus-ring`) werden auf `:root` berechnet.

## 3. Typografie, Abstände, Radien
- **Schrift:** Systemstack `--font-sans`, Mono `--font-mono` nur für Kürzel (`<kbd>`) und Syntax-Hinweise. **B:** Keine Webfonts = 0 Requests, sofortiges Rendern, wirkt systemnah.
- **Skala:** 12 / 14 / **16** / 18 / 22 px. Titel und Eingaben immer 16 px. **B:** 16 px verhindert iOS-Zoom beim Fokus und ist auf Mobil gut lesbar.
- **Gewichte:** 400 Text, 500 Aufgabentitel offen, 600 Überschriften. **B:** Drei Stufen reichen für Hierarchie ohne Unruhe.
- **Abstände:** 4er-Raster `--sp-1..7` (4–48 px); Zeilenhöhe min. 44 px (`--row-min-h`). **B:** Einheitlicher Rhythmus und Touch-Ziele nach WCAG 2.5.5.
- **Einrückung:** 24 px je Ebene (Desktop), 16 px mobil, ab Ebene 4 mobil nicht weiter eingerückt, stattdessen Ebenen-Zahl als Text ("Ebene 5"). **B:** Beliebige Tiefe darf bei 375 px kein horizontales Scrollen erzeugen.
- **Radien:** 4 (Checkbox, Badge) / 6 (Eingaben, Buttons) / 10 (Panel, Dialog, Knoten) / 16 (Sheet) / Pille (Chips). **B:** Kleine Radien wirken sachlich; Pillen machen Chips sofort als Chips erkennbar.

## 4. Layout

### Desktop (≥ 1152 px): drei Spalten
```
┌──────────┬───────────────────────────────┬──────────────┐
│ Sidebar  │ Topbar: Ansichtstitel · Suche │ Detail-Panel │
│ 240 px   │ Schnelleingabe (sticky)       │ 384 px       │
│ Ansichten│ Hauptliste (max. 768 px)      │ (nur wenn    │
│ Filter   │                               │  Aufgabe     │
│ Tags     │                               │  gewählt)    │
│ ──────── │                               │              │
│ Theme,   │ Footer: "Daten bleiben lokal  │              │
│ Export   │ im Browser"                   │              │
└──────────┴───────────────────────────────┴──────────────┘
```
- **Seitenleiste** (`--c-surface`): Ansichten (Liste, Als Nächstes mit Zähler, Graph), Filter (alle, offen, erledigt, heute, überfällig, blockiert), Tags (Liste mit Zähler), unten Theme-Schalter, Export/Import, "?" Hilfe. **B:** Navigation links ist bei Todo-Apps erlernt und hält die Hauptliste frei.
- **Detail-Panel** rechts als feste Spalte, schließt mit `Esc`. **B:** Liste bleibt sichtbar, Kontext geht beim Bearbeiten nicht verloren.
- **768–1151 px:** Seitenleiste bleibt, Detail-Panel legt sich als Overlay rechts über die Liste (Schatten `--shadow-lg`). **B:** Drei Spalten wären zu schmal.

### Mobil (375 px, mobile first)
- Topbar: Menü-Knopf (öffnet Seitenleiste als Off-Canvas links), Ansichtstitel, Suche-Symbol.
- Hauptliste volle Breite, Innenabstand 16 px.
- Schnelleingabe **unten fixiert** über der Tastatur (sticky bottom, Safe-Area beachtet). **B:** Daumenreichweite; primäre Aktion "Aufgabe hinzufügen" liegt dort, wo der Daumen ist.
- Detail als **Bottom-Sheet** (Start 60 % Höhe, ziehbar auf 100 %, Griff oben, Schließen-Knopf, `Esc`/Wischen schließt). **B:** Mobiles Standardmuster, Liste bleibt im Hintergrund erahnbar.
- Kein horizontales Scrollen außer innerhalb der Graph-Fläche. **B:** Akzeptanzkriterium 6.

**Primärer Call-to-Action:** die Schnelleingabe ("Neue Aufgabe … Enter"), immer sichtbar, Taste `n`. **B:** Erfassen ist die häufigste Aktion; jede Hürde davor kostet Gedanken.

## 5. Ansichten
| Ansicht | Inhalt | Leerer Zustand | B: |
|---|---|---|---|
| **Liste** | Baum aller Aufgaben gemäß Filter/Tag/Suche, erledigte unten im Elternknoten gedimmt | "Noch keine Aufgaben. Tippe oben/unten los, z. B. `Steuer machen !hoch morgen`." | Erklärt die Syntax genau in dem Moment, in dem sie hilft. |
| **Als Nächstes** | flache Liste offener, nicht blockierter Blatt-Aufgaben, sortiert Fälligkeit > Priorität; graue Pfadzeile darüber ("Umzug › Küche") | "Nichts ist gerade machbar. Alles erledigt oder blockiert." + Link "Blockierte anzeigen" | Pfad statt Baum, damit der Kontext bleibt, ohne Tiefe zu zeigen. |
| **Graph** | SVG-Abhängigkeitsgraph (Abschnitt 7) | "Keine Abhängigkeiten. Lege im Detail-Panel 'Blockiert durch' fest." | Graph ohne Kanten wäre bedeutungslos. |

Suchtreffer ohne Ergebnis: "Keine Treffer für „…“" + Knopf "Suche löschen". Leere Zustände: zentriert, `--c-text-muted`, ein dezentes Linien-Icon, max. 2 Sätze. **B:** Ruhe auch im Leerlauf.

## 6. Komponenten

**Aufgabenzeile** (Höhe ≥ 44 px, `role="treeitem"` in `role="tree"`, `aria-level`, `aria-expanded`)
Reihenfolge: [Prio-Markierung] [Aufklapp-Pfeil] [Checkbox] Titel · [Fortschritt] [Fälligkeit] [Blockiert] [Tags] (Tags mobil max. 1 + "+2").
- **Checkbox:** 20 px sichtbar, 44 px Trefferfläche, Rand `--c-border-strong`, erledigt: Fläche `--c-done` mit Haken. Erledigte Titel: `--c-text-done` + durchgestrichen. **B:** Große Trefferfläche ohne visuell große Box.
- **Einrückung:** `padding-inline-start: calc(var(--indent) * level)`, feine vertikale Führungslinie `--c-border` je Ebene. **B:** Führungslinien zeigen Zugehörigkeit bei tiefen Bäumen.
- **Aufklapp-Pfeil:** Chevron 16 px, dreht 90° (`--dur-base`), nur bei Elternteilen; sonst gleich breiter Leerraum. **B:** Titel bleiben bündig.
- **Fortschrittsbalken** (nur Elternteile): Text "3/5" (`--fs-xs`, muted) + Balken 40×4 px, Spur `--c-surface-2`, Füllung `--c-done`; `role="progressbar"` mit `aria-valuenow`. **B:** Zahl ist exakt, Balken auf einen Blick.
- **Prioritäts-Markierung:** 3 px Streifen am linken Zeilenrand (hoch `--c-prio-high`, mittel `--c-prio-medium`, niedrig keiner) plus `!`/`!!` vor dem Titel und `aria-label` "Priorität hoch". **B:** Streifen ist leise, Ausrufezeichen trägt die Bedeutung ohne Farbe.
- **Fälligkeits-Chip:** Pille, `--fs-xs`, Kalender-Icon + relativer Text ("heute", "morgen", "Fr", "12. Dez."). Normal muted; heute `--c-warn` auf `--c-warn-soft`; überfällig `--c-danger` auf `--c-danger-soft` + Text "überfällig". **B:** Relative Daten liest man schneller; Dringlichkeit eskaliert farblich und textlich.
- **Blockiert-Badge:** Schloss-Icon + "blockiert" (mobil nur Icon mit `aria-label` "Blockiert durch 2 Aufgaben"), `--c-blocked` auf `--c-blocked-soft`; Checkbox der Zeile bleibt bedienbar, Abhaken fragt "Trotzdem erledigen?". **B:** Nutzer behält Kontrolle, wird aber gewarnt.
- **Tag-Chips:** Pille, `#tag`, `--c-surface-2` Hintergrund, `--c-text-muted`; klickbar = Tag-Filter. Keine Farben pro Tag. **B:** Farbige Tags würden mit Statusfarben konkurrieren.
- **Zustände:** Hover `--c-surface-2`; ausgewählt `--c-accent-soft` + 2 px Akzentlinie links; Drag-Vorschau: Zeile angehoben (`--shadow-drag`, `--z-drag`, Deckkraft 0,95), Einfügemarke 2 px `--c-accent` mit Ebenen-Einzug. **B:** Einfügemarke zeigt Ziel und Ebene vor dem Loslassen.

**Schnelleingabe:** Einzeiliges Feld, Platzhalter "Neue Aufgabe … (!hoch #tag morgen)". Erkannte Tokens werden live als Chips unter dem Feld angezeigt (Vorschau), `aria-live="polite"`.
Syntax: `!hoch|!mittel|!niedrig` (auch `!1/!2/!3`), `#tag`, `heute|morgen|übermorgen|mo..so|12.12.|2026-12-12`, `>` am Anfang = Unter-Todo der ausgewählten Aufgabe. Enter legt an, Feld bleibt fokussiert. **B:** Mehrere Aufgaben hintereinander ohne Maus.

**Detail-Panel / Sheet:** Titel (großes Inline-Feld, `--fs-lg`), Checkbox, Priorität (Segment-Schalter 4 Optionen), Fälligkeit (`<input type="date">` + Schnellknöpfe Heute/Morgen/Keine), Tags (Chip-Eingabe), Blockiert durch, Unter-Todos (Mini-Liste + "Unter-Todo hinzufügen"), Notizen (Textarea, autosize), unten "Löschen" (Textknopf `--c-danger`) und Metadaten (erstellt/erledigt). Speichert automatisch. **B:** Kein Speichern-Knopf = keine verlorenen Änderungen.

**Abhängigkeits-Auswahl:** Combobox mit Suchfeld (`role="combobox"`, Liste `role="listbox"`, Mehrfachauswahl), Treffer mit Pfad; eigene Aufgabe ausgeschlossen; Kandidaten, die einen Zyklus erzeugen würden, ausgegraut mit Hinweis "würde Kreis erzeugen". Gewählte als entfernbare Chips mit Status-Icon. Zyklusfehler zusätzlich als Inline-Meldung `--c-danger`, `role="alert"`. **B:** Fehler verhindern ist besser als ablehnen; die Meldung deckt Kriterium 3 ab.

**Toast mit Rückgängig:** unten mittig (mobil über der Schnelleingabe), `--c-text` als Hintergrund, `--c-bg` als Text (invertiert), Knopf "Rückgängig" (Akzent in Invers-Variante, unterstrichen), 6 s sichtbar, pausiert bei Hover/Fokus, `role="status"`, `--z-toast`. Für: Löschen, Abhaken mit Unter-Todos, Import. **B:** Undo statt Bestätigungsdialog hält den Fluss schnell.

**Dialoge** (Hilfe, Import-Fehler, "Unter-Todos mit erledigen?"): natives `<dialog>`, `--r-lg`, `--shadow-lg`, Overlay `--c-overlay`, Fokusfalle, Esc schließt. **B:** Native Semantik spart Code und ist zugänglich.

## 7. Graph-Darstellung
- **Layout:** Schichten von links (Voraussetzungen) nach rechts (abhängige Aufgaben); Ebenenabstand 80 px, Knotenabstand 16 px. **B:** Leserichtung = Arbeitsreihenfolge.
- **Knoten:** Rechteck 180×44 px, `--r-lg`, Füllung `--c-node-fill`, Rand 2 px in Statusfarbe, Titel einzeilig gekürzt (voller Titel als `<title>`), links Status-Icon:

| Status | Rand/Icon | Icon | Zusatz |
|---|---|---|---|
| ausführbar (offen, nicht blockiert) | `--c-node-actionable` | leerer Kreis | Rand 2 px durchgezogen |
| offen (Elternteil/sonst) | `--c-node-open` | leerer Kreis | |
| blockiert | `--c-node-blocked` | Schloss | Rand gestrichelt (6/4) |
| erledigt | `--c-node-done` | Haken | Titel durchgestrichen, Deckkraft 0,7 (Text bleibt AA) |

  **B:** Strichart + Icon unterscheiden Status ohne Farbe.
- **Kanten:** von Voraussetzung zu blockierter Aufgabe, kubische Kurve, 1,5 px, Pfeilspitze (`<marker>`) am Ziel. Erledigte Voraussetzung: `--c-graph-edge`; offene Voraussetzung: `--c-graph-edge-active`. **B:** Aktive Blockaden fallen sofort auf.
- **Bedienung:** Mausrad/Pinch = Zoom (0,25–2), Ziehen = Pan, Knöpfe "+ / − / Einpassen" oben rechts; Knoten sind `<g tabindex="0" role="button">` mit `aria-label` "Titel, Status", Tab in Layout-Reihenfolge, Enter öffnet Detail, Fokus = Fokusring um Knoten und Hervorhebung seiner Kanten. Legende unten links. **B:** Kriterium 8 (Graph per Tab).

## 8. Tastenkürzel (Hilfe-Dialog mit `?`)
| Taste | Aktion |
|---|---|
| `n` | Schnelleingabe fokussieren |
| `/` | Suche |
| `↑` / `↓` (oder `j`/`k`) | Auswahl bewegen |
| `→` / `←` | Aufklappen / Zuklappen |
| `Enter` | Detail öffnen bzw. Titel bearbeiten |
| `Leertaste` | Abhaken |
| `Tab` / `Shift+Tab` | Einrücken / Ausrücken (in der Liste) |
| `Alt+↑` / `Alt+↓` | Verschieben innerhalb der Ebene |
| `Entf` | Löschen (mit Undo) |
| `Strg+Z` / `Strg+Shift+Z` | Rückgängig / Wiederholen |
| `1` `2` `3` / `g` | Ansicht Liste / Als Nächstes / Graph; `g` = Graph |
| `Esc` | Panel/Dialog schließen, Suche leeren |
| `?` | Diese Hilfe |

Kürzel sind deaktiviert, solange ein Eingabefeld fokussiert ist (außer Esc, Strg+Z). Darstellung: `<kbd>` mit `--font-mono`, `--c-surface-2`, `--r-sm`. **B:** Einbuchstaben-Kürzel dürfen nie das Tippen stören.
Hinweis zu Tab: Innerhalb der Liste rückt Tab ein; um die Liste zu verlassen, `Esc` und dann Tab bzw. Sprunglinks. **B:** Verhindert Tastaturfalle (WCAG 2.1.2), wird in der Hilfe genannt.

## 9. Fokus und Barrierefreiheit
- **Fokus:** `:focus-visible { outline: none; box-shadow: var(--focus-ring); }` (2 px Abstand in Hintergrundfarbe + 2 px `--c-focus`), Zeilen: Fokusring innen (`inset`) um die ganze Zeile. Nie `outline` ohne Ersatz entfernen. **B:** Doppelring ist auf allen Flächen sichtbar (≥ 3:1).
- **Kontrast:** alle Text-Tokens ≥ 4,5:1, UI-Ränder ≥ 3:1, in beiden Themes (Werte in `tokens.css`). Tester prüft zusätzlich Chips auf Soft-Hintergründen.
- **Semantik:** Landmarks (`nav` Seitenleiste, `main` Liste, `aside` Detail), Sprunglink "Zur Aufgabenliste", Liste als `tree`, Live-Region für Toasts und Zählerwechsel, alle Icon-Knöpfe mit `aria-label`.
- **Bewegung:** `prefers-reduced-motion` setzt alle Dauern auf 0 (in Tokens). **B:** Schutz vor Bewegungsempfindlichkeit, ohne Sonderlogik im JS.
- **Zoom:** Layout bis 200 % Textzoom ohne Abschneiden; nur `rem` für Schrift. **B:** WCAG 1.4.4.

## 10. Bewegung
Übergänge nur für Hover/Fokus (`--dur-fast`), Aufklappen/Panel (`--dur-base`), Sheet (`--dur-slow`), Easing `--ease-out`. Keine Animation beim Rendern der Liste. **B:** "Schnell" heißt auch: nichts wartet auf eine Animation.
