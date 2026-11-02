# PLAN: Demo-Webseite „Döner Muster" (fiktiver Dönerladen, Köln-Ehrenfeld)

Rolle: Projektleiter · Stand: 2026-11-02 · Art: interner Testauftrag / Vertriebs-Demo

## Ziel
Eine moderne, mobile One-Page-Webseite für einen Dönerladen, die als Muster für echte Gastro-Kunden in Köln dient. Alle Inhalte sind fiktiv und als Platzhalter markiert.

## Annahmen (statt Rückfragen)
- Name „Döner Muster" ist frei erfunden; kein echtes Geschäft wird dargestellt.
- Zielgruppe: Hungrige Laufkundschaft und Anwohner (18–45), fast ausschließlich mobil, oft unterwegs.
- Hauptaufgaben der Besucher: Speisekarte ansehen, sehen ob geöffnet ist, anrufen, Route starten.
- Keine Online-Bestellung (wäre ein Zusatzangebot, z. B. über Lieferdienst-Link oder eigenes Bestellsystem).
- Preise, Adresse, Telefon, Öffnungszeiten: Platzhalter. Keine erfundenen Bewertungen.

## Seiten / Features
1. Startseite (One-Page): Hero mit Status „jetzt geöffnet/geschlossen", Speisekarte mit Kategorien und Allergen-Hinweis, Öffnungszeiten, Standort mit Google-Maps-Link (kein eingebettetes iFrame wegen DSGVO), Kontakt.
2. Sticky-Aktionsleiste unten auf dem Handy: Anrufen, Route, Speisekarte.
3. Hell/Dunkel-Umschalter (folgt sonst dem System).
4. Impressum und Datenschutz mit klar markierten Platzhaltern.
5. SEO: Title/Description, Open Graph, LocalBusiness-JSON-LD, sitemap.xml, robots.txt (Demo: noindex).

## Tech-Stack
Astro (statisch) mit eigenen CSS-Design-Tokens, Deployment auf Vercel (Hobby, nur Demo).

## Akzeptanzkriterien
- `npm run build` fehlerfrei.
- Lighthouse ≥ 90 in Performance, Accessibility, Best Practices, SEO (SEO-Wert ohne noindex-Abzug bewertet, da Demo absichtlich noindex).
- Kein horizontales Scrollen bei 375 px; Tap-Ziele ≥ 44 px.
- Innerhalb von 5 Sekunden erkennbar: Was (Döner), Wo (Ehrenfeld), Geöffnet?
- Platzhalter sind überall sichtbar als solche markiert, Demo-Hinweis auf jeder Seite.
- Keine externen Ressourcen (Fonts, Bilder, Skripte von Drittanbietern).

## Aufgaben je Rolle
- Architekt: Stack, Struktur, Gerüst. Designer: Tokens, Layout. Frontend: Umsetzung. Backend: entfällt (keine Formulare). UX-Tester: Test 375/768/1440, hell/dunkel.
