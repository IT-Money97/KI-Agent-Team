# Albion Werkbank

Lokales Planungstool für Albion Online: Crafting- und Refining-Rechner, Marktanalyse mit Städtevergleich, Handelsrouten und Profit-Scanner, Insel-Planer für Farm, Kräutergarten, Weide und Zwinger sowie ein Planer mit gemeinsamer Einkaufsliste.

Alles läuft auf deinem eigenen PC. Es gibt kein Konto und kein Tracking. Deine Einstellungen und Pläne bleiben im Browser.

## Starten

1. [Node.js](https://nodejs.org) ab Version 18 installieren (einmalig).
2. **Windows:** `start.bat` doppelklicken. **Mac/Linux:** `./start.sh` im Terminal ausführen.
3. Der Browser öffnet sich mit `http://127.0.0.1:4173`. Falls nicht, die Adresse selbst öffnen.

Zum Beenden das Fenster schließen oder Strg+C drücken. Ein anderer Port geht mit `PORT=4174 node server.js`.

Die Datei `index.html` bitte nicht direkt öffnen: Der lokale Server wird für Marktpreise gebraucht.

## Was kann die Werkbank?

Die Seite ist in Kacheln aufgebaut: oben das Ergebnis (Gewinn, Marge, Rückgabe, Fokus), darunter die Einstellungen, die Materialien und Verkauf/Einkauf. Seltener gebrauchte Optionen sind eingeklappt („▸ …“), es fehlt aber keine Funktion.

### Mein Charakter
- **Specs (Destiny Board)** eintragen: Stufe 0–100 je Spec, gruppiert nach Baum, mit Suche (z. B. „Planken“, „Tasche“, „Ziege“). Die Werte bleiben im Browser.
- Daraus berechnet die Werkbank für jedes Item die **Fokuskosten-Effizienz (FCE)** automatisch, für Crafting, Refining und Insel. Die Bonuswerte kommen direkt aus den Spieldaten (`achievements.json`).
- Konto: Server, Premium, Sprache der Itemnamen, Hell/Dunkel, Fokus pro Tag, Wert eines Fokuspunkts.

### Crafting & Refining
- Item suchen (deutsch oder englisch), Tier, Verzauberung und Rezeptvariante wählen. Alle Rezepte kommen aus den Spieldaten, auch Chargengrößen (z. B. 10 Mahlzeiten, 5 Tränke, 18 Fleisch je Schlachtung).
- Standort wählen: Die **Rückgabequote** wird automatisch berechnet (Stadtbonus, Stadt-Spezialisierung, Fokus, Tagesbonus, Insel, Hideout). Die Aufschlüsselung steht direkt darunter.
- Fokusbedarf aus deinen Specs: Die Kachel „Fokus & Specs“ zeigt die Specs, die für das gewählte Item zählen, zum direkten Eintragen. FCE kann auch manuell eingetragen werden. Stationsgebühr aus dem Item-Wert.
- Lagerbestand je Material eintragen, Zutaten mit „selbst“ selbst herstellen lassen (z. B. ganze Refining-Kette T2 → T4).
- Marktpreise laden oder eigene Preise eintragen. Fehlende Preise werden gelb markiert, der Gewinn heißt dann „vorläufig“.
- Einkaufsliste kopieren oder als Plan speichern.

### Suche
Deutsch oder englisch, mit Tier und Verzauberung: „t5 tasche“, „planken 6.1“, „Großmeister Tasche“, „T4_BAG@1“. Umlaute gehen auch ohne Punkte („grossmeister“).

### Markt
Vier Unterbereiche als Kacheln, damit immer nur einer offen ist:
- **Städtevergleich**: günstigstes Angebot und höchstes Kaufgebot je Stadt, farbig nach Alter der Daten.
- **Handelsrouten**: wo kaufen, wo verkaufen (auch Schwarzmarkt), Gewinn nach Steuern, Rendite und Silber je kg.
- **Profit-Scanner**: rechnet eine ganze Kategorie (z. B. alle Taschen T4–T8, .0–.1) mit deinen Crafting-Einstellungen durch und sortiert nach Gewinn je Stück.
- **Preisverlauf** der letzten Wochen je Stadt.

### Insel
- Gebäude anlegen (Farm, Kräutergarten, Weide, Zwinger), Saatgut oder Tier wählen, Felder und Durchgänge einstellen.
- Ernte, Samenrückgabe, Nachwuchs, Futterbedarf (Lieblingsfutter zählt doppelt), Tierprodukte (Milch, Eier, Wolle …), Schlachten, Fokus und Gewinn pro Tag.
- Insel-Standort berücksichtigt die +10 %-Ertragsboni der Stadt.
- Jeder Plot ist eine Kachel mit Gewinn oben rechts; die Kosten-/Erlös-Tabelle ist eingeklappt. Fokuskosten kommen aus deinen Farming-Specs.
- **Anzahl Tiere / bepflanzte Felder** frei eingeben (z. B. 5 Pferde auf einer Weide mit 9 Feldern).
- Ausgewachsene Tiere **verkaufen, schlachten oder satteln** (Reitpferd, Gepanzertes Pferd, Transportochse …). Beim Satteln rechnet die Werkbank Material, Menge und Kosten mit.
- **Empfehlung**: Alle Wege werden mit Marktpreisen verglichen, z. B. „Pferd roh verkaufen bringt mehr als satteln“.
- Jeden Posten per Häkchen ein- oder ausschließen (z. B. selbst gezüchtete Jungtiere, eigenes Futter).

### Planer
- Gespeicherte Crafting- und Insel-Pläne zusammenfassen: Einkaufsliste je Stadt, Fokus gesamt, Gewinn.
- Backup als JSON exportieren und auf einem anderen PC importieren.

## Rechenmodell

| Größe | Formel | Quelle |
|---|---|---|
| Rückgabequote | PB ÷ (1 + PB), PB = Standort + Spezialisierung + Fokus 59 % + Tagesbonus | Spieldaten (`craftingmodifiers`, `gamedata`) |
| Stadtbonus | 18 % Herstellen/Veredeln in Städten, +40 % Veredeln in der Ressourcenstadt, +15 % Spezialisierung, Insel 0 % | Spieldaten |
| Material | Anzahl × Herstellungen × (1 − RRR); Artefakte, Token, Tiere usw. ohne Rückgabe | Spieldaten (`maxreturnamount`) |
| Fokus | Basis × 0,5^(FCE ÷ 10.000) | Community-Formel |
| FCE aus Specs | Σ Stufe × Bonus je Stufe, z. B. Meisterschaft 30, eigene Item-Spec 250 + 30 gemeinsam, Artefakt-Specs 15 gemeinsam, Refining-Spec 250 nur für ihr Tier, Farming 100/200 | ao-bin-dumps `achievements.json` |
| Stationsgebühr | Item-Wert × 0,1125 × Gebühr ÷ 100 | Community-Formel |
| Verkauf | Preis − 4 % Steuer (8 % ohne Premium) − 2,5 % Einstellgebühr bei Aufträgen | Spieldaten |
| Ernte | Ø Lootliste × Premiumfaktor (Standard 2) × (1 + Inselbonus) | Spieldaten + Community-Wert |
| Samen/Nachwuchs | Grundchance (+ halber Fokusbonus mit Fokus = 100 % bei allen Pflanzen und Nutztieren) | Spieldaten |
| Futter | Nährwertbedarf ÷ Nährwert (Lieblingsfutter × 2) | Spieldaten |

Alle Ergebnisse sind Erwartungswerte. Zufall, Preisänderungen und Spielpatches können abweichen. Wichtige Entscheidungen bitte im Spiel gegenprüfen.

## Daten

- **Spieldaten** stammen aus den [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps) und liegen fertig in `public/data/gamedata.json`. Nach einem Spielpatch unten in der App auf „Spieldaten aktualisieren“ klicken oder `npm run update-data` ausführen (lädt ca. 45 MB von GitHub).
- **Marktpreise** kommen vom [Albion Online Data Project](https://www.albion-online-data.com/). Dort landen nur Preise, die Spieler mit dem Data-Client im Spiel angesehen haben. Ein fehlender Preis ist kein Preis von 0. Wer mithelfen will, installiert den Albion Data Client.
- Der lokale Server hält die Abruflimits des Data Project ein (max. 150 Anfragen pro Minute) und speichert Antworten kurz zwischen.

## Für Entwickler

```
npm test            # Rechenkern-Tests (node:test)
npm run update-data # Spieldaten neu bauen
npm start           # Server ohne Browser-Öffnen
```

Kein Build-Schritt, keine Abhängigkeiten. Aufbau siehe `../ARCHITEKTUR.md`.

Albion Werkbank ist ein unabhängiges Fan-Tool und nicht mit Sandbox Interactive verbunden.
