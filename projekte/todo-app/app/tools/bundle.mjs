// bundle.mjs – erzeugt app/standalone.html (alles inline, klassisches <script>), damit die App per
// Doppelklick über file:// läuft (ES-Module sind dort blockiert). Aufruf: node tools/bundle.mjs
// Unterstützte Modul-Syntax (bewusst schlicht halten!):
//   import { a, b as c } from './x.js';   import * as X from './x.js';
//   export function|async function|class|const|let NAME …;   export { a, b };
// Nicht unterstützt: default-Exporte, Re-Exporte, dynamisches import(), import.meta.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_RE = /^\s*import\s+(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;

async function collect(entry) {
  const mods = new Map(); // rel -> { code, deps }
  const order = [];
  async function visit(rel, stack = []) {
    if (mods.has(rel)) return;
    if (stack.includes(rel)) throw new Error(`Zirkulärer Import: ${[...stack, rel].join(' -> ')}`);
    const src = await readFile(path.join(APP, rel), 'utf8');
    const deps = [];
    let code = src.replace(IMPORT_RE, (m, names, ns, spec) => {
      const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      deps.push(dep);
      if (ns) return `const ${ns} = __m[${JSON.stringify(dep)}];`;
      const list = names.split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => s.replace(/^([\w$]+)\s+as\s+([\w$]+)$/, '$1: $2'));
      return `const { ${list.join(', ')} } = __m[${JSON.stringify(dep)}];`;
    });
    if (/^\s*import\s/m.test(code) || /\bimport\s*\(|import\.meta|^\s*export\s+default\b|^\s*export\s+\*/m.test(code))
      throw new Error(`${rel}: nicht unterstützte Modul-Syntax`);
    const exported = [];
    code = code.replace(/^(\s*)export\s+\{([^}]*)\};?/gm, (m, ind, names) => {
      for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) {
        const mm = n.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
        exported.push(mm[2] ? `${mm[2]}: ${mm[1]}` : mm[1]);
      }
      return '';
    });
    code = code.replace(/^(\s*)export\s+((?:async\s+)?function\*?|class|const|let|var)\s+([\w$]+)/gm, (m, ind, kw, name) => {
      exported.push(name);
      return `${ind}${kw} ${name}`;
    });
    mods.set(rel, { code, exported });
    for (const d of deps) await visit(d, [...stack, rel]);
    order.push(rel);
  }
  await visit(entry);
  return order.map((rel) => ({ rel, ...mods.get(rel) }));
}

export async function bundle({ out = path.join(APP, 'standalone.html') } = {}) {
  let html = await readFile(path.join(APP, 'index.html'), 'utf8');
  const modules = await collect('js/app.js');
  const js = ['"use strict";', 'const __m = Object.create(null);',
    ...modules.map((m) => `__m[${JSON.stringify(m.rel)}] = (() => {\n${m.code}\nreturn { ${m.exported.join(', ')} };\n})();`),
  ].join('\n').replace(/<\/script/gi, '<\\/script');

  const icon = await readFile(path.join(APP, 'icon.svg'), 'utf8');
  html = html
    .replace(/^\s*<link rel="manifest"[^>]*>\s*\n/m, '')
    .replace(/<link rel="icon" href="icon\.svg"[^>]*>/, `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon.trim())}">`);
  const cssLinks = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
  for (const [tag, href] of cssLinks) {
    const css = await readFile(path.join(APP, href), 'utf8');
    html = html.replace(tag, () => `<style>\n${css}</style>`);
  }
  const scriptTag = '<script type="module" src="js/app.js"></script>';
  if (!html.includes(scriptTag)) throw new Error('index.html: Script-Tag für js/app.js nicht gefunden');
  html = html.replace(scriptTag, () => `<script>\n${js}\n</script>`);
  html = html.replace('<html lang="de">', '<html lang="de">\n<!-- Automatisch erzeugt von tools/bundle.mjs – nicht von Hand bearbeiten. -->');
  await writeFile(out, html);
  return { out, modules: modules.map((m) => m.rel), bytes: Buffer.byteLength(html) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await bundle();
  console.log(`standalone.html geschrieben (${(r.bytes / 1024).toFixed(1)} KB, ${r.modules.length} Module)`);
}
