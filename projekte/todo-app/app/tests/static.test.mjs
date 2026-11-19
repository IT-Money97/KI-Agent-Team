import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { bundle } from '../tools/bundle.mjs';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(path.join(APP, p), 'utf8');

test('Manifest und vercel.json sind gültiges JSON mit Pflichtfeldern', async () => {
  const m = JSON.parse(await read('manifest.webmanifest'));
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) assert.ok(m[k], k);
  await stat(path.join(APP, m.icons[0].src));
  JSON.parse(await read('vercel.json'));
});

test('Service Worker cached alle JS/CSS-Dateien, und alle Einträge existieren', async () => {
  const sw = await read('sw.js');
  const assets = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  for (const a of assets) if (a !== './') await stat(path.join(APP, a));
  const walk = async (dir) => (await readdir(path.join(APP, dir), { withFileTypes: true }))
    .flatMap((e) => (e.isDirectory() ? [] : [`./${dir}/${e.name}`]));
  const files = [...await walk('js'), ...await walk('js/ui'), ...await walk('css')];
  for (const f of files) assert.ok(assets.includes(f), `fehlt im SW-Cache: ${f}`);
});

test('bundle.mjs erzeugt lauffähiges standalone.html ohne Modul-Syntax', async () => {
  const out = path.join(APP, 'tests', '.standalone-test.html');
  const r = await bundle({ out });
  const html = await readFile(out, 'utf8');
  await (await import('node:fs/promises')).rm(out);
  assert.ok(r.modules.includes('js/logic.js'));
  assert.doesNotMatch(html, /type="module"|rel="manifest"|href="css\//);
  const script = html.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];
  assert.doesNotMatch(script, /^\s*(import|export)\s/m);
  new vm.Script(script); // Syntaxprüfung
});

test('Vom Browser geladene Dateien (ASSETS in sw.js) unter 200 KB (PLAN Kriterium 12)', async () => {
  const sw = await read('sw.js');
  const assets = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  let total = (await stat(path.join(APP, 'sw.js'))).size;
  for (const a of assets) if (a !== './') total += (await stat(path.join(APP, a))).size;
  assert.ok(assets.includes('./index.html'));
  assert.ok(total < 200 * 1024, `${total} Bytes`);
});
