# DESIGN: Albion Werkbank

Rolle: Designer · Stand: 2026-11-03

## Wirkung in 3 Worten
Werkstatt, klar, vertrauenswürdig.

## Entscheidungen
- **Dunkles Standardthema mit Goldakzent**: Spieler nutzen das Tool neben dem Spiel, oft abends; Gold erinnert an Silber/Handel ohne Markenelemente des Spiels zu kopieren.
- **Helles Thema per Knopf**: bessere Lesbarkeit bei Tageslicht und für ältere Nutzer; ersetzt die zehn Farbthemes des alten Tools, die keinen Mehrwert brachten.
- **Systemschrift**: lädt sofort, lokal, keine externen Fonts (DSGVO, offline).
- **Zwei Spalten im Rechner** (Eingaben links, Ergebnis rechts): Ergebnis bleibt beim Ändern sichtbar; unter 980 px eine Spalte.
- **Nummerierte Schritte** „1. Was, 2. Wo und wie, 3. Preise“: führt Neulinge, ohne Profis zu bremsen.
- **Ampelfarben fürs Datenalter** (grün < 3 Std., gelb < 24 Std., rot älter): Marktdaten der Community sind oft alt; das muss man auf einen Blick sehen.
- **Gelbe Markierung „Preis fehlt“**, Gewinn dann „vorläufig“: verhindert falsche Gewinnversprechen.
- **Tabellen mit tabellarischen Ziffern** und rechtsbündigen Zahlen: Vergleichbarkeit.

## Tokens
Siehe `app/public/styles.css` (`:root` und `[data-theme]`): Farben `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--muted`, `--accent`, `--good`, `--bad`, `--warn`, `--info`, Datenalter `--fresh`/`--ok`/`--old`; Abstände `--s1`–`--s6`; Radien `--r-s`/`--r-m`/`--r-l`. Kontraste wurden für Text auf Flächen auf WCAG AA ausgelegt.
