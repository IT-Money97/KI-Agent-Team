# Ergebnis: „Knoten" – lokale Todo-App mit Unteraufgaben und Abhängigkeitsgraph

Datum: 2026-11-19 · Art: interner Auftrag (Eigenbedarf) · Status: **fertig, live**

## Links
- **Live-URL:** https://todo-knoten.vercel.app (Vercel-Projekt `todo-knoten`, Hobby, Status READY laut Vercel-API; Schutz auf Standard: Produktion öffentlich, Previews nur mit Login)
- Hinweis: HTTP-200- und Screenshot-Check der Live-URL war aus der Cloud-Umgebung nicht möglich (`*.vercel.app` gesperrt). Lokal geprüft wurde exakt dieselbe Datei.
- **Lokal nutzen:** `projekte/todo-knoten/app/index.html` herunterladen und per Doppelklick öffnen. Läuft ohne Internet, ohne Installation.
- **Repo:** https://github.com/IT-Money97/KI-Agent-Team/tree/claude/project-thread-0w30l6/projekte/todo-knoten
- **Screenshots:** `projekte/todo-knoten/screenshots/` (1440 px hell/dunkel, 375/390 px) und `screenshots/ux/` (UX-Test)

## Was die App kann
- Schnell-Eingabe mit Kürzeln: `#tag`, `!1`–`!3` (Priorität), `@heute`, `@morgen`, `@freitag`, `@24.12.`
- Unteraufgaben in beliebiger Tiefe, auf-/zuklappbar, Fortschritt (x/y)
- Abhängigkeiten („wartet auf" / „blockiert"), Zyklus-Schutz, blockierte Aufgaben lassen sich nicht abhaken (mit Begründung)
- Graph-Ansicht: Pfeile = Abhängigkeiten, gestrichelt = Unteraufgaben, Farben machbar/blockiert/erledigt, Zoom, Verschieben, Pinch, Klick öffnet Aufgabe; folgt Filter und Suche
- Filter: Alle offenen, Jetzt machbar, Blockiert, Fällig, Alles, Erledigt, Tags, Suche; Sortierung
- Detailbereich (am Handy als Blatt): Titel, Notizen, Priorität, Fälligkeit, Tags, Unteraufgaben, Voraussetzungen in beide Richtungen, Verschieben
- Drag & Drop (oben/unten = sortieren, Mitte = Unteraufgabe), Rückgängig (Strg+Z, 50 Schritte), Tastenkürzel (`?`), Hell/Dunkel, Export/Import JSON, Beispieldaten, installierbar und offline (gehostete Version)

## Qualität
- Smoke-Test (Playwright): Anlegen, Kürzel, Abhängigkeit, Zyklus-Schutz, Blockade, Abhaken mit Unteraufgaben, Rückgängig, Persistenz nach Neuladen, Graph-Auswahl, Export → Import identisch. Keine Konsolenfehler.
- UX-Review Runde 1: 6 Muss- und 9 Sollte-Punkte gefunden, alle behoben (`FEEDBACK-1.md`). Kein horizontales Scrollen bei 375 px, Tap-Ziele ≥ 40 px.
- Keine externen Ressourcen, keine Cookies, kein Tracking.

## Annahmen
- „Lokal" = Daten nur im Browser (localStorage) des jeweiligen Geräts. Kein Sync zwischen Geräten; Umzug per Export/Import.
- Datei-Version (Doppelklick) und Web-Version haben getrennte Datenspeicher.

## Offene Punkte / Ideen
- Sync zwischen Geräten (z. B. Datei im Cloud-Ordner oder kleines Backend) – nur bei Bedarf.
- Wiederkehrende Aufgaben, Erinnerungen (Benachrichtigungen).
- Bestätigung beim Löschen großer Projekte per Entf-Taste (aktuell nur Rückgängig), Roving-Tabindex für Tastaturnutzer.
- Für automatische Live-Checks `*.vercel.app` in der Netzwerkfreigabe der Umgebung ergänzen.

## Was noch geliefert werden muss
Nichts. Optional: Wunsch-Features aus „Offene Punkte".
