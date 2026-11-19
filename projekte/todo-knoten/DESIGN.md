# DESIGN: Knoten

## Prinzip
Ruhig, dicht, schnell. Eine Akzentfarbe (Indigo), Zustandsfarben nur für Bedeutung: Grün = erledigt, Bernstein = blockiert, Rot = überfällig/hohe Priorität.

## Tokens (in `:root`, Dunkel per `prefers-color-scheme` und Umschalter `data-theme`)
| Token | Hell | Dunkel |
|---|---|---|
| --bg | #f6f7f9 | #0f1115 |
| --surface | #ffffff | #171a21 |
| --text | #1b1f27 | #e7e9ee |
| --muted | #5d6573 | #9aa3b2 |
| --border | #e2e5ea | #2a2f3a |
| --accent | #4f46e5 | #8b85ff |
| --ok | #15803d | #4ade80 |
| --warn | #b45309 | #fbbf24 |
| --danger | #c62828 | #f87171 |

Schrift: Systemschrift (`system-ui`), 15 px Basis, Abstände in 4er-Schritten, Radius 8 px.

## Layout
- Desktop: Kopfzeile (Name, Ansicht Liste/Graph, Suche, Menü) · linke Filterleiste · Mitte Liste/Graph · rechts Detailbereich (360 px), wenn eine Aufgabe gewählt ist.
- Handy: Filter als horizontale Chips, Detailbereich als Vollbild-Blatt von unten.
- Listenzeile: Aufklapp-Pfeil · runder Haken · Titel · Badges (Fortschritt, Fälligkeit, Tags, Schloss bei Blockade).
