# FEEDBACK Runde 1 – Zusammenfassung Projektleiter

Grundlage: `FEEDBACK-1-tester.md` (UX-Tester) und eigene Prüfung gegen die Akzeptanzkriterien in `PLAN.md`.

| # | Punkt | Prio | Status |
|---|---|---|---|
| 1 | Handy: Seite seitlich verschiebbar, Spalten abgeschnitten | Muss | erledigt: Grid mit `minmax(0,1fr)`, Felder umbrechen, wichtige Spalten (Zu besorgen, Preis, Kosten, Selbst) zuerst; Test ohne horizontales Scrollen bei 375 px |
| 2 | Handy: Gewinn bei Handelsrouten nicht sichtbar | Muss | erledigt: Spalten neu geordnet (Gewinn, Rendite, Datenalter direkt nach Item/Route) |
| 3 | Standortliste mit ~200 TNL-Codes | Muss | erledigt: nur benannte Städte, Rasten, Inseln und Hideouts (deutsche Biomnamen), gruppiert |
| 4 | Startliste mit Quest-/Roh-IDs | Muss | erledigt: Quest-, Tradepack-, Test-Items und Items ohne Übersetzung ausgeblendet; leere Suche zeigt „Beliebt“ |
| 5 | Kauf-/Verkaufsstadt folgt dem Standort nicht | Sollte | erledigt: springt beim Standortwechsel mit (Hinweis), Zeile „Herstellen · Material · Verkauf“ im Ergebnis |
| 6 | Fokus: kein Vergleich, kein Silberwert, keine Tage | Sollte | erledigt: Vergleich mit/ohne Fokus inkl. Silber je Fokuspunkt, Feld „Was ist dir 1 Fokus wert?“, Fokus in Tagen |
| 7 | Begriffe für Neulinge | Sollte | erledigt: aufklappbares Glossar „Begriffe erklärt“ (antippbar, auch am Handy) |
| 8 | Insel: Fokus standardmäßig an, keine Warnung, „−0“ | Sollte | erledigt: Standard aus, „Silber je Fokuspunkt“ je Plot mit Warnung unter 1, „0“ statt „−0“; 1.000 Fokus je Feld als „im Spiel prüfen“ markiert |
| 9 | Handy-Kopfbereich zu hoch | Sollte | erledigt: Einstellungen hinter „⚙ Einstellungen“, vier Tabs gleich breit in einer Zeile |
| 10 | Kennzahlen vor dem Preisladen irreführend | Sollte | erledigt: „Kosten (unvollständig) mind. …“, Button „Marktpreise laden“ direkt im Ergebnis, Preise laden bei Itemwechsel automatisch nach, sobald einmal Preise geladen wurden |
| 11 | Systemfarbschema | Kann | erledigt |
| 12 | Meldungsbox verdeckt Inhalte | Kann | erledigt: rechts unten |
| 13 | Routenfilter, Schwarzmarkt nur Ausrüstung | Kann | erledigt: Mindestgewinn, „nur frische Daten“; Schwarzmarkt nur für Ausrüstung |

Offen (bewusst nicht in Runde 1): Materialtabelle am Handy als Karten statt Tabelle (Tabelle scrollt jetzt innerhalb der Karte), Handelsvolumen in den Routen, Arbeiter (Laborer) auf der Insel.

Abnahme: alle Muss-Punkte erledigt, `npm test` grün (10/10), Browser-Test 1440 px und 375 px ohne Konsolenfehler und ohne horizontales Scrollen.
