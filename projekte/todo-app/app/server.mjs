// server.mjs – statischer Mini-Server nur mit Node-Bordmitteln (kein npm install).
// Start: node server.mjs [--open]   Port: PORT-Umgebungsvariable, Standard 4322.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_PORT = 4322;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function createAppServer({ root = ROOT } = {}) {
  return http.createServer(async (req, res) => {
    const send = (code, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Methode nicht erlaubt');
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(400, 'Ungültige URL'); }
    let file = path.join(root, path.normalize(rel));
    if (file !== root && !file.startsWith(root + path.sep)) return send(403, 'Verboten');
    if (path.relative(root, file).split(path.sep).some((p) => p.startsWith('.'))) return send(404, 'Nicht gefunden');
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      send(200, body, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      send(404, 'Nicht gefunden');
    }
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* egal */ }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const server = createAppServer();
  server.on('error', (e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${port} ist belegt. Anderen Port mit PORT=xxxx wählen.` : e.message);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Todo-App läuft auf ${url}  (Beenden: Strg+C)`);
    if (process.argv.includes('--open')) openBrowser(url);
  });
}
