# FEEDBACK Runde 1 (Projektleiter-Zusammenfassung)

Grundlage: `FEEDBACK-1-tester.md` (UX-Tester, Playwright 375/768/1440 px, hell/dunkel, Maus/Tastatur/Touch) und eigene Prüfung gegen die Abnahmekriterien in `PLAN.md`.

## Muss – alle behoben
| # | Punkt | Lösung | Nachweis |
|---|---|---|---|
| M1 | Filter-Chips am Handy riesig, Graph ohne Platz | Grid-Zeilen `auto minmax(0,1fr)`, Chips fest 40 px | Chip-Höhe 40 px, Graph 498 px hoch (iPhone 12) |
| M2 | 375 px: Eingabe/Sortierung ragen über den Rand | `min-width:0` für Eingabe, Kopfzeile der Liste umbrechend | kein seitliches Scrollen in `#list-wrap` |
| M3 | Tap-Ziele < 40 px | Haken mit 40-px-Trefferfläche, Pfeil 30×40, „+“ 40, Chip-„ד 34, Umschalter 38 | Messskript |
| M4 | Esc verwirft getippte Notizen | Titel/Notizen/Tags speichern live beim Tippen (eine Rückgängig-Stufe je Feld) | Notiz bleibt nach Esc erhalten |
| M5 | Leertaste im Graph hakt ab | Globale Kürzel ignorieren Graph-Knoten | Aufgabe bleibt offen |
| M6 | Tipp im Handy-Graph trifft das Detail-Blatt | Auswahl erst beim `click`, nicht bei `pointerup` | Blatt offen, kein Feld fokussiert |

## Sollte – behoben
S1 (Klick nach Feldbearbeitung verschluckt), S2 (Strg+Z aus leerem Eingabefeld), S3 (Eltern abhaken prüft Blockaden der Unteraufgaben), S4 (Graph folgt Filter/Tag/Suche, Voraussetzungen werden als Kontext gezeigt; Schalter „Erledigte ausblenden“ entfällt), S5 (Handy-Graph startet lesbar bei 60 % oben links, Legende ausgeblendet), S6 (Bernstein nur noch „blockiert“, mittlere Priorität = Indigo), S7 (Import-Toast 15 s mit Rückgängig und Hinweis „vorheriger Stand ersetzt“), S8 (Titel am Handy zweizeilig), S9 (Unteraufgaben blockierter Aufgaben gelten nicht als machbar).

## Kann – teilweise
Umgesetzt: K1 (Wochentage `@freitag`, `@fr`), K2 (Hinweis bei leerem Titel), K3 (Tags nur an Komma trennen), K4 (runde Haken im Detail), K5 (einheitliche Zählung), K6 (Beispieldaten tragen `#beispiel`), K9 (gewählter Knoten wird ins Bild geschoben, Unteraufgaben-Linien kontrastreicher), K10 (Sonne/Mond je nach Zustand), K11 (Toast am Handy oben).
Offen (bewusst): K7 (Bestätigung bei Entf – Rückgängig reicht), K8 (Roving-Tabindex).

## Ergebnis
Keine Muss-Punkte offen, Abnahmekriterien erfüllt → keine weitere Runde nötig.
