// Einstiegspunkt, damit auch `node --test <pfad>/tests/` (Verzeichnis als Argument) funktioniert:
// Node 22 löst ein Verzeichnis als Modul über index.js auf. Lädt alle *.test.mjs dieses Ordners.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
for (const f of fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.mjs')).sort()) {
  import(pathToFileURL(path.join(__dirname, f)).href);
}
