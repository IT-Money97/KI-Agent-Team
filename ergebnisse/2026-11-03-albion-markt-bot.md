# Albion Markt-Verkaufstool: Kurzanleitung

Ordner: `projekte/albion-markt-bot/`. Das Tool klickt für dich auf `Sell`, liest den
Average Price (24 h, sonst 7 Tage, sonst 4 Wochen), tippt ihn ohne Komma ins Preisfeld und
klickt `Create`. Das wiederholt es für alle Items in „Sell from Inventory“.

> Achtung: Klick-Automatik ist in Albion verboten. Bann-Risiko liegt bei dir.

## Einmalig einrichten
1. Repo-Ordner `projekte/albion-markt-bot` auf deinen Windows-PC kopieren (oder Repo klonen).
2. `start.bat` doppelklicken. Beim ersten Start installiert es die Python-Pakete und fragt,
   ob Tesseract-OCR (Texterkennung) installiert werden soll: mit **J** bestätigen. Gibt es auf
   dem PC kein `winget`, öffnet sich die Download-Seite: dort das Windows-64-bit-Setup laden,
   installieren (immer Weiter) und `start.bat` neu starten.
   Fehlt Python: `winget install Python.Python.3.12`, danach `start.bat` erneut starten.
3. Albion im **Fenster- oder randlosen Modus** starten, Marktplatz öffnen, Reiter
   „Sell from Inventory“.

## Kalibrieren (Menü 1)
Du fährst mit der Maus auf die genannte Stelle und drückst **F9**. Reihenfolge:
1. erster `Sell`-Button, 2. zweiter `Sell`-Button
3. selbst auf den ersten `Sell` klicken, damit das Verkaufsfenster aufgeht, dann F9
4. `24 hours`, 5. `7 days`, 6. `4 weeks`
7. Bereich um die Zahl hinter **Average Price** (obere linke Ecke F9, untere rechte Ecke F9).
   **Nur die Ziffern**, die Silbermünze davor weglassen.
8. Mitte des Preisfelds
9. Bereich um die Zahl im Preisfeld (nur Ziffern, ohne „% above average“)
10. `Create`, 11. das X oben rechts am Verkaufsfenster

Danach zeigt das Tool, welche Zahlen es liest. Stimmen sie mit dem Spiel, passt alles.
Neu kalibrieren nur, wenn du Auflösung, UI-Größe oder Fensterposition änderst.

## Benutzen
- **Menü 2, OCR-Test:** Verkaufsfenster öffnen, das Tool liest nach 5 Sekunden die Preise vor.
- **Menü 3, Testlauf:** macht alles außer `Create` und schreibt ins Protokoll, was es eingestellt
  *hätte*. Damit zuerst prüfen!
- **Menü 4, START:** stellt wirklich ein. Nach dem Start 5 Sekunden Zeit, ins Spiel zu wechseln.
- **Stopp:** jederzeit **F8**, oder Maus in die linke obere Bildschirmecke.

## Gut zu wissen
- Alle Einstellungen landen in `verkaeufe.log` (Uhrzeit, Preis, Zeitraum).
- Items ohne lesbaren Preis überspringt das Tool und legt ein Bild in `debug/` ab.
- Weicht der Durchschnitt mehr als das 3-Fache vom vorgeschlagenen Preis ab, wird das Item
  übersprungen (Schutz vor Lesefehlern). Einstellbar in `config.json` (`plausi_faktor`).
- Ist das Spiel langsam, die Pausen in `config.json` erhöhen (z. B. `pause_nach_tab` auf 1.5).
- Verkaufte Items verschwinden aus der Liste, die nächsten rutschen nach oben. So läuft das Tool
  durch das ganze Inventar, ohne zu scrollen. Es hört erst auf, wenn 5 Items in Folge
  übersprungen wurden (die blockieren dann die sichtbaren Zeilen).
