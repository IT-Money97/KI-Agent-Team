# FEEDBACK Runde 1 – Projektleiter

Stand: 2026-11-19 · Prüfer: projektleiter · Grundlage: PLAN.md (Abschnitt 6, Kriterium 12 in dieser Runde präzisiert),
BUILD.md, ARCHITEKTUR.md. Kein App-Code geändert. Unabhängig vom UX-Tester (`FEEDBACK-1-tester.md`).

## Was ich selbst ausgeführt habe
- `node --test tests/` und `node --test` in `app/` (Node 22.23.5): je 48/48 grün.
- `node server.mjs` (Port 4322), vorhandener E2E-Lauf `tests/e2e.playwright.cjs`: 62/62 OK, keine Konsolenfehler/-warnungen.
- Eigene Playwright-Stichproben (Chromium 1243, Skripte im Scratchpad): 375 px mit 120-Zeichen-Titel ohne Leerzeichen
  und 13 Ebenen Verschachtelung, Tab-Reihenfolge, Abhängigkeit nur per Tastatur, Graph per Tab, Offline, `standalone.html`
  per file://, 2.000 Aufgaben, Netzwerk-Mitschnitt auf externe Requests.
- axe-core 4.x (WCAG 2 A/AA, 2.1 AA), befüllt (erledigt/überfällig/blockiert/Unter-Todo/Tag), Liste + Detail + Graph,
  1280 px und 375 px, hell und dunkel: 12 von 12 Läufen ohne Verstöße (inkl. color-contrast).
- Lighthouse 12.8.2 mobil (lokal, leerer Zustand): Performance 99, Accessibility 100, Best Practices 100, SEO 100;
  17 Requests, alle an 127.0.0.1:4322.
- `tools/bundle.mjs` in einer Kopie ausgeführt: Ergebnis byte-identisch mit eingecheckter `standalone.html` (aktuell).
- `start.sh` aus fremdem Arbeitsverzeichnis mit `PORT=4399`: Server antwortet 200.

## Akzeptanzkriterien

| # | Kriterium | Status | Beleg |
|---|---|---|---|
| 1 | `node --test` grün, ≥ 25 Logik-Tests | **erfüllt** | 48/48 grün, davon 40 in `tests/logic.test.mjs` (CRUD, Baum, Fortschritt, Zyklen, blockiert, Als Nächstes, Filter, Undo, Import-Validierung, Migration) |
| 2 | Keine Konsolenfehler/-warnungen (Chrome, **Firefox**) | **teilweise** | Chromium: E2E (62 Schritte) und meine Stichproben ohne Fehler/Warnungen. **Firefox nicht geprüft** – in der Umgebung nicht installiert, auch BUILD.md nennt nur Chromium |
| 3 | Zyklus A↔B abgelehnt, sichtbare Meldung, Daten unverändert | **erfüllt** | E2E: Kandidat `aria-disabled` + „würde Kreis erzeugen“; erzwungen: `#d-dep-error` „Nicht gespeichert – Zyklus: „Kartons besorgen“ → „Küche packen“ → „Kartons besorgen““; State-JSON vorher = nachher |
| 4 | Persistenz nach Reload identisch | **erfüllt** | E2E „Reload: Daten identisch“ + „Zeilen identisch“; file://-Variante: Daten nach Reload vorhanden |
| 5 | Export → Löschen → Import identisch; ungültige Datei mit Meldung abgelehnt | **erfüllt** (mit Einschränkung) | E2E „Import identisch“, „Kaputter Import abgelehnt“. Einschränkung: Es gibt keinen Knopf „Alle löschen“; „Löschen“ geht nur über Browser-Websitedaten (siehe S-3) |
| 6 | 375 px kein horizontales Scrollen | **erfüllt** | E2E (Liste, Sheet, Menü, Graph; hell/dunkel). Eigene Kante: 120 Zeichen ohne Leerzeichen + 13 Ebenen: html/body/main/detail scrollWidth = clientWidth = 375; Einrückung wird ab Ebene 4 gedeckelt und per Chip „Ebene n“ angezeigt |
| 7 | Lighthouse mobil A11y ≥ 95, Perf/BP/SEO ≥ 90 | **erfüllt** | Eigener Lauf: 99 / 100 / 100 / 100 (nur leerer Zustand messbar; befüllte Zustände per axe ohne Verstöße) |
| 8 | Komplett per Tastatur, sichtbarer Fokus, Kontrast ≥ 4,5:1 in beiden Themes | **erfüllt** (mit Sollte-Punkt) | Tab-Reihenfolge logisch (Skip-Link → Ansichten → Filter → Theme/Export/Import/Hilfe → Suche → Schnelleingabe → Liste); Abhängigkeit per Tastatur gesetzt; Graph: Tab erreicht Knoten („Alpha, ausführbar“, „Beta, blockiert“), Enter öffnet Detail (E2E); Fokusring in hell/dunkel sichtbar; axe-Kontrast 0 Verstöße. Siehe S-1 (Tab in der Liste) |
| 9 | `start.bat` ohne npm install; `standalone.html` per Doppelklick | **erfüllt** (Windows nicht live getestet) | `start.bat`/`start.sh` rufen nur `node server.mjs --open`; `start.sh` getestet; `openBrowser` behandelt win32/darwin/linux. `standalone.html` per file://: Anlegen, Abhängigkeit, Graph (2 Knoten), Persistenz ohne Konsolenfehler; Bundle aktuell |
| 10 | Offline nach erstem Laden | **erfüllt** | SW aktiv, `context.setOffline(true)` + Reload: App lädt, Anlegen funktioniert |
| 11 | 2.000 Aufgaben: Filter/Abhaken < 100 ms; Graph 200 Knoten < 500 ms | **erfüllt** | Eigene Messung inkl. Frame: Filter 14 / 54 / 40 / 28 ms, Abhaken 17 ms, Laden 224 ms. Unit-Test `layoutGraph mit 200 Knoten unter 500 ms` grün; BUILD: 988 Knoten ~170 ms |
| 12 | (neu präzisiert) Browser-Dateien < 150 KB, null externe Requests | **erfüllt** | `index.html` + `css/*` + `js/**` + `sw.js` + `manifest.webmanifest` + `icon.svg` = **148.747 Byte** (< 153.600, Puffer 4.853 Byte). Lighthouse und Playwright-Mitschnitt: 0 externe Requests |

**Nicht vollständig erfüllt:** Kriterium 2 (Firefox-Nachweis fehlt).

## Eigene Punkte

### Muss
- **M-1 Firefox-Nachweis (Kriterium 2).** Kernabläufe einmal in Firefox ohne Konsolenfehler/-warnungen belegen
  (z. B. E2E-Skript mit `firefox` statt `chromium`, sobald ein Firefox verfügbar ist, oder dokumentierter manueller
  Durchlauf: Anlegen, Unter-Todo, Abhängigkeit, Zyklus, Graph, Export/Import, Reload). Besonders prüfen:
  `<dialog>`, Pointer-Events-Drag, `content-visibility`, Fallback für `field-sizing`, `input type=date`.
  Falls in dieser Umgebung kein Firefox installierbar ist: Restrisiko im Ergebnisbericht ausweisen und Turan um
  einen 5-Minuten-Durchlauf bitten (Entscheidung Orchestrator).

### Sollte
- **S-1 Tab-Falle in der Liste sichtbar machen.** Tab rückt in der Liste ein; auf der ersten Zeile (nicht einrückbar)
  bleibt der Fokus dort, der Hinweis „Einrücken nicht möglich. Esc und dann Tab verlässt die Liste.“ steht nur in der
  visuell versteckten Live-Region `#live`. Sehende Tastaturnutzer sehen nichts. Vorschlag: denselben Hinweis zusätzlich
  als Toast zeigen (einmal pro Sitzung genügt). Formal ist WCAG 2.1.2 erfüllt, weil der Ausweg in der Hilfe steht.
- **S-2 Größen-Test an neues Kriterium 12 anpassen.** `tests/static.test.mjs` („App-Größe … unter 150 KB“) zählt noch
  alles außer `tests/`, `tools/`, `standalone.html` (aktuell 152.589 Byte, ~1 KB Puffer) – also auch `server.mjs`,
  Startskripte, `vercel.json`, `.vercelignore`. Test auf die Browser-Dateiliste aus PLAN Kriterium 12 umstellen
  (am besten aus `ASSETS` in `sw.js` ableiten, dann sind Cache-Liste und Budget konsistent). BUILD.md/ARCHITEKTUR.md
  entsprechend nachziehen.
- **S-3 „Alle Daten löschen“ für Kriterium 5 nutzbar machen oder Ablauf dokumentieren.** Ohne Knopf ist der
  Export→Löschen→Import-Ablauf für Turan umständlich (Browser-Einstellungen). Mit dem neuen Budget-Puffer (~4,8 KB)
  ist ein kleiner Eintrag „Alle Daten löschen …“ mit Rückfrage und Undo-Toast vertretbar. Alternativ mindestens in
  README.md beschreiben, wie man lokal löscht.

### Kann
- **K-1 Graph-Hinweis auf ausgeblendete Aufgaben.** Der Graph zeigt nur verknüpfte Aufgaben (3 Aufgaben, 1 Abhängigkeit
  → 2 Knoten). Ein Satz unter der Legende („1 Aufgabe ohne Abhängigkeiten ausgeblendet“) vermeidet Verwirrung.
- **K-2 Fokus nach Esc in der Schnelleingabe.** Nach `Esc` im Eingabefeld springt der nächste `Tab` zum Footer-Link
  „Tastenkürzel (?)“ statt zur Liste. Fokus bei Esc gezielt auf die zuletzt ausgewählte Zeile setzen.
- **K-3 URL beim Start.** `server.mjs` lauscht auf `127.0.0.1`, öffnet aber `http://localhost:4322/`. In seltenen
  Setups löst `localhost` zuerst auf `::1` auf. Entweder `http://127.0.0.1:…` öffnen oder auf `localhost` lauschen.
- **K-4 `.vercelignore`** um `standalone.html` ergänzen (wird sonst mit deployt; harmlos, aber unnötig).
- **K-5 PLAN Abschnitt 3** nennt noch Port 5173; die Abweichung auf 4322 ist in ARCHITEKTUR.md begründet. Beim nächsten
  Plan-Update angleichen (Projektleiter).

## Fazit Runde 1
11 von 12 Kriterien erfüllt, Kriterium 2 teilweise (Firefox). Muss-Punkt: M-1. Sollte-Punkte S-1 bis S-3 gehen in
Runde 2 an frontend. Nach Änderungen: `node tools/bundle.mjs` und `CACHE`-Version in `sw.js` erhöhen.
