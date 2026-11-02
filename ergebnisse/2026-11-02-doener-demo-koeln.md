# Ergebnis: Demo-Webseite „Döner Muster" (Köln-Ehrenfeld)

Datum: 2026-11-02 · Art: interner Testauftrag / Vertriebs-Demo · Status: **gebaut und abgenommen, Deployment ausstehend**

## Links
- **Live-URL:** ausstehend. Die Cloud-Umgebung blockiert `api.vercel.com`; nach Freigabe der Domain wird als Vercel-Projekt `doener-demo-koeln` deployt.
- **Repo:** https://github.com/IT-Money97/KI-Agent-Team/tree/claude/project-thread-0a1nia/projekte/doener-demo-koeln
- **Screenshots:** `projekte/doener-demo-koeln/screenshots/` (375/768/1440 px, hell und dunkel)

## Was gebaut wurde
One-Page-Webseite (Astro, statisch) mit Live-Status „Jetzt geöffnet", Speisekarte mit Allergen-Kennzeichnung, Öffnungszeiten (heute markiert), Standort mit Google-Maps-Link ohne Einbettung, Sticky-Leiste „Anrufen / Route / Speisekarte" auf dem Handy, Hell/Dunkel-Umschalter, Impressum und Datenschutz als Platzhalter, LocalBusiness-JSON-LD, sitemap.xml, robots.txt.

## Qualität
- Build fehlerfrei. Lighthouse mobil und Desktop: Performance 100, Accessibility 100, Best Practices 100, SEO 69 (nur wegen absichtlichem `noindex` der Demo).
- Keine Cookies, kein Tracking, keine externen Fonts/Skripte, daher kein Cookie-Banner nötig.

## Annahmen
- Name, Adresse, Telefon, Preise, Öffnungszeiten frei erfunden und als Platzhalter markiert. Keine erfundenen Bewertungen.
- Keine Online-Bestellung (Zusatzangebot).
- Fotos durch SVG-Illustration ersetzt, bis echte Fotos vorliegen.

## Offene Punkte
- Deployment nach Netzwerkfreigabe (`api.vercel.com`, `vercel.com`).
- Für echte Kunden: `noindex` entfernen, eigene Domain, Vercel Pro (Hobby ist nur für nicht-kommerzielle Nutzung) oder EU-Hosting.

## Was ein echter Kunde liefern muss
Firmenname und Rechtsform, Adresse, Telefon, E-Mail, Impressumsangaben (USt-IdNr.), echte Speisekarte mit Preisen und Allergenen, Öffnungszeiten, Zahlungsarten, Fotos (Außenansicht, Spieß, 3–4 Gerichte, Logo), gewünschter Bestellweg (Lieferdienst/WhatsApp).

Alle Geschäftsdaten stehen zentral in `site/src/data/laden.ts`.
