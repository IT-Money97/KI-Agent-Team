---
description: Führt einen Auftrag vollautomatisch aus: Planung, Umsetzung, Review-Schleife, Deployment, Ergebnisdatei.
argument-hint: <Was soll gebaut werden, z. B. "Webseite für Dönerladen Ali in Köln-Ehrenfeld">
---
Auftrag: $ARGUMENTS

Arbeite vollständig selbstständig und ohne Rückfragen (Ausnahmen: Geld ausgeben, Domain kaufen, Nachrichten an Dritte senden).

1. **Planung**: Starte den Subagenten `projektleiter`. Er legt `projekte/<slug>/PLAN.md` an.
2. **Architektur**: `architekt` → `ARCHITEKTUR.md` und lauffähiges Grundgerüst.
3. **Design**: `designer` → `DESIGN.md` und Design-Tokens.
4. **Umsetzung**: `frontend` und, falls nötig, `backend` parallel.
5. **Review-Schleife** (max. 3 Runden): `ux-tester` und `projektleiter` prüfen parallel, PL fasst zu `FEEDBACK-<n>.md` zusammen, Team arbeitet nach. Ende, wenn keine Muss-Punkte offen sind und die Abnahmekriterien erfüllt sind.
6. **Deployment**: Neues GitHub-Repo bzw. Branch pushen, über Vercel oder Netlify deployen (CLI mit `VERCEL_TOKEN` bzw. `NETLIFY_AUTH_TOKEN` oder Git-Integration). Live-URL prüfen (HTTP 200, Screenshot).
7. **Ergebnis**: PL schreibt `ergebnisse/<datum>-<slug>.md` mit Live-URL, Repo, Screenshots, Annahmen, offenen Punkten und dem, was der Kunde noch liefern muss.
