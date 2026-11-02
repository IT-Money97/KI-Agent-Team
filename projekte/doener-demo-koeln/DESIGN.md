# DESIGN

**Markenwirkung:** warm, schnell, ehrlich.

**Moodboard:** Holzkohlegrill, rote Paprika, frisches Fladenbrot, Kölner Straßenecke am Abend. Kräftiges Rot-Orange auf warmem Cremeweiß, im Dunkelmodus auf fast schwarzem Grillrost-Grau.

**Farben** (siehe `site/src/styles/tokens.css`), Kontrast WCAG AA geprüft:
- Akzent Glut-Rot `#b3261e` hell / `#ff8a65` dunkel: Appetitfarbe der Branche, für Buttons und Preise.
- Hintergrund Cremeweiß `#fffaf3` / `#17120f`: wärmer als reines Weiß, wirkt nach Essen statt nach Büro.
- Grün nur für „Jetzt geöffnet": sofort verständliches Signal.

**Typografie:** Systemschriften (keine Webfonts, schnell und DSGVO-sicher). Überschriften fett und groß (clamp 2–3.5 rem), Fließtext 1.0625 rem für ältere Besucher.

**Abstände/Radien:** Skala 4/8/16/24/40/64 px; Radius 12 px für Karten, 999 px für Buttons (freundlich, gut als Daumenziel).

**Layout (mobil zuerst):**
1. Demo-Hinweisleiste (immer sichtbar oben).
2. Hero: Name, „Döner, Dürüm & Lahmacun in Köln-Ehrenfeld", Geöffnet-Status, Buttons „Anrufen" (primär) und „Route".
3. Speisekarte in Kategorien, Preise rechts, Allergene als Kürzel mit Legende.
4. Öffnungszeiten (heutiger Tag hervorgehoben).
5. Standort und Kontakt.
6. Footer mit Impressum/Datenschutz.
7. Mobil: Sticky-Leiste unten (Anrufen, Route, Karte), weil der Daumen dort ist.

**Bildkonzept:** Bis echte Fotos vorliegen, keine Stockfotos (verwechselbar, Lizenzfragen), sondern eine gezeichnete SVG-Illustration. Kunde liefert: Außenansicht, Drehspieß, 3–4 Gerichte, Team (optional), Logo.
