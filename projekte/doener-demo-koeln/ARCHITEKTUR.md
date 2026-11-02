# ARCHITEKTUR

- **Stack:** Astro 5 (statische Ausgabe), kein Framework-JS. Einziges Client-Skript: Theme-Umschalter und „Jetzt geöffnet"-Anzeige (wenige Zeilen, inline).
- **Warum kein Tailwind:** Eine Seite mit wenigen Komponenten; eigene CSS-Variablen sind schlanker und halten die Design-Tokens an einer Stelle.
- **Ordner:** `site/src/pages` (index, impressum, datenschutz), `site/src/layouts/Base.astro`, `site/src/components/*`, `site/src/data/laden.ts` (alle Geschäftsdaten zentral, damit ein echter Kunde nur eine Datei anpasst), `site/src/styles/tokens.css`, `site/public` (Favicon, robots.txt).
- **Datenmodell:** `laden.ts` mit Name, Adresse, Telefon, Öffnungszeiten (pro Wochentag), Speisekarte (Kategorien → Gerichte mit Allergen-Kennzeichen).
- **Externe Dienste:** keine. Karte nur als Link zu Google Maps (kein Embed, damit keine Daten ohne Einwilligung übertragen werden).
- **Backend:** nicht nötig.
- **Umgebungsvariablen:** keine zur Laufzeit. Deployment: `VERCEL_TOKEN`.
- **DSGVO:** Systemschriften statt Webfonts, keine Cookies, kein Tracking, also kein Cookie-Banner.
- **Hosting:** Vercel (statisch). Für echte Kunden: eigene Domain und Vercel Pro bzw. EU-Hosting prüfen.
