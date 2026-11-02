# Was du bereitstellen musst

## 1. GitHub (Pflicht, 2 Minuten)
- [ ] Lege auf github.com ein neues **privates** Repo an, z. B. `ki-agententeam` (ich kann keine Repos selbst anlegen).
- [ ] Sag mir Bescheid, dann pushe ich die vorbereiteten Agenten-Dateien hinein.
- [ ] Füge das Repo in den Projekteinstellungen unter "Repositories" hinzu, damit jeder neue Auftrag es automatisch nutzt.
- Für Kundenprojekte legt das Team pro Kunde einen Ordner oder Branch an. Für eigene Repos pro Kunde musst du jeweils ein leeres Repo anlegen (oder einen GitHub-Token mit Repo-Rechten hinterlegen).

## 2. Hosting (Pflicht für "online stellen")
- [ ] Konto bei **Vercel** (empfohlen) oder **Netlify**, mit GitHub verknüpft. Kostenloser Plan reicht zum Start; für kommerzielle Kundenseiten braucht Vercel den Pro-Plan (ca. 20 $/Monat), Netlify erlaubt kommerzielle Nutzung im Free-Plan.
- [ ] Connector in Claude verbinden (Karte im Chat).
- [ ] Token erstellen (Vercel: Settings → Tokens) und als Umgebungsvariable `VERCEL_TOKEN` in der Claude-Umgebung hinterlegen, damit das Team ohne dich deployen kann.

## 3. Domains
- [ ] Konto bei einem Registrar (z. B. INWX, Namecheap, Cloudflare) mit hinterlegter Zahlungsart.
- Domainkäufe gibt das Team nie selbst frei; es schlägt Domains vor, du kaufst (oder der Kunde).

## 4. E-Mail für Vertrieb
- [ ] Eine **eigene Geschäfts-Mailadresse** (z. B. Google Workspace oder IONOS) mit eigener Domain. Gmail-Connector verbinden, dann schreibt das Team Entwürfe in dein Postfach, du klickst nur auf Senden.
- ⚠️ Dein verbundenes **Microsoft 365** ist dein Arbeitgeber-Konto (mindsquare). Nutze es **nicht** für deine eigene Akquise oder Kundendaten. Gleiches gilt für "Das Orakel" (Firmenwissen).

## 5. Lead-Daten und Analyse
- [ ] **Google Cloud API-Key** für Places API (Firmen, Websites, Bewertungen finden) und PageSpeed Insights API (Website-Qualität prüfen). Kostet ab einer gewissen Menge Geld, Budget-Limit setzen.
- [ ] Optional: CRM (HubSpot Free reicht), um Leads, Status und Angebote zu verwalten. Connector-Karte im Chat.
- [ ] Optional: Handelsregister-/Firmendaten-Anbieter (z. B. North Data), LinkedIn Sales Navigator.

## 6. KI-Tools für Kunden
- [ ] **Anthropic API-Key** (console.anthropic.com) für Chatbots, Bewerbungs-Tools usw. in Kundenprojekten. Pro Kunde besser eigener Key bzw. Abrechnung über den Kunden.

## 7. Wo die Keys hin gehören
Alle Schlüssel als Umgebungsvariablen der Claude-Cloud-Umgebung (Environment-Einstellungen), **nie** im Chat oder im Repo. Namen stehen in `.env.example`.

## 8. Rechtliches (wichtig)
- **Kalt-E-Mails sind in Deutschland auch an Firmen grundsätzlich verboten** (§7 Abs. 2 Nr. 2 UWG: Werbung per E-Mail nur mit vorheriger ausdrücklicher Einwilligung). Folge: Abmahnungen durch Empfänger oder Wettbewerber, oft 500–1.500 € pro Fall. Das gilt auch für "nur eine kurze Mail".
- Erlaubt bzw. üblich im B2B:
  - **Telefon** bei mutmaßlicher Einwilligung (konkreter Bezug zum Geschäft, z. B. "Ihre Seite ist nicht mobilfähig"), §7 Abs. 2 Nr. 1 UWG.
  - **Brief / Flyer** mit Demo-Link oder QR-Code.
  - **LinkedIn / Xing** Kontaktanfragen mit persönlicher Nachricht (Plattformregeln beachten).
  - **E-Mail an Bestandskunden** für ähnliche Leistungen (§7 Abs. 3 UWG) oder nach Einwilligung (z. B. Kontaktformular "Kostenlose Website-Analyse anfordern").
- **DSGVO**: Nur geschäftliche Daten aus öffentlichen Quellen speichern, Quelle und Zweck dokumentieren (berechtigtes Interesse, Art. 6 Abs. 1 lit. f), Löschfristen setzen, Widerspruch sofort umsetzen.
- **Eigenes Gewerbe** anmelden, eigenes Impressum und Datenschutzerklärung für deine Agentur, AV-Verträge mit Hosting-Anbietern, AGB/Angebotsvorlage. Prüfe außerdem, ob dein Arbeitsvertrag eine Nebentätigkeit erlaubt bzw. anzeigepflichtig ist.
- Das ist keine Rechtsberatung; für Vorlagen (AGB, Datenschutz) lohnt sich einmalig ein Anwalt oder ein Generator wie eRecht24.

## 9. Was du danach nur noch tust
- `/auftrag Webseite für Dönerladen XY in Köln` → Ergebnisdatei mit Live-URL in `ergebnisse/`.
- `/akquise Friseure in Düsseldorf` → bewertete Leads und Ansprache-Entwürfe; du gibst frei, was rausgeht.
