// sw.js – Offline-Cache. Bei Änderungen an Dateien CACHE-Version erhöhen.
// Greift NUR bei den eigenen Dateien ein. So werden andere Apps, die später unter
// derselben Adresse laufen (z. B. localhost mit gleichem Port), nie überdeckt.
// Seitenaufrufe: zuerst Netz, Cache nur offline. Übrige eigene Dateien: Cache zuerst.
const CACHE = 'todo-app-v4';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './css/tokens.css', './css/app.css',
  './js/app.js', './js/logic.js', './js/store.js', './js/graph.js', './js/keys.js',
  './js/ui/dom.js', './js/ui/list.js', './js/ui/sidebar.js', './js/ui/detail.js', './js/ui/toast.js', './js/ui/dialog.js',
];
const OWN = new Set(ASSETS.map((a) => new URL(a, self.registration.scope).pathname));
const PAGES = new Set(['./', './index.html'].map((a) => new URL(a, self.registration.scope).pathname));
const isTodoApp = (res) => res.clone().text().then((t) => t.includes('<title>Todo – lokal'));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('todo-app-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !OWN.has(url.pathname)) return;

  if (PAGES.has(url.pathname)) {
    e.respondWith(fetch(e.request).then(async (res) => {
      // Unter dieser Adresse läuft inzwischen eine andere App: abmelden statt überdecken.
      if (res.ok && !(await isTodoApp(res))) {
        await caches.delete(CACHE);
        await self.registration.unregister();
        return res;
      }
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))));
    return;
  }

  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  })));
});
