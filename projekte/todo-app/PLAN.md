# PLAN: Todo-App (lokal, mit Unter-Todos und Abhängigkeitsgraph)

Slug: `todo-app` · Stand: 2026-11-19 · Auftraggeber: Turan (persönliches Tool, kein Kundenprojekt)

## 1. Ziel
Eine schlanke, schnell bedienbare Todo-App, die komplett lokal im Browser läuft: Aufgaben mit beliebig tiefen
Unter-Todos, Abhängigkeiten ("blockiert durch") inkl. Graph-Ansicht und einer "Als Nächstes"-Liste, die nur
sofort ausführbare Aufgaben zeigt. Bedienung so simpel wie eine Einkaufsliste, Tiefe nur bei Bedarf.

## 2. Zielgruppe und Annahmen
- Zielgruppe: Turan selbst (Einzelnutzer, Desktop + Smartphone, technisch versiert, mag Tastenkürzel).
- "Lokal" = kein Server, kein Konto, keine Cloud. Daten in `localStorage` (IndexedDB nicht nötig), offline nutzbar.
- Kein Kundenprojekt: kein Impressum/Datenschutz nötig; stattdessen Hinweis im Footer "Daten bleiben lokal im Browser".
- Sprache der Oberfläche: Deutsch. Keine Synchronisation zwischen Geräten (Export/Import JSON als Ersatz).
- Datenmenge: bis ca. 2.000 Aufgaben flüssig (Rendering < 100 ms).
- Stil: ruhig, minimalistisch, systemnahe Schrift (keine Webfonts), Akzentfarbe sparsam.

## 3. Tech-Stack (bewusste Abweichung vom Standard)
- Vanilla HTML/CSS/JavaScript mit ES-Modulen, **kein Build-Schritt, null Abhängigkeiten**.
  Begründung: maximale Einfachheit und Langlebigkeit, kein `npm install`, startet überall; Astro/Next brächten
  für eine reine Client-App ohne Inhaltsseiten nur Komplexität.
- Ablage: `projekte/todo-app/app/` (statisch deploybar).
- Start lokal:
  1. `start.bat` (bzw. `start.sh`) startet `server.mjs` (Node, nur Bordmittel `node:http`/`node:fs`) auf
     http://localhost:4322 und öffnet den Browser.
  2. Fallback Doppelklick: `app/index.html` muss auch über `file://` funktionieren. Da ES-Module über `file://`
     blockiert werden, wird zusätzlich ein gebündeltes `app/standalone.html` (Inline-Skript, per kleinem
     Node-Skript `tools/bundle.mjs` erzeugt, Ergebnis eingecheckt) bereitgestellt.
- Offline: Service Worker + `manifest.webmanifest` (nur bei http(s)-Betrieb, installierbar als PWA).
- Tests: `node --test` für das reine Logik-Modul (ohne DOM).
- Deployment: statische Demo auf Vercel (Root `projekte/todo-app/app`), keine Live-Schaltung für Dritte.

## 4. Features (MVP)
| Bereich | Umfang |
|---|---|
| Aufgaben | anlegen (Enter), inline bearbeiten, löschen (mit Undo), abhaken |
| Unter-Todos | beliebig tief, ein-/ausklappbar, Fortschritt (x/y, Balken) am Elternteil; Elternteil abhaken fragt nach, ob Unter-Todos mit erledigt werden |
| Abhängigkeiten | "blockiert durch" (Mehrfachauswahl per Suchfeld); Zyklus-Erkennung verhindert Speichern mit Meldung; blockierte Aufgaben mit Schloss-Symbol + Text gekennzeichnet |
| Graph-Ansicht | SVG, automatisches Schichtlayout (topologische Ebenen, Kreuzungsreduktion per Median-Heuristik), Zoom/Pan, Knoten klickbar (öffnet Detail), Farben nach Status (offen/blockiert/erledigt) |
| Attribute | Priorität (hoch/mittel/niedrig/keine), Fälligkeitsdatum, Tags/Projekte (`#tag`-Schnelleingabe), Notizen (Mehrzeilig) |
| Suche & Filter | Volltextsuche; Filter: alle, offen, erledigt, heute, überfällig, blockiert; Tag-Filter |
| "Als Nächstes" | offene, nicht blockierte Blatt-Aufgaben, sortiert nach Fälligkeit > Priorität |
| Sortierung | Drag & Drop (Maus + Touch) innerhalb einer Ebene, Tastatur-Alternative (Alt+Pfeil hoch/runter) |
| Tastenkürzel | `n` neu, `/` Suche, `Tab`/`Shift+Tab` einrücken/ausrücken, `Leertaste` abhaken, `Strg+Z` Undo, `g` Graph, `?` Hilfe |
| Undo | mindestens 50 Schritte (Snapshot-Stack), auch Redo (`Strg+Shift+Z`) |
| Daten | Autospeichern in `localStorage` mit Schema-Version; Export/Import JSON mit Validierung |
| Darstellung | Hell/Dunkel (System + manueller Schalter), mobil ab 375 px, barrierefrei (WCAG 2.1 AA) |

Nicht im Umfang: Konten, Sync, Erinnerungen/Push, wiederkehrende Aufgaben (offene Punkte für später).

## 5. Datenmodell (Vorschlag, Architekt finalisiert)
```
Task { id, title, done, parentId|null, order, priority(0-3), due|null (YYYY-MM-DD),
       tags[], notes, blockedBy[id], createdAt, updatedAt, doneAt|null }
State { version: 1, tasks: {id: Task}, settings: { theme, collapsed[] } }
```
Regeln: Löschen entfernt Unter-Todos und Referenzen in `blockedBy`; Abhängigkeit auf eigene Vorfahren/Nachfahren
ist erlaubt, Zyklen nicht; "blockiert" = mindestens eine `blockedBy`-Aufgabe nicht erledigt.

## 6. Akzeptanzkriterien (messbar)
1. `node --test` im Projektordner: alle Tests grün, mind. 25 Tests für Logik-Modul (CRUD, Baum, Fortschritt,
   Zyklus-Erkennung, blockiert-Status, "Als Nächstes", Filter, Undo, Import-Validierung, Migration).
2. Keine Konsolenfehler/-warnungen beim Laden und bei allen Kernaktionen (Chrome, Firefox).
3. Zyklus: A blockiert durch B, dann B blockiert durch A wird abgelehnt mit sichtbarer Meldung; Daten unverändert.
4. Persistenz: Nach Anlegen von Aufgaben inkl. Unter-Todos und Abhängigkeiten und Reload sind alle Daten identisch.
5. Export -> Löschen aller Daten -> Import ergibt identischen Zustand; ungültige JSON-Datei wird mit Meldung abgelehnt.
6. Bei 375 px Breite kein horizontales Scrollen (Listen- und Detailansicht; Graph darf intern pannen).
7. Lighthouse (mobil, über lokalen Server bzw. Vercel): Accessibility ≥ 95, Performance ≥ 90, Best Practices ≥ 90, SEO ≥ 90.
8. Komplett per Tastatur bedienbar (inkl. Graph-Knoten per Tab), sichtbarer Fokus, Kontrast ≥ 4,5:1 in beiden Themes.
9. Start: `start.bat` öffnet App ohne `npm install`; `standalone.html` funktioniert per Doppelklick (file://).
10. Offline: nach erstem Laden über http funktioniert die App bei getrennter Verbindung.
11. Performance: 2.000 generierte Aufgaben -> Filterwechsel und Abhaken < 100 ms; Graph mit 200 Knoten < 500 ms Layout.
12. Was der Browser lädt (die `ASSETS`-Liste in `sw.js` plus `sw.js` selbst: `index.html`, `css/*`, `js/**`,
    `manifest.webmanifest`, `icon.svg`) ist zusammen < 200 KB (204.800 Byte) unkomprimiert; null externe Requests. Nicht mitgezählt: `server.mjs`, `start.bat`/`start.sh`,
    `tools/`, `tests/`, `standalone.html`, `vercel.json`, `.vercelignore`.
    (Präzisiert 2026-11-19 in Review-Runde 1; Budget in Runde 2 von 150 KB auf 200 KB angehoben, Entscheidung des
    Orchestrators wegen der Muss-Punkte Graph/Abhängige. Gemessen von `tests/static.test.mjs`.)

## 7. Aufgaben je Rolle
**architekt**
- Ordnerstruktur festlegen: `app/index.html`, `app/css/`, `app/js/{store,logic,graph,ui,keys}.js`,
  `tests/`, `server.mjs`, `start.bat`, `start.sh`, `tools/bundle.mjs`, `vercel.json`.
- Logik-Modul (`logic.js`) als reine Funktionen ohne DOM spezifizieren (API-Liste), Datenmodell + Migration,
  Zyklus-Algorithmus (DFS), Layout-Algorithmus Graph, Undo-Konzept, Event-Fluss Store -> Render.
- Ergebnis: `projekte/todo-app/ARCHITEKTUR.md`.

**designer**
- Design-Tokens (Farben hell/dunkel, Abstände, Typo-Skala) als CSS-Variablen, Statusfarben mit Kontrastnachweis.
- Layout: Sidebar (Filter/Tags) + Liste + Detail-Panel; mobil: Liste mit Bottom-Sheet für Details.
- Zustände: leer, blockiert, überfällig, erledigt, Drag-Vorschau, Fokus; Graph-Knotenstil; Hilfe-Dialog Tastenkürzel.
- Ergebnis: `projekte/todo-app/DESIGN.md` (+ `app/css/tokens.css`).

**frontend**
- Umsetzung gemäß ARCHITEKTUR.md und DESIGN.md inkl. aller Features aus Abschnitt 4.
- Tests mit `node --test` für Logik-Modul, Server-Skript, Bundle-Skript, Service Worker, Manifest, `vercel.json`.
- README in `projekte/todo-app/README.md` (Start, Kürzel, Datenhinweis).

**backend**: nicht nötig (keine Server-Logik; `server.mjs` ist nur statischer Dateiserver, gehört zu frontend).

**ux-tester**
- Prüfung gegen alle Akzeptanzkriterien (Abschnitt 6), mobil bei 375 px, Tastatur- und Screenreader-Durchlauf,
  Lighthouse-Lauf, Edge Cases (tiefe Verschachtelung, Löschen mit Abhängigkeiten, leerer Zustand, kaputter Import).
- Ergebnis je Runde in `projekte/todo-app/FEEDBACK-<runde>.md`, priorisiert Muss/Sollte/Kann.

## 8. Ablauf und Abnahme
architekt -> designer -> frontend -> ux-tester/Projektleiter-Review (max. 3 Runden, danach nur Muss-Punkte).
Abnahme bei: Tests grün, alle Akzeptanzkriterien erfüllt, alle Muss-Punkte erledigt.
Deployment: statische Demo auf Vercel (persönliches Tool, keine Kundenfreigabe nötig; keine Kosten).
Ergebnisbericht: `ergebnisse/2026-11-19-todo-app.md`.

## 9. Offene Punkte / später
Wiederkehrende Aufgaben, Erinnerungen, Sync zwischen Geräten (z. B. Datei-basiert), Zeiterfassung.
