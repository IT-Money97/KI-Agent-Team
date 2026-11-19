# PLAN: „Knoten" – lokale Todo-App mit Unteraufgaben und Abhängigkeitsgraph

Rolle: Projektleiter · Stand: 2026-11-19 · Art: interner Auftrag (Eigenbedarf Turan)

## Ziel
Eine sehr einfach zu bedienende Todo-App, die komplett lokal im Browser läuft (keine Anmeldung, kein Server, keine Cloud), aber alles hat, was eine gute Aufgaben-App braucht: Unteraufgaben in beliebiger Tiefe, Abhängigkeiten zwischen Aufgaben und einen Graphen, der zeigt, was was blockiert.

## Annahmen (statt Rückfragen)
- „Lokal" heißt: Daten liegen nur im Browser (localStorage) des Geräts. Die App ist eine einzige HTML-Datei, die man per Doppelklick öffnen kann. Zusätzlich gibt es eine gehostete Kopie (Vercel), die als App installierbar ist und offline läuft; auch dort bleiben die Daten nur im Browser.
- Ein Nutzer, ein Gerät. Kein Sync zwischen Geräten; dafür Export/Import als JSON-Datei.
- Sprache Deutsch.
- „Einfach" geht vor Funktionsfülle: Hauptbildschirm = Eingabezeile + Liste. Alles Weitere steckt im Detailbereich.

## Funktionen
1. Schnell-Eingabe mit Kürzeln: `#tag`, `!1`–`!3` (Priorität), `@heute`, `@morgen`, `@2026-12-24`.
2. Unteraufgaben in beliebiger Tiefe, auf-/zuklappbar, Fortschrittsanzeige (x/y).
3. Abhängigkeiten („wartet auf"), Zyklus-Schutz, blockierte Aufgaben sind markiert und können nicht abgehakt werden.
4. Graph-Ansicht: Abhängigkeiten als Pfeile, Unteraufgaben gestrichelt, Farben nach Zustand (erledigt, blockiert, jetzt machbar), Zoom/Verschieben, Klick öffnet Aufgabe.
5. Filter: Alle, Jetzt machbar, Blockiert, Fällig, Erledigt, nach Tag; Suche.
6. Detailbereich: Titel, Notizen, Priorität, Fälligkeit, Tags, übergeordnete Aufgabe, Abhängigkeiten, Unteraufgaben, Löschen.
7. Drag & Drop zum Sortieren und Verschachteln.
8. Rückgängig (Strg+Z, Toast-Button), Tastenkürzel, Hell/Dunkel, Export/Import.

## Akzeptanzkriterien
- Öffnen per Doppelklick auf `app/index.html` funktioniert ohne Internet und ohne Build.
- Keine externen Ressourcen, keine Cookies, kein Tracking.
- Kein horizontales Scrollen bei 375 px, Tap-Ziele ≥ 40 px, per Tastatur bedienbar.
- Zyklen in Abhängigkeiten sind unmöglich; Löschen räumt Abhängigkeiten auf.
- Daten überleben einen Neuladen; Export → Import ergibt denselben Stand.
- Kein JS-Fehler in der Konsole beim Durchklicken aller Funktionen.

## Rollen
Architekt/Designer/Frontend: in einem Durchgang durch den PL (kleines Projekt, eine Datei). Backend: entfällt. UX-Tester: Review-Runde mit Playwright.
