# Feedback Runde 1 – UX-Test „Albion Werkbank“

Getestet am 03.11.2026 als kritischer Nutzer, nicht als Code-Prüfer. Der Server lief lokal auf Port 4180. Die Marktdaten kamen aus Fake-Daten (Playwright fängt `/api/market/*` ab), deshalb sind Preise und Gewinne nur Beispiele. Rechenwege und Bedienung sind aber echt.
Geprüft habe ich bei 1440 px und 375 px, hell und dunkel. Die Prüfung lief aus der Sicht von vier Personen: Crafter („lohnt sich die T6-Tasche in Brecilien mit Fokus?“), Neuling, Inselbesitzer und Händler.

Screenshots liegen unter `/tmp/claude-0/-home-user-KI-Agent-Team/46cf0879-9dc9-54f5-9959-c43e9868bddb/scratchpad/e2e/ux/` (unten mit `ux/` abgekürzt). Die Skripte heißen `run.cjs` und `ux1.cjs` und liegen im selben Ordner `e2e/`.

---

## Zuerst das Lob (bitte nicht kaputtverbessern)

**L1. Der Rechenkern stimmt fachlich, und man kann ihn nachvollziehen.**
Ich habe nachgerechnet, alles passt:
- Rückgabequote in einer normalen Stadt: 15,3 % (Tasche in Fort Sterling).
- Kiefernplanken in Fort Sterling mit Spezialisierung: 36,7 %, mit Fokus 53,9 %.
- T6-Tasche in Brecilien mit Fokus: 47,9 % (18 + 15 + 59 = 92 % Produktionsbonus).
- Gebühren beim Verkaufsauftrag mit Premium: 4 % + 2,5 % = 6,5 %. Das ergibt 22.653 auf 348.500 Silber.
- Ohne Premium und bei Sofortverkauf: 8 %.
- Rezepte: T4- und T6-Tasche je 8 Stoff + 8 Leder, Planken 2 Holz + 1 Planke der Vorstufe.
- Es wird korrekt aufgerundet (127 statt 126,6).

Die Box „Rückgabequote“ zeigt jeden Bonus einzeln (Stadt, Spezialisierung, Fokus). Das schafft Vertrauen, kein Konkurrenz-Tool macht das so offen.

**L2. Die Ergebnisseite beantwortet die Kernfrage des Crafters.**
Ganz oben stehen Gewinn, Gewinn je Item, Marge, Kosten und Fokus mit „Silber je Fokus“. Darunter folgen die Materialtabelle mit „Im Lager“ und „selbst herstellen“ als Unterbaum, eine Einkaufsliste mit „Liste kopieren“ und der Button „In Planer übernehmen“.

**L3. Das Alter der Preise ist überall farbig markiert** („vor 1 Std.“ grün). Bei Community-Daten ist das Pflicht, und es ist gut gelöst.

**L4. Der Planer bündelt die Einkaufsliste je Stadt und rechnet den Fokusbedarf in Tagen.** Dazu kommt ein Backup per Export und Import. Das ist echter Mehrwert.

**L5. Der Insel-Planer erklärt seine Annahmen** („So wird gerechnet“, „Premium-Ertragsfaktor 2 – Community-Wert, im Spiel prüfen“). Ehrlich und gut.

**L6. Der Profit-Scanner im Markt ist das stärkste Feature für Händler und Crafter.** Er zeigt alle Taschen T4–T8 inklusive .1 nach Gewinn sortiert, mit „Öffnen“ direkt im Rechner.

---

## Verbesserungen (wichtigste zuerst)

### 1. Handy: Im Crafting-Rechner lässt sich die Seite seitlich verschieben, wichtige Spalten sind abgeschnitten – **Muss**
- **Beobachtung:** Bei 375 px ist die Seite 590 px breit. Das Feld „Alle Kategorien“ ragt rechts aus der Karte. In der Materialtabelle sieht man nur Material, Brutto, Nach Rückgabe und Im Lager. Preis/Stück, Kosten und „selbst“ liegen außerhalb des Bildschirms. Screenshot: `ux/b-t6bag-375-dark.png`.
- **Warum es stört:** Am Handy wackelt die ganze Seite seitlich. Gerade die Kosten und den Schalter „selbst herstellen“ findet man nicht.
- **Vorschlag:**
  - Suchfeld und Kategorie untereinander stellen (`flex-wrap`, Select mit `max-width:100%`).
  - Die Materialtabelle unter 600 px als Karten je Material darstellen (Name oben, darunter Brutto → netto, Preis, Kosten, Lager, „selbst“).
  - Nach dem Fix `scrollWidth === innerWidth` in jeder Ansicht testen.

### 2. Handy: Bei den Handelsrouten fehlt der Gewinn – **Muss**
- **Beobachtung:** Bei 375 px zeigt „Handelsrouten“ nur Item, Kaufen in und Verkaufen in. Einkauf, Verkauf, Gewinn/Stück, Rendite und Datenalter sind abgeschnitten. Im Städtevergleich sieht man nur 2 von 8 Städten. Screenshot: `ux/market-375.png`.
- **Warum es stört:** Der Händler steht im Spiel an der Bank und will am Handy schnell nachsehen, welche Route sich lohnt. Genau diese Zahl fehlt.
- **Vorschlag:** Je Route eine kompakte Zeile oder Karte, zum Beispiel „Tasche T4 · Caerleon → Black Market · +1.637 (47 %) · vor 1 Std.“. Den Städtevergleich auf dem Handy für ein Item als senkrechte Liste der Städte zeigen.

### 3. Standort-Auswahl mit rund 250 Einträgen, viele davon kryptische Codes – **Muss**
- **Beobachtung:** Das Dropdown „Standort“ enthält zuerst die 10 Städte. Danach folgen rund 100 Einträge „TNL-154“, „TNL-354“ … und noch einmal rund 100 „Insel bei TNL-…“, dann 30 Hideouts.
- **Warum es stört:** Niemand weiß, was „TNL-376“ ist. Am Handy wird das zu einer endlosen Scrollliste. Der Inselbesitzer findet „Insel bei Lymhurst“ erst nach langem Suchen.
- **Vorschlag:**
  - Mit `<optgroup>` gruppieren: Königsstädte, Rasts, Inseln, Hideouts.
  - TNL-Codes ausblenden, mit Klarnamen versehen oder hinter „Weitere Orte …“ legen.
  - Den Ort zusätzlich durchsuchbar machen.

### 4. Startansicht: In der Suchliste stehen rohe Spiel-IDs und Zufallseinträge – **Muss**
- **Beobachtung:** Beim ersten Öffnen ist die Suche leer, trotzdem steht schon eine Liste da: „Arenasiegel“, „Einfache Fischsauce“, „QUESTITEM_CARAVAN_TRADEPACK_CAERLEON_HEA…“ (abgeschnitten). Vorausgewählt ist Kiefernplanken. Screenshot: `ux/craft-empty-1440.png`.
- **Warum es stört:** Der erste Eindruck ist „unfertig/Datenmüll“. Der Neuling weiß nicht, was er tun soll.
- **Vorschlag:**
  - Quest- und Tradepack-Items herausfiltern, ebenso alles ohne Übersetzung.
  - Bei leerer Suche „Beliebt“ zeigen (Taschen, Planken, Stoff, Leder, Barren, Eintöpfe) oder „Zuletzt benutzt“.
  - Einen kurzen Hinweis anzeigen: „Item suchen, z. B. Tasche, Planken, bag“.

### 5. Kauf- und Verkaufsstadt folgen dem Standort nicht und sind leicht zu übersehen – **Sollte**
- **Beobachtung:** Ich stelle den Standort auf Brecilien. Gekauft und verkauft wird trotzdem in Martlock (Standard), steht aber weit unten in Karte 3. Das Ergebnis nennt nur „Preis je Stück in Martlock“.
- **Warum es stört:** Der Crafter glaubt, er sieht den Gewinn für „Brecilien“. In Wahrheit sind Martlock-Preise eingerechnet. Das ist die häufigste Quelle für falsche Entscheidungen.
- **Vorschlag:**
  - Beim Wechsel des Standorts anbieten: „Auch in Brecilien kaufen/verkaufen?“ (`marketCityForLocation` gibt es schon).
  - Im Ergebnis-Kopf eine Zeile zeigen: „Herstellen: Brecilien · Material: Martlock · Verkauf: Martlock (Auftrag)“.

### 6. Fokus hat keinen Silberpreis, und der Vergleich mit/ohne Fokus fehlt – **Sollte**
- **Beobachtung:** Mit Fokus zeigt die T6-Tasche 1.156.721 Silber Gewinn bei 262.600 Fokus. Das sind 4,4 Silber je Fokus, das ist gut. Fokus selbst kostet aber nichts. In den Einstellungen gibt es zwar `focusValue`, dafür aber kein Eingabefeld. „Lohnt es sich *mit* Fokus?“ beantwortet das Tool nicht direkt.
- **Warum es stört:** Fokus ist knapp (10.000 pro Tag). Der Spieler muss selbst rechnen, wie viel mehr der Fokus bringt und ob er ihn besser anders einsetzt.
- **Vorschlag:**
  - Kennzahl „Gewinn ohne Fokus → mit Fokus (+X Silber, Y Silber je Fokus)“ nebeneinander zeigen.
  - Ein optionales Feld „Was ist dir 1 Fokus wert?“ anbieten (Wert wird schon verrechnet).
  - Den Fokusbedarf zusätzlich in Tagen angeben („26 Tage Fokus“). Bei 262.600 Fokus würde das sofort auffallen.

### 7. Neulinge verstehen die Fachbegriffe nicht, und Hilfe gibt es nur per Tooltip – **Sollte**
- **Beobachtung:**
  - RRR, PB, FCE, „Nährwert“, „Sell-Angebote“, „Kaufauftrag“ und „Brutto/Nach Rückgabe“ werden ohne Erklärung benutzt.
  - Die Formel „RRR = PB ÷ (1 + PB)“ steht in der Rückgabe-Box.
  - Hilfen gibt es nur als `title`-Tooltip. Auf dem Handy gibt es kein Hover, also sind sie dort unsichtbar.
  - Es gibt kein `<details>` und kein Glossar.
- **Warum es stört:** Die Person „Neuling“ steigt hier aus und kehrt zu einem Video-Guide zurück.
- **Vorschlag:**
  - Kleine „?“-Buttons mit Popover (antippbar) an Rückgabequote, FCE, Stationsgebühr, Einkaufs- und Verkaufsart.
  - Ein Glossar im Footer.
  - Die Formel nur in einem aufklappbaren „Wie gerechnet?“ zeigen.
  - Ausgeschrieben statt Abkürzung: „Rückgabequote (RRR): so viel Material bekommst du im Schnitt zurück“.

### 8. Insel: Der Fokus wird verbrannt, ohne dass das Tool warnt – **Sollte**
- **Beobachtung:** „Mit Fokus gießen“ ist standardmäßig an. Die Möhren-Farm verbraucht 9.000 Fokus (90 % des Tages), um 9 Samen zu je ~9 Silber zu sparen. Der Gewinn ändert sich praktisch nicht. In der Saatgut-Zeile steht „−0“ als Wert. Screenshot: `ux/island-1440.png`.
- **Warum es stört:** Der Inselbesitzer sieht nicht, dass das eine schlechte Fokus-Nutzung ist. Im Crafting-Rechner gibt es „Silber je Fokus“, hier nicht. „−0“ wirkt fehlerhaft.
- **Vorschlag:**
  - Je Plot „Silber je Fokus“ zeigen und eine Warnung, wenn der Wert unter z. B. 1 liegt.
  - Fokus standardmäßig aus, oder Vergleich mit/ohne Fokus wie in Punkt 6.
  - „−0“ als „0“ ausgeben.
  - Die Fokuskosten von pauschal 1000 je Feld für alle Pflanzen und Tiere im Spiel gegenprüfen. Das wirkt verdächtig einheitlich.

### 9. Handy: Der Kopfbereich ist 191 px hoch, der Tab „Planer“ ist abgeschnitten – **Sollte**
- **Beobachtung:** Bei 375 px stehen Server, Premium, Sprache und Theme über den Tabs. Der Tab „Planer“ ist nur als „P…“ sichtbar, und man erkennt nicht, dass die Leiste seitlich scrollt.
- **Warum es stört:** Ein Viertel des Bildschirms ist Kopfbereich. Den Planer findet man am Handy kaum.
- **Vorschlag:**
  - Die Einstellungen (Server, Premium, Sprache, Theme) hinter ein Zahnrad legen.
  - Die vier Tabs als feste Leiste unten am Daumen (Bottom-Tab-Bar) oder gleich breit in einer Zeile.

### 10. Kennzahlen vor dem Laden der Preise führen in die Irre – **Sollte**
- **Beobachtung:** Ohne Preise zeigt die Kachel „Kosten gesamt“ 540 (nur die Stationsgebühr) und „Fokus 0“, daneben „Gewinn: Preise fehlen“. Ich muss dann bis ganz unten in Karte 3 scrollen, um „Marktpreise laden“ zu finden.
- **Warum es stört:** 540 Silber Kosten für 100 Planken sieht wie ein Ergebnis aus, ist aber keins. Der wichtigste Button ist auf dem Desktop am weitesten vom Ergebnis entfernt.
- **Vorschlag:**
  - Preise beim Öffnen und beim Item-Wechsel automatisch laden (mit Cache).
  - Oder den Button „Marktpreise laden“ direkt in die Ergebnis-Karte setzen.
  - Solange Preise fehlen, „Kosten gesamt“ als „–“ oder „mind. 540“ zeigen.

### 11. Das Farbschema folgt der Systemeinstellung nicht – **Kann**
- **Beobachtung:** Mit `prefers-color-scheme: light` startet die App trotzdem dunkel. Der helle Modus selbst sieht gut aus (warmes Beige, gut lesbar, `ux/c-t6bag-toggled-1440-light.png`).
- **Vorschlag:** Beim ersten Start die Systemeinstellung übernehmen und die Wahl des Nutzers merken.

### 12. Die Meldungsbox verdeckt Inhalte – **Kann**
- **Beobachtung:** „3 Marktdatensätze geladen.“ erscheint mittig unten. Am Handy liegt sie über der Fokus-Kachel, am Desktop über den Buttons der Einkaufsliste und dem Footer.
- **Vorschlag:** Die Box kürzer anzeigen und an den Rand setzen (rechts unten, am Handy über der Tab-Leiste). Oder die Rückmeldung direkt am Button geben („✓ geladen“).

### 13. Handelsrouten: Filter fehlen, Schwarzmarkt-Routen sind nicht plausibel – **Kann**
- **Beobachtung:**
  - Es gibt eine lange Liste ohne Filter nach Mindestgewinn, Mindestrendite, Budget oder Datenalter.
  - Routen wie „Kiefernplanken → Black Market“ oder „Ziegeneintopf → Black Market“ tauchen auf. Der Schwarzmarkt kauft aber nur Ausrüstung. Mit Fake-Daten aufgefallen; die echte API liefert dafür vermutlich nichts, man sollte es aber absichern.
  - Die Spalte Silber/kg ist eine sehr gute Idee.
- **Vorschlag:**
  - Filterleiste mit Mindestgewinn/Stück, Rendite in %, „nur frische Daten (< 3 Std.)“ und Budget.
  - Black Market nur für Ausrüstung als Ziel zulassen.
  - Optional ein Hinweis auf das Handelsvolumen (Ø Menge/Tag aus dem Verlauf), damit niemand 500 Stück einer Ware kauft, von der täglich 5 verkauft werden.

---

## Kurzliste

**Muss:** 1 (Handy-Layout Crafting), 2 (Handy-Layout Handelsrouten), 3 (Standortliste), 4 (Startliste mit Roh-IDs)
**Sollte:** 5 (Kauf- und Verkaufsstadt), 6 (Fokus mit/ohne und Silberwert), 7 (Begriffe für Neulinge), 8 (Fokuswarnung auf der Insel), 9 (Kopfbereich am Handy), 10 (Kennzahlen vor dem Laden der Preise)
**Kann:** 11 (Systemfarbschema), 12 (Meldungsbox), 13 (Filter bei Handelsrouten, Schwarzmarkt)
