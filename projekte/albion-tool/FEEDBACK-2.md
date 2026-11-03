# Feedback 2: Übersicht und Specs (2026-11-03)

## Wunsch von Turan
Die Seite war zu voll, man hatte kaum Überblick. Specs sollen eintragbar sein, weil sie den Fokusverbrauch ändern. Übersichtlicher und benutzerfreundlicher, ohne Funktionen wegzulassen, gern mit Kacheln.

## Analyse Fokus und Specs
- Fokuskosten = Grundkosten × 0,5^(FCE ÷ 10.000). FCE ist die Summe aller passenden Specs: Stufe × Bonus je Stufe.
- Die Bonuswerte stehen in den Spieldaten (`achievements.json`, Bonus „…focuscostreduction“, gültig für Item-Muster und Tier-Bereich). Beispiele: Meisterschaft 30/Stufe auf den ganzen Baum; eigene Item-Spec 250 (Taschen 310) + 30 auf alle Items im Baum; Artefakt-Specs 15 gemeinsam; Refining-Spec 250 nur für ihr Tier, 30 für die anderen Tiers; Farming 100 (Baum) bzw. 200 (Pflanze/Tier).
- Beispiel: Arkanstab-Meisterschaft 100 + Arkanstab-Spec 100 = 31.000 FCE → Fokus nur noch 11,7 %.
- 371 Specs mit Fokus-Rabatt werden jetzt beim Datenbau eingelesen, mit deutschen Namen aus `localization.xml`.

## Umgesetzt
- Neuer Bereich „Mein Charakter“: alle Specs gruppiert und durchsuchbar, Konto-Einstellungen. Die Kopfzeile zeigt nur noch einen kleinen Status (Server · Premium · Anzahl Specs) und Hell/Dunkel.
- Crafting in Kacheln: Item-Kachel (Tier und Verzauberung als Knöpfe, Suche eingeklappt) → vier Ergebnis-Kacheln → Standort / Fokus & Specs / Markt → Material-Kacheln (Unterrezepte eingerückt) → Verkauf / Einkaufsliste. Seltene Optionen eingeklappt.
- In „Fokus & Specs“ stehen nur die Specs, die für das gewählte Item zählen, mit direkter Eingabe und Vorher/Nachher-Fokus.
- Markt: vier Unterbereiche als Kacheln (Städtevergleich, Handelsrouten, Profit-Scanner, Preisverlauf), immer nur einer offen.
- Insel: Ergebnis-Kacheln oben, Einstellungen eingeklappt, jeder Plot als Kachel mit Gewinn oben rechts, Tabelle und Specs eingeklappt. Farming-FCE aus den Specs je Pflanze/Tier.
- Alle bisherigen Funktionen bleiben (Lager, selbst herstellen, Rezeptvarianten, Qualität, eigene Preise, Fokus-Vergleich, Planer, Kopieren, manuelle FCE).

## Geprüft
- `npm test`: 11/11 grün, neuer Test für Spec-FCE.
- Browser-Test 1440 px und 375 px: keine Konsolenfehler, kein horizontales Scrollen, kompletter Ablauf Crafting → Specs → Markt → Insel → Planer.

## Offen
- Spec-Werte bitte einmal im Spiel gegen die angezeigten Fokuskosten prüfen (z. B. eine Tasche mit eurer echten Spec).
