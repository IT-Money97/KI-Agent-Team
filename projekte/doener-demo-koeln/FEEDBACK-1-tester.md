# FEEDBACK Runde 1 – UX-Tester

Getestet mit Playwright bei 375, 768 und 1440 px, hell und dunkel (Screenshots in `screenshots/`). Kein horizontales Scrollen in allen Breiten.

## Gut, bitte so lassen
- In 5 Sekunden klar: Name, „Döner … in Köln-Ehrenfeld", grüner Status „Jetzt geöffnet · bis 23:00 Uhr". Genau das will der hungrige Besucher wissen.
- Sticky-Leiste unten mit „Anrufen" in Akzentfarbe: liegt am Daumen, große Tap-Ziele (60 px).
- Heutiger Tag in den Öffnungszeiten markiert, Dunkelmodus wirkt warm statt grau.
- Allergene eingeklappt: stört nicht, ist aber da.

## Punkte
| # | Beobachtung | Warum es stört | Vorschlag | Prio |
|---|---|---|---|---|
| 1 | Preise als „0,00 €" | Besucher denkt „gratis?" oder „kaputt" | Neutraler Platzhalter „x,xx €" | Muss |
| 2 | Auf dem Handy kein Bild im Hero | Döner verkauft sich über Appetit; reiner Text wirkt nüchtern | Mit echten Fotos des Kunden ein großes Hero-Foto (mobil oben) | Sollte (nach Fotolieferung) |
| 3 | Drei Buttons im Hero, „Speisekarte" doppelt zur Sticky-Leiste | Leicht überladen | Akzeptabel, Desktop hat keine Sticky-Leiste | Kann |
| 4 | Keine Online-Bestellung / Lieferdienst-Link | Moderne Nutzer erwarten „bestellen" | Beim Kunden abfragen (Lieferando, Wolt, eigenes System) | Sollte (Kundenentscheidung) |
| 5 | Kein WhatsApp-Kontakt | Bei Vorbestellungen beliebt | Optional, falls Kunde WhatsApp Business nutzt | Kann |
| 6 | Keine Bewertungen | Vertrauen | Erst mit echten Bewertungen (keine erfundenen) | Kann |
