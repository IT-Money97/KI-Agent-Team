import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAppServer } from '../server.mjs';

const rawStatus = (port, p) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: p }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject);
});

test('server.mjs liefert index.html, JS-MIME, 404 und blockt Pfad-Ausbruch', async () => {
  const server = createAppServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(base + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /<script type="module" src="js\/app.js">/);
    const js = await fetch(base + '/js/logic.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(base + '/manifest.webmanifest')).headers.get('content-type').split(';')[0], 'application/manifest+json');
    assert.equal((await fetch(base + '/gibtsnicht.js')).status, 404);
    for (const p of ['/../PLAN.md', '/%2e%2e/PLAN.md', '/..%2fPLAN.md', '/.vercelignore']) {
      assert.equal(await rawStatus(server.address().port, p), 404, p);
    }
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  } finally {
    server.close();
  }
});
