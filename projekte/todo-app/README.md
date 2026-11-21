# Todo – lokal

Schlanke Todo-App mit beliebig tiefen Unter-Todos, Abhängigkeiten („blockiert durch“), Graph-Ansicht und einer
„Als Nächstes“-Liste. Läuft komplett im Browser, ohne Konto und ohne Server. **Daten bleiben lokal im Browser**
(`localStorage`); zum Sichern oder Übertragen auf ein anderes Gerät: Export/Import (JSON) in der Seitenleiste.

## Start
- **Windows:** `app/start.bat` doppelklicken (benötigt Node.js, kein `npm install`) – öffnet http://localhost:4322
- **macOS/Linux:** `app/start.sh`
- **Ohne Node:** `app/standalone.html` doppelklicken (läuft über `file://`, ohne Offline-Cache)
- Nach dem ersten Laden über http funktioniert die App auch offline und lässt sich als App installieren.

## Schnelleingabe
`Steuer machen !hoch #büro morgen` legt eine Aufgabe mit Priorität, Tag und Fälligkeit an.

| Eingabe | Bedeutung |
|---|---|
| `!hoch` `!mittel` `!niedrig` (oder `!3` `!2` `!1`) | Priorität |
| `#tag` | Tag (mehrere möglich) |
| `heute` `morgen` `übermorgen` `freitag` `24.12.` `24.12.2026` `2026-12-24` | Fälligkeit (Wörter klein geschrieben) |
| `@fr` `@mo` … | Wochentag-Kürzel (nur mit `@`) |
| `>` am Anfang | Unter-Todo der ausgewählten Aufgabe |

## Abhängigkeiten und Graph
- Im Detail: **Blockiert durch** (worauf die Aufgabe wartet) und **Voraussetzung für** (wer auf sie wartet). Kandidaten,
  die einen Kreis erzeugen würden, sind ausgegraut.
- In der Liste zeigt „wartet auf: …“, worauf gewartet wird; ein Klick springt dorthin.
- Graph: Desktop von links nach rechts, mobil von oben nach unten. „Nur Kette“ zeigt nur Vorgänger und Nachfolger der
  gewählten Aufgabe, „Erledigte ausblenden“ blendet Erledigte aus, die Suche hebt Treffer hervor.
- Löschen einer Aufgabe, auf die andere warten, fragt vorher nach. Alles lässt sich rückgängig machen.
- **Alle Daten löschen …** (Seitenleiste unten) fragt nach und kann per Rückgängig zurückgeholt werden.

## Tastenkürzel (Hilfe jederzeit mit `?`)
| Taste | Aktion |
|---|---|
| `n` | Schnelleingabe |
| `/` | Suche |
| `↑` `↓` / `j` `k` | Auswahl bewegen |
| `→` `←` | Auf-/Zuklappen |
| `Enter` | Detail öffnen, nochmal: Titel bearbeiten (`F2`) |
| `Leertaste` | Abhaken |
| `Tab` / `Shift+Tab` | Einrücken / Ausrücken, nur wenn die Zeile per Pfeiltaste oder Klick gewählt wurde; beim bloßen Durchtabben verlässt `Tab` die Liste. `Esc` hebt die Wahl auf |
| `Alt+→` / `Alt+←` | Einrücken / Ausrücken (immer) |
| `Alt+↑` / `Alt+↓` | Verschieben |
| `Entf` | Löschen (mit Rückgängig) |
| `Strg+Z` / `Strg+Shift+Z` | Rückgängig / Wiederholen |
| `1` `2` `3` / `g` | Liste / Als Nächstes / Graph |
| `Esc` | Panel/Dialog schließen, Suche leeren |

## Entwicklung
```
cd app
node --test tests/          # Tests
node tools/bundle.mjs       # standalone.html nach Änderungen neu erzeugen
```
Nach Änderungen an Dateien in `js/` oder `css/`: `sw.js` (`ASSETS`, `CACHE`-Version) pflegen.
Details: `ARCHITEKTUR.md`, `DESIGN.md`, Prüfergebnisse: `BUILD.md`.
