# Albion Markt-Verkaufstool

Stellt alle Items aus **Sell from Inventory** automatisch als Sell Order ein.
Preis = **Average Price** aus der Market History, Reihenfolge **24 hours → 7 days → 4 weeks**
(der erste Zeitraum, in dem ein Preis steht, gewinnt). Die Zahl wird ohne Komma getippt.

> **Risiko:** Automatische Klicks verstoßen gegen die Nutzungsbedingungen von Albion Online.
> Sandbox Interactive kann den Account dafür sperren. Nutzung auf eigenes Risiko.

## Ablauf pro Item
1. Klick auf den `Sell`-Button der Zeile
2. Klick `24 hours`, Average Price lesen (OCR). Leer? Dann `7 days`, dann `4 weeks`
3. Plausi-Check: Durchschnitt darf höchstens 3× vom vorgeschlagenen Feldpreis abweichen
4. Klick ins Preisfeld, alte Zahl löschen, neue Zahl tippen
5. Klick `Create` (im Testlauf stattdessen Fenster schließen)

Items ohne lesbaren Preis werden übersprungen. Das Tool hört auf, wenn kein roter `Sell`-Button
mehr da ist, wenn alle sichtbaren Zeilen übersprungen wurden oder bei **F8**.

## Dateien
| Datei | Zweck |
|---|---|
| `start.bat` | Einrichtung (venv, Pakete, Tesseract) und Menü |
| `markt_bot.py` | Kalibrierung, OCR-Test, Testlauf, echter Lauf |
| `preis.py` | Bildaufbereitung und Zahlenerkennung (Tesseract) |
| `test_preis.py` | Tests für die Zahlenerkennung |
| `config.json` | entsteht bei der Kalibrierung (nicht im Repo) |
| `verkaeufe.log` | Protokoll aller Einstellungen |
| `debug/` | Bildausschnitte, wenn ein Preis nicht lesbar war |

## Einstellungen in `config.json`
| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `pause_nach_sell` | 1.5 | Sekunden bis das Verkaufsfenster offen ist |
| `pause_nach_tab` | 1.0 | Sekunden bis die Market History nach Tab-Klick geladen ist |
| `pause_nach_create` | 1.5 | Sekunden bis die Liste nach `Create` aktualisiert ist |
| `max_items` | 0 | Höchstzahl Items pro Lauf, 0 = alle |
| `sichtbare_zeilen` | 5 | Sell-Buttons ohne Scrollen |
| `plausi_faktor` | 3.0 | erlaubte Abweichung zum Feldpreis, 0 = aus |
| `farb_toleranz` | 45 | Toleranz der Button-Erkennung |
| `tesseract_pfad` | leer | eigener Pfad zu `tesseract.exe` |

## Annahmen (im Spiel noch zu prüfen)
- Nach `Create` verschwindet das Item aus der Liste, die nächste Zeile rutscht nach oben.
  Bleibt das Fenster offen, schließt das Tool es selbst.
- `Amount` steht beim Öffnen auf dem ganzen Stapel (im Screenshot 2 von 2).
- Ohne Preis zeigt die History keine Zahl oder `0`. Beides gilt als „kein Preis“.
- Albion läuft nicht als Administrator (sonst kommen die Klicks nicht an; dann `start.bat`
  ebenfalls als Administrator starten).

## Tests
```
python test_preis.py
```
Die OCR wurde an den Screenshots aus dem Auftrag geprüft (Average Price 13,250 → 13250,
Preisfeld 15,142 → 15142, alle fünf Est. Market Values korrekt). Wird die Silbermünze mit in
den Bereich gezogen, liest Tesseract z. B. 113250; dagegen hilft der Plausi-Check, besser ist
eine enge Kalibrierung nur um die Ziffern.
