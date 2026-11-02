# BUILD

- `cd site && npm install && npm run build` → `dist/` (3 Seiten + sitemap). Fehlerfrei.
- Lighthouse 12 (lokal, `astro preview`):
  - Mobil: Performance 100, Accessibility 100, Best Practices 100, SEO 69
  - Desktop: Performance 100, Accessibility 100, Best Practices 100, SEO 69
  - SEO-Abzug nur durch `noindex` (gewollt für Demo). Für echte Kunden: `robots`-Meta in `Base.astro` und `public/robots.txt` anpassen.
- Feedback Runde 1: #1 erledigt; übrige Punkte siehe FEEDBACK-1.md.
