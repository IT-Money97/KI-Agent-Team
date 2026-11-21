# ARCHITEKTUR: Todo-App (lokal)

Stand: 2026-11-19 · Grundlage: `PLAN.md` · Status: Gerüst lauffähig, `js/logic.js` fertig und getestet.

## 1. Stack-Entscheidung
- **Vanilla HTML/CSS/JS mit ES-Modulen, kein Build-Schritt, null npm-Abhängigkeiten** (wie im Plan).
  Astro/Next.js wären für eine reine Client-App ohne Inhaltsseiten unnötiger Ballast.
- **Kein Backend.** Daten liegen in `localStorage`. `server.mjs` ist nur ein statischer Dateiserver für die lokale Nutzung.
- **DSGVO:** keine externen Requests, keine Webfonts (Systemschrift), kein Tracking, also kein Cookie-Banner.
  Hinweis im Footer: „Daten bleiben lokal im Browser“.

### Abweichungen vom Plan (Annahmen)
| Plan | Entscheidung | Grund |
|---|---|---|
| Port 5173 | **Port 4322** (`PORT` überschreibt) | Vorgabe Projektleiter; 4321 belegt das Agenten-Büro, 5173 kollidiert oft mit Vite |
| `blockedBy`, `doneAt` | **`dependsOn`, `completedAt`** | Vorgabe Projektleiter; alte Feldnamen werden per Migration v0 -> v1 übernommen |
| `js/ui.js` | **`js/ui/*.js`** (mehrere kleine Module) | bessere Aufteilung für das Frontend |
| – | `app.js` als Einstiegspunkt | verbindet Store, Logik und UI |
| `node --test <ordner>` | zusätzlich `tests/index.js` | Node 22 akzeptiert kein Verzeichnis als Argument; die Datei lädt alle `*.test.mjs` |

## 2. Ordnerstruktur (`projekte/todo-app/app/`)
```
index.html              App-Shell (Header, Sidebar, Liste, Graph, "Als Nächstes", Detail, Toast)
standalone.html         ERZEUGT von tools/bundle.mjs (alles inline, läuft per file://), eingecheckt
manifest.webmanifest    PWA-Manifest
icon.svg                App-Icon / Favicon
sw.js                   Service Worker (App-Shell-Cache, cache-first, Versionsname CACHE)
server.mjs              statischer Server (node:http/fs), Port 4322, `--open` öffnet den Browser
start.bat / start.sh    Start ohne npm install (rufen `node server.mjs --open` auf)
vercel.json             Header (CSP, nosniff, sw.js no-cache) für die statische Demo
.vercelignore           tests/, tools/, Server und Startskripte nicht deployen
css/tokens.css          Design-Tokens gemäß DESIGN.md (hell/dunkel, Graph-Status, Abstände, Radien, Schatten, z-index)
css/app.css             Layout und Komponenten
js/logic.js             HERZ: reine Funktionen, kein DOM (fertig)
js/store.js             State + Undo-Historie + localStorage + Abonnenten
js/app.js               Einstiegspunkt, View-State, Verdrahtung
js/graph.js             SVG-Rendering des Layouts aus logic.layoutGraph
js/keys.js              globale Tastenkürzel
js/ui/dom.js            h()-Helfer, $()
js/ui/list.js           Baumliste + "Als Nächstes"
js/ui/sidebar.js        Filter mit Zählern, Tags
js/ui/detail.js         Detail-Panel (Desktop: Spalte, mobil: Bottom-Sheet)
js/ui/toast.js          Meldungen (aria-live) mit „Rückgängig“
js/ui/dialog.js         native <dialog>: Rückfragen, Hilfe
tools/bundle.mjs        erzeugt standalone.html
tests/*.test.mjs        node --test (logic, store, server, static/bundle)
tests/index.js          Verzeichnis-Einstieg für `node --test …/tests/`
```

## 3. Datenmodell (Schema-Version 1)
```js
Task {
  id: string,               // crypto.randomUUID() bzw. Fallback
  title: string,            // nicht leer, getrimmt
  notes: string,            // mehrzeilig, '' erlaubt
  done: boolean,
  parentId: string | null,  // Baum; null = Wurzelebene
  order: number,            // 0..n-1 innerhalb der Geschwister (wird nach jeder Änderung neu durchnummeriert)
  priority: 0 | 1 | 2 | 3,  // keine | niedrig | mittel | hoch
  due: 'YYYY-MM-DD' | null, // lokales Datum
  tags: string[],           // klein geschrieben, ohne '#', dedupliziert
  dependsOn: string[],      // "blockiert durch": IDs, die vorher erledigt sein müssen
  createdAt: ISO-String, updatedAt: ISO-String, completedAt: ISO-String | null
}
State { version: 1, tasks: { [id]: Task }, settings: { theme: 'system'|'light'|'dark', collapsed: string[] } }
```
Regeln:
- Löschen entfernt den Teilbaum, alle Verweise in `dependsOn` und in `settings.collapsed`.
- Abhängigkeiten auf eigene Vorfahren und Nachfahren sind erlaubt, Zyklen nicht.
- **blockiert** = mindestens eine `dependsOn`-Aufgabe ist offen. **effektiv blockiert** = selbst oder ein Vorfahr ist blockiert.
- Fortschritt = erledigte / alle **Nachfahren** (nicht nur direkte Kinder).
- Speicher: `localStorage['todo-app/state']` = `JSON.stringify(state)`. Ungültige Daten werden beim Laden unter
  `todo-app/state/backup-<ts>` gesichert und es wird mit leerem State gestartet (Meldung).

### Migration
`migrate(raw)` hebt schrittweise über `MIGRATIONS[v]` an. v0 (Prototyp) = `tasks` als Array oder Objekt bzw.
die Datei selbst ein Array, Felder `blockedBy`/`doneAt`, fehlende Defaults. Version > 1 wird mit Meldung abgelehnt.
Für eine neue Version: `SCHEMA_VERSION` erhöhen, `MIGRATIONS[n] = (d) => ({ ...d, version: n + 1 })` ergänzen, Test schreiben.

## 4. Logik-API (`js/logic.js`, fertig)
Alle Änderungsfunktionen sind **unveränderlich**: Sie geben einen neuen State zurück (unveränderte Tasks behalten
ihre Referenz; ein No-op gibt denselben State zurück) oder werfen `LogicError { code, message }`.
`opts.now` (ISO) und `opts.id` machen die Funktionen deterministisch testbar.

| Bereich | Funktionen |
|---|---|
| State/Hilfen | `createState`, `getTask`, `generateId`, `isValidDate`, `toDateString`, `addDays`, `normalizeTags` |
| CRUD | `addTask(s, input, {id, afterId, index, now})`, `updateTask(s, id, patch)`, `deleteTask`, `setDone(s, id, done, {cascade})`, `toggleDone` |
| Baum | `buildChildIndex`, `getChildren`, `getDescendantIds`, `getAncestorIds`, `getDepth`, `flattenTree(s, {collapsed, include})`, `treePositions`, `progress`, `hasOpenDescendants` |
| Verschieben | `moveTask(s, id, {parentId, index})`, `moveUp`, `moveDown`, `indent`, `outdent` |
| Abhängigkeiten | `externalDependents(s, id)` (Abhängige außerhalb des Teilbaums, für die Lösch-Rückfrage), `setDependencies`, `addDependency`, `removeDependency`, `getBlockers`, `isBlocked`, `isEffectivelyBlocked`, `getDependents`, `findDependencyPath`, `wouldCreateCycle`, `detectCycle`, `taskStatus` |
| Graph | `linkedIds`, `computeLayers`, `layoutGraph(s, {ids, nodeWidth, nodeHeight, gapX, gapY, sweeps, dummySize, direction: 'LR'|'TB'})` -> `{nodes, edges: [{from, to, points}], layers, crossings, direction, width, height}`, `countCrossings`, `dependencyChain(s, id)` (Set aller transitiven Voraussetzungen und Abhängigen inkl. `id`) |
| Filter | `searchByTitle(s, query, {exclude})` (Rang: exakt < Anfang < Wortanfang < enthält, dann Tiefe, dann Baumposition), `matchesQuery`, `matchesStatus`, `filterTasks(s, {status, query, tag, today})`, `withAncestors`, `countByFilter`, `collectTags`, `nextTasks(s, {limit})` |
| Eingabe | `parseQuickInput(text, {today})`: `#tag`, `!1..!3` oder `!niedrig/!mittel/!hoch`, Datum mit `@` (alle Formen von `parseDateWord`, z. B. `@fr`) oder ohne `@` (klein geschriebene Wörter `heute/morgen/übermorgen/freitag`, `12.12.`, `12.12.2026`, `2026-12-12`); `parseDateWord(wort, today, {short})` (Frontend-Erweiterung 2026-11-19, mit Tests) |
| Settings | `setCollapsed`, `setTheme` |
| Undo | `createHistory`, `commit`, `undo`, `redo`, `canUndo`, `canRedo` (Limit `HISTORY_LIMIT = 50`) |
| Daten | `migrate`, `validateState(jsonOderObjekt) -> {ok, state} / {ok:false, errors[]}`, `exportState` |

Fehlercodes: `EMPTY_TITLE`, `NOT_FOUND`, `DUPLICATE_ID`, `INVALID_DATE`, `INVALID_PRIORITY`, `INVALID_MOVE`,
`CYCLE` (mit `.cycle` = ID-Pfad), `INVALID_FILTER`, `INVALID_THEME`, `INVALID`, `TOO_NEW`.

### Algorithmen
- **Zyklus-Erkennung beim Hinzufügen:** `id` soll von `d` abhängen. Das ergibt einen Zyklus genau dann, wenn entlang
  `dependsOn` ein Pfad von `d` nach `id` existiert (iterative DFS mit Vorgänger-Map). Der Pfad wird für die Meldung
  „Zyklus: „A“ -> „B“ -> „A““ zurückgegeben. Der State bleibt unverändert (Funktion wirft).
- **Zyklus im Gesamtgraphen (Import):** iterative DFS mit drei Farben (weiß, grau, schwarz), kein Rekursionslimit.
- **Graph-Layout:** Kanten Voraussetzung -> abhängige Aufgabe, von links nach rechts (`LR`, Desktop) oder von oben
  nach unten (`TB`, mobil).
  1. Ebenen über den längsten Pfad (Kahn-Algorithmus). 2. Startreihenfolge je Ebene = Baumreihenfolge.
  3. Median-Heuristik in abwechselnden Vorwärts- und Rückwärts-Sweeps (Standard 6); behalten wird die Ordnung mit den
  wenigsten Kreuzungen. 4. Koordinaten im festen Raster. Kanten über mehrere Ebenen erhalten je Zwischenebene einen
  Dummy-Knoten (Runde 2), der mitsortiert wird; `points` enthält je Dummy einen Ein- und Austrittspunkt, die Kante
  läuft so durch eine freie Lücke statt durch fremde Knoten. Dummies erscheinen nicht in `nodes`/`layers`.
  Gemessen: 200 Knoten deutlich unter 500 ms.
- **„Als Nächstes“:** offen, keine offenen Unter-Todos, nicht effektiv blockiert; Sortierung Fälligkeit aufsteigend
  (ohne Datum zuletzt), dann Priorität absteigend, dann Baumreihenfolge.
- **Filter „heute“** = fällig genau heute (überfällige stehen separat unter „überfällig“). Baumansicht mit Filter:
  Treffer plus Vorfahren (`withAncestors`), dabei wird alles aufgeklappt.

## 5. Event-Fluss und Undo
```
Eingabe/Kürzel -> app.js run(fn) -> store.apply(s => logic.xyz(s, …))
   -> LogicError? -> toast(message)  (State unverändert)
   -> neuer State -> commit(history) -> localStorage speichern -> subscribe-Listener -> render()
```
- **Undo:** Snapshot-Stack aus unveränderlichen States (strukturelles Teilen, daher günstig), 50 Schritte, Redo wird
  bei einer neuen Aktion verworfen. Settings (Theme, eingeklappt) laufen über `store.applySettings` **ohne** Undo-Schritt
  und bleiben bei Undo/Redo erhalten.
- **View-State** (Filter, Suche, Auswahl, Graph an/aus) lebt nur in `app.js` und wird nicht gespeichert.
- **Rendering:** pro Änderung wird die sichtbare Liste neu berechnet; Zeilen mit unveränderter Signatur werden wiederverwendet
  (Zeilen-Diffing in `ui/list.js`), dazu `content-visibility: auto`. Gemessen bei 2.000 Aufgaben: Filterwechsel/Abhaken 21–37 ms.
  Reine Auswahländerung (Klick/Enter) baut die Liste nicht neu auf (Doppelklick und Fokus bleiben erhalten).
  Das Detail-Panel wird einmal gebaut und nur gezielt aktualisiert.
- **Import:** `store.importJson(text)` validiert vollständig; bei Erfolg ist der Import ein Undo-Schritt.

## 6. Offline, Start, Deployment
- **Lokal:** `start.bat` / `start.sh` -> `node server.mjs --open` -> http://localhost:4322 (nur 127.0.0.1, GET/HEAD,
  Pfad-Ausbruch und Dotfiles ergeben 404/403).
- **Doppelklick:** `standalone.html` (per `node tools/bundle.mjs` neu erzeugen, wenn sich JS/CSS ändert). Jedes Modul
  wird zu einer IIFE in `__m['js/x.js']`, Importe werden zu Destructuring. Erlaubte Syntax: benannte Im- und Exporte
  (`export function|const|let|class`, `export { … }`, `import { a as b }`, `import * as X`). Kein `export default`,
  kein `import()`, kein `import.meta` im Browser-Code. Manifest und Service Worker sind im Standalone-Modus aus.
- **Offline (http):** `sw.js` cached die App-Shell; ein Test prüft, dass jede Datei in `js/` und `css/` in `ASSETS` steht.
  Bei Änderungen `CACHE`-Version erhöhen.
- **Vercel-Demo:** Projekt-Root `projekte/todo-app/app`, kein Build-Befehl, Output = Root. EU-Region ist bei statischen
  Dateien nicht relevant (es gibt keine Funktionen und keine Nutzerdaten auf dem Server). Keine eigene Domain nötig
  (`*.vercel.app`). CSP erlaubt nur `'self'` (plus Inline-Styles für `--depth`).

## 7. Externe Dienste und Umgebungsvariablen
- Externe Dienste: **keine** (keine Karten, Formulare, KI-APIs, Fonts oder CDNs).
- Umgebungsvariablen: `PORT` (optional, nur `server.mjs`). Keine Secrets.

## 8. Tests
`node --test projekte/todo-app/app/tests/` (oder `node --test` im Ordner `app/`). Aktuell **53 Tests, alle grün**:
45 Logik (inkl. `parseDateWord`, Datum ohne `@`, Dummy-Knoten/Richtung TB, `dependencyChain`, `externalDependents`,
`searchByTitle`), (CRUD, Baum, Fortschritt, Zyklen, blockiert, Graph-Layout + Performance, Filter, „Als Nächstes“, Schnelleingabe,
Undo, Import/Export, Migration, 2.000-Aufgaben-Performance), 3 Store (Persistenz/Reload, Undo und Settings, kaputte Daten),
1 Server, 4 Static (Manifest, vercel.json, SW-Cache-Liste, Bundle-Syntax, Größe der vom Browser geladenen Dateien = `ASSETS` in `sw.js` plus `sw.js` < 200 KB).

## 9. Übergabe an Designer/Frontend
- Designer: `css/tokens.css` ersetzen bzw. ergänzen (Variablennamen beibehalten oder in `app.css` mitziehen).
- Frontend: Platzhalter-UI in `js/ui/*` ausbauen (Inline-Bearbeitung, Detail-Formular mit Abhängigkeits-Suche,
  Drag & Drop, Zoom/Pan im Graph, Hilfe-Dialog, Export/Import-Buttons, Löschen mit Undo-Toast, Rückfrage beim Abhaken
  eines Elternteils über `hasOpenDescendants` + `setDone(…, {cascade})`). `logic.js` nur mit Test erweitern.
  Nach jeder Änderung: `node tools/bundle.mjs` und `sw.js` (ASSETS, CACHE) pflegen.
