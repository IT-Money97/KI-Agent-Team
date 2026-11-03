#!/usr/bin/env node
// Agenten-Büro: kleiner Webserver ohne Abhängigkeiten.
// Start: node buero/server.js  →  http://localhost:4321
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.BUERO_PORT) || 4321;
const LOG = path.join(__dirname, 'events.jsonl');
const PAGE = path.join(__dirname, 'public', 'index.html');
const clients = new Set();
let offset = 0;

function letzteEvents(n = 300) {
  try {
    const lines = fs.readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-n);
  } catch { return []; }
}

function senden(res, line) { res.write(`data: ${line}\n\n`); }

// Neue Zeilen in events.jsonl an alle offenen Browser schicken.
function pruefen() {
  let size = 0;
  try { size = fs.statSync(LOG).size; } catch { return; }
  if (size < offset) offset = 0; // Datei wurde geleert
  if (size === offset) return;
  const fd = fs.openSync(LOG, 'r');
  const buf = Buffer.alloc(size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  const text = buf.toString('utf8');
  const ende = text.lastIndexOf('\n');
  if (ende < 0) return;
  offset += Buffer.byteLength(text.slice(0, ende + 1));
  for (const line of text.slice(0, ende).split('\n')) {
    if (!line.trim()) continue;
    for (const res of clients) senden(res, line);
  }
}
try { offset = fs.statSync(LOG).size; } catch { offset = 0; }
setInterval(pruefen, 400);

http.createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`event: verlauf\ndata: ${JSON.stringify(letzteEvents())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(PAGE).pipe(res);
    return;
  }
  res.writeHead(404); res.end('Nicht gefunden');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Agenten-Büro läuft: http://localhost:${PORT}\n  (Fenster offen lassen. Beenden mit Strg+C)\n`);
});
