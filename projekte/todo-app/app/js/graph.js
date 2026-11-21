// graph.js – zeichnet das Layout aus logic.layoutGraph als SVG: Statusfarben + Symbole + Strichart, Pfeile über
// Dummy-Punkte, Desktop links -> rechts, mobil oben -> unten. Zoom (Rad/Pinch/Knöpfe), Pan, Knoten per Tab/Enter.
// Optionen: "Nur Kette" (Vorgänger + Nachfolger der gewählten Aufgabe, Rest gedimmt), "Erledigte ausblenden".
// Suche und Tag-Filter heben Treffer hervor und dimmen den Rest.
import { layoutGraph, taskStatus, nextTasks, linkedIds, dependencyChain, matchesQuery } from './logic.js';
import { h, svg, icon, ICON_PATHS } from './ui/dom.js';

const STATUS_TEXT = { actionable: 'ausführbar', open: 'offen', blocked: 'blockiert', done: 'erledigt' };
const ICON_D = { actionable: ICON_PATHS.circle, open: ICON_PATHS.circle, blocked: ICON_PATHS.lock, done: ICON_PATHS.check };
const SIZES = {
  LR: { nodeWidth: 200, nodeHeight: 52, gapX: 72, gapY: 16, dummySize: 14 },
  TB: { nodeWidth: 150, nodeHeight: 56, gapX: 44, gapY: 12, dummySize: 14 },
};
const MAX = 2, PAD = 20;
const opt = { hideDone: false, chain: false };
let vp = { k: 1, x: PAD, y: PAD };
let size = { w: 0, h: 0 };
let stage = null;
let auto = true;        // automatisch einpassen, bis der Nutzer selbst zoomt/verschiebt
let lastKey = '';
let lastFind = '';
let anchor = null;      // Startpunkt (erster ausführbarer Knoten), falls nicht alles hineinpasst
let ctx = {};
let chainId = null;    // zuletzt gewählte Aufgabe; bleibt Ziel der Kette, auch wenn das Detail geschlossen wird

const minZoom = () => (ctx.mobile ? 0.8 : 0.75);

function apply() {
  const g = stage && stage.querySelector('.graph-vp');
  if (g) g.setAttribute('transform', `translate(${vp.x.toFixed(1)},${vp.y.toFixed(1)}) scale(${vp.k.toFixed(3)})`);
  const z = stage && stage.parentElement.querySelector('.graph-zoom');
  if (z) z.textContent = `${Math.round(vp.k * 100)} %`;
}

function zoomAt(f, cx, cy) {
  auto = false;
  const k = Math.min(MAX, Math.max(0.25, vp.k * f));
  vp = { k, x: cx - ((cx - vp.x) * k) / vp.k, y: cy - ((cy - vp.y) * k) / vp.k };
  apply();
}

/** Einpassen, aber nie kleiner als 75 % (mobil 80 %); passt es nicht, Start beim ersten ausführbaren Knoten. */
function fit() {
  if (!stage) return;
  const r = stage.getBoundingClientRect();
  if (!r.width || !size.w) return;
  const k = Math.min(1, Math.max(minZoom(), Math.min((r.width - 2 * PAD) / size.w, (r.height - 2 * PAD) / size.h)));
  const fitsX = size.w * k <= r.width - 2 * PAD, fitsY = size.h * k <= r.height - 2 * PAD;
  vp = { k, x: (r.width - size.w * k) / 2, y: (r.height - size.h * k) / 2 };
  if (!fitsX) vp.x = PAD - (anchor ? Math.max(0, Math.min(anchor.x * k - r.width / 3, size.w * k - r.width + 2 * PAD)) : 0);
  // oben Platz für die Zoom-Leiste lassen, damit sie den ersten Knoten nicht verdeckt
  const top = (stage.parentNode.querySelector('.graph-tools')?.offsetHeight || 0) + 2 * PAD;
  if (!fitsY) vp.y = top - (anchor ? Math.max(0, Math.min(anchor.y * k - r.height / 3, size.h * k - r.height + top + PAD)) : 0);
  auto = true;
  apply();
}

function ensureVisible(node, center = false) {
  const r = stage.getBoundingClientRect();
  const x = Number(node.dataset.x), y = Number(node.dataset.y);
  const w = Number(node.dataset.w) * vp.k, hh = Number(node.dataset.h) * vp.k;
  const sx = vp.x + x * vp.k, sy = vp.y + y * vp.k;
  if (center) { vp.x += r.width / 2 - sx - w / 2; vp.y += r.height / 2 - sy - hh / 2; apply(); return; }
  let dx = 0, dy = 0;
  if (sx < 8) dx = 8 - sx; else if (sx + w > r.width - 8) dx = r.width - 8 - sx - w;
  if (sy < 8) dy = 8 - sy; else if (sy + hh > r.height - 8) dy = r.height - 8 - sy - hh;
  if (dx || dy) { vp.x += dx; vp.y += dy; apply(); }
}

function bindStage(el) {
  const pts = new Map();
  let pan = null;
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pan = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y, moved: false, node: e.target.closest('.node'), dist: 0 };
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pan.dist = Math.hypot(a.x - b.x, a.y - b.y);
      pan.k = vp.k;
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!pan || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pan.dist) {
      const [a, b] = [...pts.values()];
      const r = el.getBoundingClientRect();
      zoomAt((pan.k * Math.hypot(a.x - b.x, a.y - b.y)) / pan.dist / vp.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pan.moved = true;
      return;
    }
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < 6) return;
    if (!pan.moved) { pan.moved = true; auto = false; el.setPointerCapture(e.pointerId); el.classList.add('is-panning'); }
    vp.x = pan.vx + dx; vp.y = pan.vy + dy;
    apply();
  });
  const up = (e) => {
    pts.delete(e.pointerId);
    if (!pan) return;
    el.classList.remove('is-panning');
    if (!pan.moved && pan.node && e.type === 'pointerup') ctx.onSelect(pan.node.dataset.id);
    if (!pts.size) pan = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', (e) => {
    const n = e.target.closest('.node');
    if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); ctx.onSelect(n.dataset.id); }
  });
  el.addEventListener('focusin', (e) => {
    const n = e.target.closest('.node');
    if (!n) return;
    for (const p of el.querySelectorAll('.edge')) p.classList.toggle('is-hl', p.dataset.from === n.dataset.id || p.dataset.to === n.dataset.id);
    ensureVisible(n);
  });
  el.addEventListener('focusout', () => { for (const p of el.querySelectorAll('.edge.is-hl')) p.classList.remove('is-hl'); });
  new ResizeObserver(() => { if (auto) fit(); }).observe(el);
}

function legend() {
  const item = (cls, label) => h('li', { class: `legend-item ${cls}` },
    h('span', { class: 'legend-swatch', 'aria-hidden': 'true' }, icon(cls === 'is-blocked' ? 'lock' : cls === 'is-done' ? 'check' : 'circle', 12)), label);
  return h('div', { class: 'graph-legend' },
    h('h2', { class: 'visually-hidden' }, 'Legende'),
    h('ul', { class: 'plain' },
      item('is-actionable', 'ausführbar'), item('is-open', 'offen'), item('is-blocked', 'blockiert (gestrichelt)'), item('is-done', 'erledigt'),
      h('li', { class: 'legend-item legend-edge is-active' }, h('span', { class: 'legend-line', 'aria-hidden': 'true' }), 'offene Voraussetzung'),
      h('li', { class: 'legend-item legend-edge' }, h('span', { class: 'legend-line', 'aria-hidden': 'true' }), 'erledigte Voraussetzung')),
    h('p', { class: 'graph-info' }));
}

/** Titel auf höchstens zwei Zeilen umbrechen (Zeichenschätzung), Rest mit … kürzen. */
function wrap(title, max) {
  const words = title.split(/\s+/);
  const lines = [''];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = w;
    else if ((cur + ' ' + w).length <= max) lines[lines.length - 1] = cur + ' ' + w;
    else lines.push(w);
  }
  const out = lines.slice(0, 2).map((l) => (l.length > max ? l.slice(0, max - 1) + '…' : l));
  if (lines.length > 2 && !out[1].endsWith('…')) out[1] = (out[1].length >= max ? out[1].slice(0, max - 1) : out[1]) + '…';
  return out;
}

function toolButton(label, ic, fn, extra = {}) {
  return h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, onclick: fn, ...extra }, icon(ic, 20));
}

function buildShell(container) {
  stage = h('div', { class: 'graph-stage' });
  bindStage(stage);
  const mid = (f) => () => { const r = stage.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); };
  const toggle = (key, label) => h('button', { type: 'button', class: 'graph-opt', 'data-opt': key, 'aria-pressed': 'false',
    onclick: () => { opt[key] = !opt[key]; auto = true; lastKey = ''; ctx.refresh(); } }, label);
  container.replaceChildren(
    h('div', { class: 'graph-opts', role: 'group', 'aria-label': 'Graph-Optionen' },
      toggle('chain', 'Nur Kette'), toggle('hideDone', 'Erledigte ausblenden')),
    h('div', { class: 'graph-empty' }),
    h('div', { class: 'graph-wrap' },
      h('div', { class: 'graph-tools', role: 'toolbar', 'aria-label': 'Zoom' },
        toolButton('Vergrößern', 'plus', mid(1.25)), h('span', { class: 'graph-zoom', 'aria-hidden': 'true' }),
        toolButton('Verkleinern', 'minus', mid(0.8)), toolButton('Einpassen', 'fit', () => { lastKey = ''; fit(); })),
      stage),
    legend());
}

export function renderGraph(container, state, c) {
  ctx = c;
  if (!stage || !container.contains(stage)) buildShell(container);
  const dir = ctx.mobile ? 'TB' : 'LR';
  const all = linkedIds(state);
  let ids = all;
  if (opt.hideDone) {
    const open = new Set(all.filter((id) => !state.tasks[id].done));
    ids = [...open].filter((id) => state.tasks[id].dependsOn.some((d) => open.has(d))
      || [...open].some((o) => state.tasks[o].dependsOn.includes(id)));
  }
  if (ctx.selected && ids.includes(ctx.selected)) chainId = ctx.selected;
  if (chainId && !ids.includes(chainId)) chainId = null;
  for (const b of container.querySelectorAll('.graph-opt')) {
    b.setAttribute('aria-pressed', String(opt[b.dataset.opt]));
    if (b.dataset.opt === 'chain') {
      b.disabled = !chainId;
      const ti = chainId ? state.tasks[chainId].title : '';
      b.replaceChildren('Nur Kette', chainId ? h('span', { class: 'opt-target' }, ` von „${ti.length > 24 ? ti.slice(0, 23) + '…' : ti}“`) : '');
      b.title = chainId ? 'Zeigt nur Voraussetzungen und abhängige Aufgaben dieser Aufgabe' : 'Erst eine Aufgabe im Graphen auswählen';
    }
  }
  const empty = container.querySelector('.graph-empty');
  const hiddenCount = Object.keys(state.tasks).length - all.length;
  const info = container.querySelector('.graph-info');
  if (!ids.length) {
    empty.hidden = false;
    empty.replaceChildren(h('div', { class: 'empty' }, icon('graph', 40, 'empty-icon'),
      h('p', {}, all.length ? 'Alle verknüpften Aufgaben sind erledigt und ausgeblendet.' : 'Keine Abhängigkeiten. Lege im Detail-Panel „Blockiert durch“ oder „Voraussetzung für“ fest.')));
    stage.hidden = true;
    container.querySelector('.graph-legend').hidden = true;
    lastKey = '';
    return null;
  }
  empty.hidden = true;
  stage.hidden = false;
  container.querySelector('.graph-legend').hidden = false;

  const sz = SIZES[dir];
  const layout = layoutGraph(state, { ids, direction: dir, ...sz });
  const next = new Set(nextTasks(state));
  const status = (id) => { const s = taskStatus(state, id); return s === 'open' && next.has(id) ? 'actionable' : s; };
  const chain = opt.chain && chainId ? dependencyChain(state, chainId) : null;
  const find = ctx.query || ctx.tag;
  const match = find ? new Set(ids.filter((id) => matchesQuery(state.tasks[id], ctx.query) && (!ctx.tag || state.tasks[id].tags.includes(ctx.tag)))) : null;
  const dim = (id) => (chain && !chain.has(id)) || (match && !match.has(id));
  const parts = [];
  if (hiddenCount) parts.push(`${hiddenCount} ${hiddenCount === 1 ? 'Aufgabe' : 'Aufgaben'} ohne Abhängigkeiten nicht gezeigt.`);
  if (match) parts.push(`${match.size} ${match.size === 1 ? 'Treffer' : 'Treffer'} hervorgehoben.`);
  parts.push('Ziehen verschiebt, Mausrad/Pinch zoomt, Tab springt durch die Knoten.');
  info.textContent = parts.join(' ');

  size = { w: layout.width, h: layout.height };
  const root = svg('svg', { class: 'graph-svg', role: 'group', 'aria-label': `Abhängigkeitsgraph mit ${layout.nodes.length} Aufgaben` });
  const defs = svg('defs');
  for (const [id, cls] of [['arrow', 'arrow'], ['arrow-active', 'arrow is-active']]) {
    const m = svg('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '10', markerHeight: '10', markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse', class: cls });
    m.append(svg('path', { d: 'M0,0 L10,5 L0,10 z' }));
    defs.append(m);
  }
  root.append(defs);
  const g = svg('g', { class: 'graph-vp' });
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  const tb = dir === 'TB';
  for (const e of layout.edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    const pts = [tb ? { x: a.x + a.width / 2, y: a.y + a.height } : { x: a.x + a.width, y: a.y + a.height / 2 }, ...e.points,
      tb ? { x: b.x + b.width / 2, y: b.y - 3 } : { x: b.x - 3, y: b.y + b.height / 2 }];
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      if (i % 2 === 0) { d += ` L${q.x},${q.y}`; continue; } // gerade durch die Lücke einer Ebene
      d += tb ? ` C${p.x},${(p.y + q.y) / 2} ${q.x},${(p.y + q.y) / 2} ${q.x},${q.y}` : ` C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`;
    }
    const active = !state.tasks[e.from].done;
    g.append(svg('path', { d, class: `edge${active ? ' is-active' : ''}${dim(e.from) || dim(e.to) ? ' is-dim' : ''}`,
      'marker-end': `url(#${active ? 'arrow-active' : 'arrow'})`, 'data-from': e.from, 'data-to': e.to }));
  }
  const maxChars = Math.floor((sz.nodeWidth - 44) / 7.4);
  anchor = null;
  let firstMatch = null;
  for (const n of layout.nodes) {
    const t = state.tasks[n.id];
    const st = status(n.id);
    if (!anchor && st === 'actionable') anchor = n;
    if (!firstMatch && match && match.has(n.id)) firstMatch = n.id;
    const node = svg('g', { class: `node is-${st}${ctx.selected === n.id ? ' is-selected' : ''}${dim(n.id) ? ' is-dim' : ''}${match && match.has(n.id) ? ' is-match' : ''}`,
      tabindex: '0', role: 'button', 'data-id': n.id, 'data-fk': 'node-' + n.id, 'data-x': n.x, 'data-y': n.y, 'data-w': n.width, 'data-h': n.height,
      transform: `translate(${n.x},${n.y})`, 'aria-label': `${t.title}, ${STATUS_TEXT[st]}` });
    const tt = svg('title');
    tt.textContent = `${t.title} (${STATUS_TEXT[st]})`;
    node.append(tt,
      svg('rect', { class: 'node-focus', x: -5, y: -5, width: n.width + 10, height: n.height + 10, rx: 14 }),
      svg('rect', { class: 'node-box', width: n.width, height: n.height, rx: 10 }),
      svg('path', { class: 'node-icon', d: ICON_D[st], transform: `translate(10,${n.height / 2 - 9}) scale(0.75)` }));
    const lines = wrap(t.title, maxChars);
    const text = svg('text', { class: 'node-text', x: 34, y: n.height / 2 - (lines.length - 1) * 9, 'dominant-baseline': 'central' });
    lines.forEach((l, i) => { const ts = svg('tspan', { x: 34, dy: i ? 18 : 0 }); ts.textContent = l; text.append(ts); });
    node.append(text);
    g.append(node);
  }
  anchor = anchor || layout.nodes[0];
  root.append(g);
  stage.replaceChildren(root);
  const key = `${dir}|${opt.hideDone}|${layout.nodes.map((n) => n.id).sort().join()}`;
  const centerChain = () => { const el = chain && stage.querySelector(`[data-id="${CSS.escape(chainId)}"]`); if (el) { ensureVisible(el, true); auto = false; } };
  if (key !== lastKey) { lastKey = key; requestAnimationFrame(() => { fit(); centerChain(); }); } else apply();
  const findKey = find ? `${ctx.query}|${ctx.tag}` : '';
  if (findKey !== lastFind) {
    lastFind = findKey;
    if (firstMatch) requestAnimationFrame(() => { const el = stage.querySelector(`[data-id="${CSS.escape(firstMatch)}"]`); if (el) { auto = false; ensureVisible(el, true); } });
  }
  return layout;
}
