// Albion Werkbank – lokaler Server (nur 127.0.0.1, keine Abhängigkeiten, Node 18+)
// Liefert die App aus und leitet Marktabfragen an das Albion Online Data Project weiter
// (mit Cache und Ratenbegrenzung, damit die öffentlichen Limits eingehalten werden).

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");

const SERVERS = new Set(["europe", "west", "east"]);
const LOCATIONS = new Set([
  "Bridgewatch", "Caerleon", "Fort Sterling", "Lymhurst", "Martlock", "Thetford",
  "Brecilien", "Black Market"
]);
const ITEM_RE = /^[A-Z0-9_]+(@[1-4])?$/;
const TYPES = new Set(["text/html", "text/css", "text/javascript", "application/json", "image/svg+xml", "text/plain"]);
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/plain" };

// ---- Ratenbegrenzung: Data Project erlaubt 180 Anfragen/Minute und 300 je 5 Minuten.
const calls = [];
function allowCall() {
  const now = Date.now();
  while (calls.length && now - calls[0] > 300_000) calls.shift();
  const lastMinute = calls.filter((t) => now - t < 60_000).length;
  if (lastMinute >= 150 || calls.length >= 280) return false;
  calls.push(now);
  return true;
}

// ---- Kleiner Antwort-Cache (Preise 3 Min., Verlauf 30 Min.)
const cache = new Map();
function cached(key) {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit;
  cache.delete(key);
  return null;
}

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}

function buildMarketUrl(kind, params) {
  const server = params.get("server") || "europe";
  if (!SERVERS.has(server)) return { error: "Unbekannter Server (europe, west, east)." };
  const items = (params.get("items") || "").split(",").filter(Boolean);
  if (!items.length || items.some((i) => !ITEM_RE.test(i))) return { error: "Ungültige oder fehlende Item-IDs." };
  const locations = (params.get("locations") || "").split(",").filter(Boolean);
  if (locations.some((l) => !LOCATIONS.has(l))) return { error: "Unbekannter Marktort." };
  const qualities = (params.get("qualities") || "").split(",").filter(Boolean);
  if (qualities.some((q) => !/^[1-5]$/.test(q))) return { error: "Qualität muss 1–5 sein." };
  const q = new URLSearchParams();
  if (locations.length) q.set("locations", locations.join(","));
  if (qualities.length) q.set("qualities", qualities.join(","));
  if (kind === "history") {
    const scale = params.get("time-scale") || "24";
    if (!/^(1|6|24)$/.test(scale)) return { error: "time-scale muss 1, 6 oder 24 sein." };
    q.set("time-scale", scale);
    const date = params.get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) q.set("date", date);
  }
  const url = `https://${server}.albion-online-data.com/api/v2/stats/${kind}/${items.join(",")}.json?${q}`;
  if (url.length > 4000) return { error: "Zu viele Items in einer Anfrage (URL zu lang)." };
  return { url, ttl: kind === "history" ? 30 * 60_000 : 3 * 60_000 };
}

async function proxyMarket(res, kind, params) {
  const built = buildMarketUrl(kind, params);
  if (built.error) return json(res, 400, { error: built.error });
  const hit = cached(built.url);
  if (hit) return json(res, 200, { cached: true, fetchedAt: hit.fetchedAt, data: hit.data });
  if (!allowCall()) return json(res, 429, { error: "Lokales Abruflimit erreicht (Schutz der Data-Project-API). Bitte eine Minute warten." });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const up = await fetch(built.url, { signal: ctrl.signal, headers: { Accept: "application/json", "Accept-Encoding": "gzip", "User-Agent": "albion-werkbank-local/2.0" } });
    if (!up.ok) return json(res, up.status === 429 ? 429 : 502, { error: `Data Project antwortete mit HTTP ${up.status}.` });
    const data = await up.json();
    const fetchedAt = new Date().toISOString();
    cache.set(built.url, { data, fetchedAt, until: Date.now() + built.ttl });
    json(res, 200, { cached: false, fetchedAt, data });
  } catch (e) {
    json(res, 502, { error: e.name === "AbortError" ? "Data Project hat nicht innerhalb von 20 s geantwortet." : `Data Project nicht erreichbar: ${e.message}` });
  } finally {
    clearTimeout(timer);
  }
}

let updating = null;
async function updateData(res) {
  if (!updating) {
    updating = new Promise((resolve) => {
      execFile(process.execPath, [path.join(ROOT, "tools", "build-data.mjs")], { cwd: ROOT, timeout: 300_000 }, (err, stdout, stderr) => {
        resolve(err ? { ok: false, error: (stderr || err.message).trim().split("\n").pop() } : { ok: true, message: stdout.trim().split("\n").pop() });
      });
    }).finally(() => setTimeout(() => { updating = null; }, 0));
  }
  const result = await updating;
  json(res, result.ok ? 200 : 502, result);
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return json(res, 403, { error: "Verboten" });
  const type = MIME[path.extname(file)];
  if (!type || !TYPES.has(type)) return json(res, 404, { error: "Nicht gefunden" });
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("kein File");
    const headers = { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Last-Modified": info.mtime.toUTCString() };
    if (req.headers["if-modified-since"] === headers["Last-Modified"]) { res.writeHead(304); return res.end(); }
    if (info.size > 100_000 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
      res.writeHead(200, { ...headers, "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
      createReadStream(file).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      res.writeHead(200, headers);
      res.end(await readFile(file));
    }
  } catch {
    json(res, 404, { error: "Nicht gefunden" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  // Nur lokale Aufrufe zulassen (Schutz vor DNS-Rebinding)
  const hostHeader = (req.headers.host || "").split(":")[0];
  if (!["127.0.0.1", "localhost"].includes(hostHeader)) return json(res, 403, { error: "Nur lokaler Zugriff erlaubt." });

  if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, app: "albion-werkbank" });
  if (req.method === "GET" && url.pathname === "/api/market/prices") return proxyMarket(res, "prices", url.searchParams);
  if (req.method === "GET" && url.pathname === "/api/market/history") return proxyMarket(res, "history", url.searchParams);
  if (req.method === "POST" && url.pathname === "/api/data/update") {
    if (req.headers["x-werkbank"] !== "1") return json(res, 403, { error: "Fehlender Header." });
    return updateData(res);
  }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET" }); return res.end(); }
  return serveStatic(req, res, url.pathname);
});

server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `Port ${PORT} ist belegt. Läuft die Werkbank schon? Sonst PORT=4174 setzen.` : `Server-Fehler: ${e.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`Albion Werkbank läuft unter ${url}  (Beenden: Strg+C)`);
  if (process.env.OPEN_BROWSER === "1") {
    const cmd = process.platform === "win32" ? ["cmd.exe", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    execFile(cmd[0], cmd[1], () => {});
  }
});
