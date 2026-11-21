// Offline-Cache für Knoten. Greift NUR bei den eigenen Dateien ein, damit andere
// Apps unter derselben Adresse (z. B. localhost mit gleichem Port) nie überdeckt werden.
// Reihenfolge: zuerst Netz, nur bei Ausfall der Cache.
const C = "knoten-v2";
const OWN = ["", "index.html", "manifest.webmanifest", "icon.svg"];
const scope = () => new URL(self.registration.scope);
const ownPath = url => {
  const u = new URL(url), s = scope();
  if (u.origin !== s.origin || !u.pathname.startsWith(s.pathname)) return null;
  const rest = u.pathname.slice(s.pathname.length);
  return OWN.includes(rest) ? rest : null;
};
const isKnoten = res => res.clone().text().then(t => t.includes("<title>Knoten"));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(["./", "index.html", "manifest.webmanifest", "icon.svg"])));
  self.skipWaiting();
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("knoten-") && k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const p = ownPath(e.request.url);
  if (p === null) return; // fremde Anfrage: Browser lädt ganz normal aus dem Netz
  e.respondWith(fetch(e.request).then(async r => {
    // Liefert der Server unter dieser Adresse inzwischen eine andere App aus:
    // Offline-Speicher abmelden und Cache leeren, statt die Todo-App zu zeigen.
    if (r.ok && (p === "" || p === "index.html") && !(await isKnoten(r))) {
      await caches.delete(C); await self.registration.unregister();
      return r;
    }
    if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
