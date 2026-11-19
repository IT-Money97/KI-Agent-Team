# ARCHITEKTUR: Knoten

## Stack
Eine einzige Datei `app/index.html` mit eingebettetem CSS und Vanilla-JavaScript. Kein Framework, kein Build. Grund: Die App muss per Doppelklick (file://) laufen und jahrelang wartungsfrei bleiben.
Optional für die gehostete Version: `manifest.webmanifest`, `sw.js` (Offline-Cache), `icon.svg`. Ohne diese Dateien läuft die App trotzdem.

## Datenmodell (localStorage-Schlüssel `knoten-v1`)
```json
{
  "version": 1,
  "tasks": {
    "<id>": {
      "id": "string", "title": "string", "notes": "string",
      "done": false, "priority": 0, "due": "YYYY-MM-DD | null",
      "tags": ["string"], "parentId": "id | null", "deps": ["id"],
      "order": 0, "created": 0, "completedAt": 0
    }
  },
  "collapsed": ["id"]
}
```
- `priority`: 0 keine, 1 niedrig, 2 mittel, 3 hoch.
- `deps`: Aufgaben, auf die diese Aufgabe wartet. Blockiert = mindestens eine davon offen.
- „Jetzt machbar" = offen, nicht blockiert, keine offenen Unteraufgaben.

## Regeln
- Abhängigkeit A→B nur, wenn B ≠ A, B kein Vorfahre/Nachfahre von A und kein Pfad von B zurück zu A existiert (Zyklus-Schutz).
- Löschen entfernt alle Nachfahren und alle Verweise in `deps`.
- Abhaken einer Elternaufgabe hakt alle Unteraufgaben mit ab; Wiederöffnen einer Unteraufgabe öffnet erledigte Vorfahren.
- Rückgängig: Snapshot-Stapel (50 Schritte) im Speicher.

## Graph-Layout
Ebenen nach längstem Abhängigkeitspfad (links nach rechts), Reihenfolge in der Ebene per Baryzentrum-Heuristik (2 Durchläufe). Darstellung als SVG mit viewBox-Zoom/Pan.

## Hosting
Statisch auf Vercel (Projekt `todo-knoten`), Hobby-Plan (privater Eigenbedarf).
