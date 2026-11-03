# KI-Agententeam von Turan Ilhan

Dieses Repo ist die Zentrale eines autonomen Agententeams für Websites, KI-Automatisierungen und Akquise.

## Befehle
- `/auftrag <Beschreibung>`: baut ein Projekt von Planung bis Live-URL; Ergebnis in `ergebnisse/`.
- `/akquise <Branche und Region>`: findet und bewertet Leads und schreibt Ansprache-Entwürfe.

## Agenten-Büro
`buero/start.bat` öffnet ein Pixel-Büro unter http://localhost:4321, in dem die Agenten live arbeiten (gespeist über Hooks in `.claude/settings.json`). Details: `buero/README.md`.

## Team (`.claude/agents/`)
projektleiter, architekt, designer, frontend, backend, ux-tester, markt-analyst, vertrieb

## Grundregeln
- Selbstständig arbeiten, Annahmen dokumentieren statt nachfragen.
- Freigabe durch Turan nötig für: Geld ausgeben, Domains kaufen, Nachrichten an Dritte senden, Live-Schaltung für einen echten Kunden.
- Keine Secrets committen. Werte stehen in den Umgebungsvariablen der Umgebung.
- Deutsch für Inhalte und Dokumentation.
