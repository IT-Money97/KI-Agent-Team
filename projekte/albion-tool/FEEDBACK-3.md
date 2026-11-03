# Feedback 3: Reittiere, Empfehlungen, Suche (2026-11-03)

## Wunsch von Turan
- Pferde selbst satteln: was braucht man (z. B. Leder), wie viel, was kostet es, was bleibt als Gewinn.
- Alles eingeben können, was man rechnen will.
- Marktsuche findet vieles nicht.
- Insel: Anzahl Tiere eingeben, nicht nur Felder (man nutzt nicht immer alle Felder).
- Empfehlungen, z. B. „Pferde lieber ohne Sattel verkaufen“.

## Recherche (Stand heute)
- Rezepte aus den aktuellen Spieldaten (ao-bin-dumps): Reitpferd = ausgewachsenes Pferd + 20 Leder; Gepanzertes Pferd = Pferd + 10 Stoff + 20 Metallbarren; Transportochse = Ochse + 30 Planken; Transportmammut = Mammut + 20 Leder. Das Tier wird nie zurückgegeben, das Material schon (Rückgabequote).
- Gesattelt wird am Sattler (Stallmeister) in der Stadt oder auf der eigenen Insel. Auf der Insel gibt es ohne Fokus keine Rückgabe.
- Offizielle Hinweise und Spielerforen: Zucht lohnt sich vor allem über den Nachwuchs und mit Premium/Fokus; Pferdepreise schwanken stark, Satteln lohnt nur, wenn das Reittier deutlich mehr bringt als Tier + Material. Darum rechnet die Werkbank alle Wege mit aktuellen Marktpreisen durch, statt eine feste Empfehlung zu geben.
- Neuere Änderungen (2025–2026): Wachstumszeiten auf Inseln und in den Outlands gleich; Drachen-Eier (Feuerschwingen-Drache) im Zwinger; Höllenweber-Jungtiere beim Antiquar. Alles ist in den aktuellen Spieldaten enthalten.

Quellen: albiononline.com/news/guide-farming, forum.albiononline.com (Zucht- und Sattel-Threads), albionfreemarket.com/farming, Patchnotes 2025/2026 (steamdb.info, albiononline.com/update).

## Umgesetzt
- Insel/Weide: Auswahl „Was passiert mit den ausgewachsenen Tieren?“: verkaufen, schlachten, satteln (jedes passende Reittier) oder behalten. Beim Satteln stehen Material, Menge, Preis und Rückgabe in der Tabelle; Fokus beim Satteln zuschaltbar.
- Empfehlung je Tier-Plot: alle Wege mit Marktpreisen, sortiert nach Gewinn, mit Unterschied zu deiner Wahl und Knopf „Empfehlung übernehmen“. „Marktpreise laden“ lädt auch die Preise der Alternativen.
- Crafting: Bei Rezepten mit Tier (Reittiere, Fleisch) zeigt eine Empfehlung, ob Herstellen mehr bringt als das Tier direkt zu verkaufen.
- „Anzahl Tiere“ bzw. „Bepflanzte Felder“ frei eingeben, mit Hinweis wie viele Gebäude das sind und wie viele Felder frei bleiben.
- Jeder Kosten-/Erlösposten hat ein Häkchen „einrechnen“, z. B. selbst gezüchtete Jungtiere oder eigenes Futter weglassen.
- Suche neu: versteht Tier und Verzauberung („t5 tasche“, „planken 6.1“, „Großmeister Tasche“), Umlaute ohne Punkte („grossmeister“), Item-IDs, Spielerbegriffe („Heiltrank“ → Lebenstrank, „Karotte“ → Möhre), bewertet Treffer (echte Items vor Möbeln) und durchsucht alle Items statt nach 40 Treffern abzubrechen. Am Markt mit Kategorie und Tier im Ergebnis.

## Geprüft
- `npm test`: 13/13 grün (neu: Suche, Satteln, Empfehlung, Posten abwählen).
- Browser-Test 1440 px und 375 px: Pferd satteln auf der Insel, Reittier im Crafting, Markt-Suche; keine Konsolenfehler, kein horizontales Scrollen.

## Offen
- Mit echten Marktpreisen auf Turans PC prüfen (Cloud blockiert die Markt-API).
- Reittier-Upgrades (Sättel für Morganas Stute usw.) sind normale Rezepte im Crafting, aber nicht Teil der Insel-Empfehlung.
