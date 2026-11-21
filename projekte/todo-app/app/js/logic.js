// logic.js – reine Logik der Todo-App (kein DOM, keine Seiteneffekte).
// Alle verändernden Funktionen sind unveränderlich: sie geben einen NEUEN State zurück
// (strukturelles Teilen, unveränderte Tasks behalten ihre Referenz) oder werfen LogicError.

export const SCHEMA_VERSION = 1;
export const HISTORY_LIMIT = 50;
export const PRIORITY_LABELS = ['keine', 'niedrig', 'mittel', 'hoch'];
export const FILTERS = ['all', 'open', 'done', 'today', 'overdue', 'blocked'];
export const THEMES = ['system', 'light', 'dark'];
const EPOCH = '1970-01-01T00:00:00.000Z';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class LogicError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'LogicError';
    this.code = code;
    Object.assign(this, extra);
  }
}

// ---------------------------------------------------------------- Hilfen: Datum, IDs

export function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Lokales Datum als YYYY-MM-DD. */
export function toDateString(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

let seq = 0;
export function generateId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  seq = (seq + 1) % 1e6;
  return 't' + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 8);
}

const nowIso = (opts) => (opts && opts.now) || new Date().toISOString();

export function normalizeTags(tags) {
  const out = [];
  const seen = new Set();
  for (const raw of tags || []) {
    const t = String(raw).trim().replace(/^#+/, '').toLowerCase();
    if (t && !seen.has(t)) { seen.add(t); out.push(t); }
  }
  return out;
}

function checkPriority(p) {
  if (!Number.isInteger(p) || p < 0 || p > 3) throw new LogicError('INVALID_PRIORITY', 'Priorität muss 0–3 sein.');
  return p;
}
function checkDue(d) {
  if (d === null || d === undefined || d === '') return null;
  if (!isValidDate(d)) throw new LogicError('INVALID_DATE', `Ungültiges Datum: ${d}`);
  return d;
}

// ---------------------------------------------------------------- State

export function createState() {
  return { version: SCHEMA_VERSION, tasks: {}, settings: { theme: 'system', collapsed: [] } };
}

function req(state, id) {
  const t = state.tasks[id];
  if (!t) throw new LogicError('NOT_FOUND', `Aufgabe nicht gefunden: ${id}`);
  return t;
}

export function getTask(state, id) {
  return state.tasks[id] || null;
}

// ---------------------------------------------------------------- Baum

const byOrder = (a, b) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);

/** Map parentId(null|id) -> sortierte Kinder-Tasks. O(n log n), für Massenoperationen. */
export function buildChildIndex(state) {
  const idx = new Map();
  for (const t of Object.values(state.tasks)) {
    const k = t.parentId ?? null;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(t);
  }
  for (const list of idx.values()) list.sort(byOrder);
  return idx;
}

export function getChildren(state, parentId = null, index) {
  if (index) return index.get(parentId) || [];
  return Object.values(state.tasks).filter((t) => (t.parentId ?? null) === parentId).sort(byOrder);
}

export function getDescendantIds(state, id, index = buildChildIndex(state)) {
  const out = [];
  const stack = [...(index.get(id) || [])].reverse();
  while (stack.length) {
    const t = stack.pop();
    out.push(t.id);
    const kids = index.get(t.id);
    if (kids) for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return out;
}

/** Vorfahren vom direkten Elternteil bis zur Wurzel. */
export function getAncestorIds(state, id) {
  const out = [];
  const seen = new Set([id]);
  let p = state.tasks[id]?.parentId ?? null;
  while (p !== null && state.tasks[p] && !seen.has(p)) {
    out.push(p);
    seen.add(p);
    p = state.tasks[p].parentId ?? null;
  }
  return out;
}

export function getDepth(state, id) {
  return getAncestorIds(state, id).length;
}

/**
 * Flache Liste für die Baumdarstellung in DFS-Reihenfolge.
 * opts.collapsed: Array/Set eingeklappter IDs (Kinder werden ausgelassen)
 * opts.include: Set erlaubter IDs (Filter); nicht enthaltene Knoten samt Teilbaum werden übersprungen.
 */
export function flattenTree(state, opts = {}) {
  const collapsed = new Set(opts.collapsed ?? state.settings.collapsed);
  const include = opts.include || null;
  const index = opts.index || buildChildIndex(state);
  const out = [];
  const walk = (parentId, depth) => {
    for (const t of index.get(parentId) || []) {
      if (include && !include.has(t.id)) continue;
      const hasChildren = (index.get(t.id) || []).length > 0;
      const isCollapsed = collapsed.has(t.id);
      out.push({ id: t.id, depth, hasChildren, collapsed: isCollapsed });
      if (hasChildren && !isCollapsed) walk(t.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Reihenfolge aller Tasks wie im voll aufgeklappten Baum (id -> Position). */
export function treePositions(state, index = buildChildIndex(state)) {
  const pos = new Map();
  flattenTree(state, { collapsed: [], index }).forEach((r, i) => pos.set(r.id, i));
  return pos;
}

/** Fortschritt über ALLE Nachfahren (nicht nur direkte Kinder). */
export function progress(state, id, index) {
  const ids = getDescendantIds(state, id, index);
  const done = ids.reduce((n, d) => n + (state.tasks[d].done ? 1 : 0), 0);
  return { done, total: ids.length, ratio: ids.length ? done / ids.length : 0 };
}

export function hasOpenDescendants(state, id, index) {
  return getDescendantIds(state, id, index).some((d) => !state.tasks[d].done);
}

function reindex(tasks, orderedIds) {
  orderedIds.forEach((id, i) => {
    if (tasks[id].order !== i) tasks[id] = { ...tasks[id], order: i };
  });
  return tasks;
}

// ---------------------------------------------------------------- CRUD

/**
 * Legt eine Aufgabe an. ID über opts.id (sonst generiert; UI erzeugt sie vorher per generateId()).
 * Position: opts.afterId (direkt hinter Geschwister) oder opts.index, sonst ans Ende.
 */
export function addTask(state, input = {}, opts = {}) {
  const title = String(input.title ?? '').trim();
  if (!title) throw new LogicError('EMPTY_TITLE', 'Titel darf nicht leer sein.');
  const parentId = input.parentId ?? null;
  if (parentId !== null) req(state, parentId);
  const id = opts.id ?? generateId();
  if (state.tasks[id]) throw new LogicError('DUPLICATE_ID', `ID existiert bereits: ${id}`);
  const now = nowIso(opts);
  const task = {
    id, title,
    notes: String(input.notes ?? ''),
    done: false,
    parentId,
    order: 0,
    priority: checkPriority(input.priority ?? 0),
    due: checkDue(input.due),
    tags: normalizeTags(input.tags),
    dependsOn: [],
    createdAt: now, updatedAt: now, completedAt: null,
  };
  const siblings = getChildren(state, parentId).map((t) => t.id);
  let at = siblings.length;
  if (opts.afterId != null && siblings.includes(opts.afterId)) at = siblings.indexOf(opts.afterId) + 1;
  else if (Number.isInteger(opts.index)) at = Math.max(0, Math.min(opts.index, siblings.length));
  siblings.splice(at, 0, id);
  const tasks = reindex({ ...state.tasks, [id]: task }, siblings);
  let next = { ...state, tasks };
  if (input.dependsOn && input.dependsOn.length) next = setDependencies(next, id, input.dependsOn, { now });
  return next;
}

/** Ändert title, notes, priority, due, tags; done/dependsOn/parentId werden an Spezialfunktionen delegiert. */
export function updateTask(state, id, patch = {}, opts = {}) {
  const t = req(state, id);
  const now = nowIso(opts);
  const n = { ...t };
  let changed = false;
  if ('title' in patch) {
    const title = String(patch.title ?? '').trim();
    if (!title) throw new LogicError('EMPTY_TITLE', 'Titel darf nicht leer sein.');
    if (title !== t.title) { n.title = title; changed = true; }
  }
  if ('notes' in patch) { const v = String(patch.notes ?? ''); if (v !== t.notes) { n.notes = v; changed = true; } }
  if ('priority' in patch) { const v = checkPriority(patch.priority); if (v !== t.priority) { n.priority = v; changed = true; } }
  if ('due' in patch) { const v = checkDue(patch.due); if (v !== t.due) { n.due = v; changed = true; } }
  if ('tags' in patch) {
    const v = normalizeTags(patch.tags);
    if (v.join('\u0000') !== t.tags.join('\u0000')) { n.tags = v; changed = true; }
  }
  let next = state;
  if (changed) { n.updatedAt = now; next = { ...state, tasks: { ...state.tasks, [id]: n } }; }
  if ('dependsOn' in patch) next = setDependencies(next, id, patch.dependsOn, opts);
  if ('parentId' in patch) next = moveTask(next, id, { parentId: patch.parentId }, opts);
  if ('done' in patch) next = setDone(next, id, !!patch.done, opts);
  return next;
}

/** Abhaken/Zurücksetzen. opts.cascade=true hakt beim Erledigen alle Nachfahren mit ab. */
export function setDone(state, id, done, opts = {}) {
  req(state, id);
  const now = nowIso(opts);
  const ids = [id, ...(done && opts.cascade ? getDescendantIds(state, id) : [])];
  let tasks = null;
  for (const tid of ids) {
    const t = state.tasks[tid];
    if (t.done === done) continue;
    tasks = tasks || { ...state.tasks };
    tasks[tid] = { ...t, done, completedAt: done ? now : null, updatedAt: now };
  }
  return tasks ? { ...state, tasks } : state;
}

export function toggleDone(state, id, opts = {}) {
  return setDone(state, id, !req(state, id).done, opts);
}

/** Löscht Aufgabe inkl. aller Unter-Todos und entfernt Verweise in dependsOn und settings.collapsed. */
export function deleteTask(state, id) {
  const t = req(state, id);
  const gone = new Set([id, ...getDescendantIds(state, id)]);
  const tasks = {};
  for (const [k, v] of Object.entries(state.tasks)) {
    if (gone.has(k)) continue;
    tasks[k] = v.dependsOn.some((d) => gone.has(d)) ? { ...v, dependsOn: v.dependsOn.filter((d) => !gone.has(d)) } : v;
  }
  const next = { ...state, tasks };
  reindex(tasks, getChildren(next, t.parentId ?? null).map((x) => x.id));
  const collapsed = state.settings.collapsed.filter((c) => !gone.has(c));
  return { ...next, settings: { ...state.settings, collapsed } };
}

// ---------------------------------------------------------------- Verschieben

/** Verschiebt in neuen Elternteil (parentId, undefined = gleich bleiben) an Position index (Standard: Ende). */
export function moveTask(state, id, { parentId, index } = {}, opts = {}) {
  const t = req(state, id);
  const oldParent = t.parentId ?? null;
  const newParent = parentId === undefined ? oldParent : parentId;
  if (newParent !== null) {
    req(state, newParent);
    if (newParent === id || getDescendantIds(state, id).includes(newParent))
      throw new LogicError('INVALID_MOVE', 'Eine Aufgabe kann nicht in sich selbst verschoben werden.');
  }
  const tasks = { ...state.tasks };
  const oldSibs = getChildren(state, oldParent).map((x) => x.id).filter((x) => x !== id);
  const newSibs = newParent === oldParent ? oldSibs.slice() : getChildren(state, newParent).map((x) => x.id);
  const at = Number.isInteger(index) ? Math.max(0, Math.min(index, newSibs.length)) : newSibs.length;
  newSibs.splice(at, 0, id);
  if (newParent !== oldParent) {
    tasks[id] = { ...t, parentId: newParent, updatedAt: nowIso(opts) };
    reindex(tasks, oldSibs);
  }
  reindex(tasks, newSibs);
  const changed = Object.keys(tasks).some((k) => tasks[k] !== state.tasks[k]);
  return changed ? { ...state, tasks } : state;
}

export function moveUp(state, id) {
  const sibs = getChildren(state, req(state, id).parentId ?? null).map((x) => x.id);
  const i = sibs.indexOf(id);
  return i <= 0 ? state : moveTask(state, id, { index: i - 1 });
}

export function moveDown(state, id) {
  const sibs = getChildren(state, req(state, id).parentId ?? null).map((x) => x.id);
  const i = sibs.indexOf(id);
  return i >= sibs.length - 1 ? state : moveTask(state, id, { index: i + 1 });
}

/** Einrücken: wird letztes Kind des vorherigen Geschwisters. */
export function indent(state, id, opts = {}) {
  const sibs = getChildren(state, req(state, id).parentId ?? null).map((x) => x.id);
  const i = sibs.indexOf(id);
  if (i <= 0) return state;
  return moveTask(state, id, { parentId: sibs[i - 1] }, opts);
}

/** Ausrücken: wird Geschwister direkt hinter dem bisherigen Elternteil. */
export function outdent(state, id, opts = {}) {
  const t = req(state, id);
  if (t.parentId == null) return state;
  const parent = req(state, t.parentId);
  const gp = parent.parentId ?? null;
  const psibs = getChildren(state, gp).map((x) => x.id);
  return moveTask(state, id, { parentId: gp, index: psibs.indexOf(parent.id) + 1 }, opts);
}

// ---------------------------------------------------------------- Abhängigkeiten

/** Nicht erledigte Aufgaben, auf die id wartet. */
export function getBlockers(state, id) {
  return req(state, id).dependsOn.filter((d) => state.tasks[d] && !state.tasks[d].done);
}

export function isBlocked(state, id) {
  return getBlockers(state, id).length > 0;
}

/** Blockiert selbst oder ein Vorfahr ist blockiert. */
export function isEffectivelyBlocked(state, id) {
  return isBlocked(state, id) || getAncestorIds(state, id).some((a) => isBlocked(state, a));
}

/** Aufgaben, die auf id warten. */
export function getDependents(state, id) {
  return Object.values(state.tasks).filter((t) => t.dependsOn.includes(id)).map((t) => t.id);
}

/** Pfad entlang dependsOn von from nach to (iterative DFS) oder null. */
export function findDependencyPath(state, from, to) {
  if (from === to) return [from];
  const prev = new Map([[from, null]]);
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop();
    for (const d of state.tasks[cur]?.dependsOn || []) {
      if (prev.has(d)) continue;
      prev.set(d, cur);
      if (d === to) {
        const path = [d];
        let p = cur;
        while (p !== null) { path.push(p); p = prev.get(p); }
        return path.reverse();
      }
      stack.push(d);
    }
  }
  return null;
}

/** Würde "id hängt ab von depId" einen Zyklus erzeugen? Gibt Zyklus-Pfad [id, depId, …, id] oder null. */
export function wouldCreateCycle(state, id, depId) {
  if (id === depId) return [id, id];
  const path = findDependencyPath(state, depId, id);
  return path ? [id, ...path] : null;
}

function cycleMessage(state, cycle) {
  return 'Zyklus: ' + cycle.map((c) => `„${state.tasks[c]?.title ?? c}“`).join(' → ');
}

/** Setzt die Abhängigkeitsliste. Wirft LogicError CYCLE (mit .cycle) bzw. NOT_FOUND; State bleibt dann unverändert. */
export function setDependencies(state, id, deps = [], opts = {}) {
  const t = req(state, id);
  const list = [...new Set(deps)];
  for (const d of list) {
    req(state, d);
    const cycle = wouldCreateCycle(state, id, d);
    if (cycle) throw new LogicError('CYCLE', cycleMessage(state, cycle), { cycle });
  }
  if (list.length === t.dependsOn.length && list.every((d, i) => d === t.dependsOn[i])) return state;
  return { ...state, tasks: { ...state.tasks, [id]: { ...t, dependsOn: list, updatedAt: nowIso(opts) } } };
}

export function addDependency(state, id, depId, opts = {}) {
  const t = req(state, id);
  if (t.dependsOn.includes(depId)) return state;
  return setDependencies(state, id, [...t.dependsOn, depId], opts);
}

export function removeDependency(state, id, depId, opts = {}) {
  const t = req(state, id);
  if (!t.dependsOn.includes(depId)) return state;
  return setDependencies(state, id, t.dependsOn.filter((d) => d !== depId), opts);
}

/** Sucht irgendeinen Zyklus im gesamten Abhängigkeitsgraphen (DFS, 3 Farben). Pfad oder null. */
export function detectCycle(state) {
  const color = new Map(); // 1 = in Arbeit, 2 = fertig
  for (const start of Object.keys(state.tasks)) {
    if (color.get(start)) continue;
    const stack = [[start, 0]];
    const path = [start];
    color.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const deps = state.tasks[top[0]]?.dependsOn || [];
      if (top[1] < deps.length) {
        const d = deps[top[1]++];
        if (!state.tasks[d]) continue;
        const c = color.get(d);
        if (c === 1) return [...path.slice(path.indexOf(d)), d];
        if (!c) { color.set(d, 1); stack.push([d, 0]); path.push(d); }
      } else {
        color.set(top[0], 2);
        stack.pop();
        path.pop();
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- Graph-Layout

/** IDs, die an mindestens einer Abhängigkeit beteiligt sind (Standardauswahl für die Graph-Ansicht). */
export function linkedIds(state) {
  const s = new Set();
  for (const t of Object.values(state.tasks)) {
    for (const d of t.dependsOn) if (state.tasks[d]) { s.add(t.id); s.add(d); }
  }
  return [...s];
}

/** Topologische Ebenen (längster Pfad, Kahn): Ebene 0 = hängt von nichts ab. Map id -> Ebene. */
export function computeLayers(state, ids = Object.keys(state.tasks)) {
  const set = new Set(ids);
  const indeg = new Map();
  const succ = new Map();
  for (const id of set) { indeg.set(id, 0); succ.set(id, []); }
  for (const id of set) {
    for (const d of req(state, id).dependsOn) {
      if (!set.has(d)) continue;
      indeg.set(id, indeg.get(id) + 1);
      succ.get(d).push(id);
    }
  }
  const layer = new Map();
  const queue = [];
  for (const [id, n] of indeg) if (n === 0) { queue.push(id); layer.set(id, 0); }
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const s of succ.get(cur)) {
      layer.set(s, Math.max(layer.get(s) ?? 0, layer.get(cur) + 1));
      indeg.set(s, indeg.get(s) - 1);
      if (indeg.get(s) === 0) queue.push(s);
    }
  }
  if (queue.length !== set.size) throw new LogicError('CYCLE', 'Graph enthält einen Zyklus.');
  return layer;
}

/** Kreuzungen zwischen Kanten gleicher Ebenen-Spanne (exakt für Kanten zwischen Nachbarebenen). */
export function countCrossings(layers, edges) {
  const pos = new Map();
  const lay = new Map();
  layers.forEach((l, li) => l.forEach((id, i) => { pos.set(id, i); lay.set(id, li); }));
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i], b = edges[j];
      if (lay.get(a.from) !== lay.get(b.from) || lay.get(a.to) !== lay.get(b.to)) continue;
      if ((pos.get(a.from) - pos.get(b.from)) * (pos.get(a.to) - pos.get(b.to)) < 0) n++;
    }
  }
  return n;
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Schichtlayout: Ebenen per computeLayers, Reihenfolge innerhalb der Ebenen per Median-Heuristik
 * (abwechselnd vorwärts/rückwärts), bestes Ergebnis nach countCrossings. Kanten über mehrere Ebenen bekommen je
 * Zwischenebene einen Dummy-Knoten (Sugiyama), damit sie durch Lücken statt durch fremde Knoten laufen; edge.points
 * enthält je Dummy Ein- und Austrittspunkt am Rand der Ebene (dazwischen gerade Linie, zwischen Ebenen Kurven). Kanten zeigen von der Voraussetzung (from) zur abhängigen Aufgabe (to).
 * opts.direction: 'LR' (Ebenen von links nach rechts, Standard) oder 'TB' (von oben nach unten, mobil).
 * gapX = Abstand zwischen Ebenen, gapY = Abstand innerhalb einer Ebene, dummySize = Platz einer durchlaufenden Kante.
 */
export function layoutGraph(state, opts = {}) {
  const { nodeWidth = 180, nodeHeight = 44, gapX = 64, gapY = 16, sweeps = 6, dummySize = 12, direction = 'LR' } = opts;
  const ids = opts.ids ?? linkedIds(state);
  const set = new Set(ids);
  const layerOf = computeLayers(state, ids);
  const tpos = treePositions(state);
  const edges = [];
  const xedges = []; // Kanten im erweiterten Graphen (immer genau eine Ebene)
  const pred = new Map(ids.map((id) => [id, []]));
  const succ = new Map(ids.map((id) => [id, []]));
  const key0 = new Map(ids.map((id) => [id, tpos.get(id) ?? 0]));
  const dummy = new Set();
  const link = (a, b) => { xedges.push({ from: a, to: b }); succ.get(a).push(b); pred.get(b).push(a); };
  for (const id of ids) for (const d of state.tasks[id].dependsOn) {
    if (!set.has(d)) continue;
    const e = { from: d, to: id, chain: [] };
    let prev = d;
    for (let l = layerOf.get(d) + 1; l < layerOf.get(id); l++) {
      const v = `\u0000${edges.length}:${l}`;
      dummy.add(v);
      layerOf.set(v, l);
      pred.set(v, []);
      succ.set(v, []);
      key0.set(v, (tpos.get(d) ?? 0) + 0.5);
      link(prev, v);
      e.chain.push(v);
      prev = v;
    }
    link(prev, id);
    edges.push(e);
  }
  const all = [...ids, ...dummy];
  const maxLayer = Math.max(-1, ...ids.map((id) => layerOf.get(id)));
  let layers = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of all) layers[layerOf.get(id)].push(id);
  for (const l of layers) l.sort((a, b) => key0.get(a) - key0.get(b));

  const posOf = (ls) => { const m = new Map(); ls.forEach((l) => l.forEach((id, i) => m.set(id, i))); return m; };
  let best = layers.map((l) => l.slice());
  let bestC = countCrossings(best, xedges);
  for (let s = 0; s < sweeps && bestC > 0; s++) {
    const forward = s % 2 === 0;
    const order = forward ? layers.map((_, i) => i).slice(1) : layers.map((_, i) => i).reverse().slice(1);
    for (const li of order) {
      const pos = posOf(layers);
      const nb = forward ? pred : succ;
      const key = new Map(layers[li].map((id, i) => {
        const ps = nb.get(id).map((x) => pos.get(x));
        return [id, ps.length ? median(ps) : i];
      }));
      layers[li] = layers[li]
        .map((id, i) => [id, i])
        .sort((a, b) => key.get(a[0]) - key.get(b[0]) || a[1] - b[1])
        .map((x) => x[0]);
    }
    const c = countCrossings(layers, xedges);
    if (c < bestC) { bestC = c; best = layers.map((l) => l.slice()); }
  }
  layers = best;
  const tb = direction === 'TB';
  const main = tb ? nodeHeight : nodeWidth; // Ausdehnung entlang der Ebenen-Achse
  const cross = tb ? nodeWidth : nodeHeight; // Ausdehnung quer dazu
  const nodes = [];
  const center = new Map();
  let extent = 0;
  layers.forEach((l, li) => {
    let c = 0;
    l.forEach((id, i) => {
      const m = li * (main + gapX);
      const size = dummy.has(id) ? dummySize : cross;
      // Dummy: Ein- und Austrittspunkt an den Rändern der Ebene, die Kante läuft gerade durch ihre eigene Lücke
      if (dummy.has(id)) center.set(id, tb ? [{ x: c + size / 2, y: m }, { x: c + size / 2, y: m + main }] : [{ x: m, y: c + size / 2 }, { x: m + main, y: c + size / 2 }]);
      else nodes.push({ id, layer: li, index: i, x: tb ? c : m, y: tb ? m : c, width: nodeWidth, height: nodeHeight });
      c += size + gapY;
    });
    extent = Math.max(extent, c - gapY);
  });
  const along = layers.length ? layers.length * (main + gapX) - gapX : 0;
  return {
    nodes,
    edges: edges.map((e) => ({ from: e.from, to: e.to, points: e.chain.flatMap((v) => center.get(v)) })),
    layers: layers.map((l) => l.filter((id) => !dummy.has(id))),
    crossings: bestC,
    direction: tb ? 'TB' : 'LR',
    width: tb ? Math.max(0, extent) : along,
    height: tb ? along : Math.max(0, extent),
  };
}

/** Kette einer Aufgabe: alle direkten und indirekten Voraussetzungen und Abhängigen plus die Aufgabe selbst. */
export function dependencyChain(state, id) {
  req(state, id);
  const dependents = new Map();
  for (const t of Object.values(state.tasks)) for (const d of t.dependsOn) {
    if (!dependents.has(d)) dependents.set(d, []);
    dependents.get(d).push(t.id);
  }
  const out = new Set([id]);
  for (const next of [(x) => state.tasks[x]?.dependsOn || [], (x) => dependents.get(x) || []]) {
    const stack = [id];
    const seen = new Set([id]);
    while (stack.length) {
      for (const n of next(stack.pop())) if (!seen.has(n) && state.tasks[n]) { seen.add(n); out.add(n); stack.push(n); }
    }
  }
  return out;
}

/** Aufgaben außerhalb des Teilbaums von id, die von id oder einem Unter-Todo abhängen (Warnung vor dem Löschen). */
export function externalDependents(state, id) {
  const inside = new Set([id, ...getDescendantIds(state, id)]);
  const order = treePositions(state);
  return Object.values(state.tasks)
    .filter((t) => !inside.has(t.id) && t.dependsOn.some((d) => inside.has(d)))
    .sort((a, b) => order.get(a.id) - order.get(b.id))
    .map((t) => t.id);
}

/** Status für Farbgebung: 'done' | 'blocked' | 'open'. */
export function taskStatus(state, id) {
  const t = req(state, id);
  if (t.done) return 'done';
  return isBlocked(state, id) ? 'blocked' : 'open';
}

// ---------------------------------------------------------------- Suche, Filter, "Als Nächstes"

/** Alle Suchwörter (case-insensitiv) müssen in Titel, Notizen oder Tags vorkommen. */
export function matchesQuery(task, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${task.title}\n${task.notes}\n${task.tags.map((t) => '#' + t).join(' ')}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * Titelsuche für Auswahllisten: nur Titel, die den Suchtext enthalten (leer = alle). Sortierung: exakter Titel >
 * beginnt mit Suchtext > Wort beginnt mit Suchtext > enthält; bei Gleichstand höhere Ebene zuerst, dann Baumreihenfolge.
 */
export function searchByTitle(state, query, { exclude = [] } = {}) {
  const q = String(query ?? '').trim().toLowerCase();
  const skip = new Set(exclude);
  const order = treePositions(state);
  const rank = (title) => {
    const t = title.toLowerCase();
    if (!q) return 0;
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.split(/[\s\-/]+/).some((w) => w.startsWith(q))) return 2;
    return t.includes(q) ? 3 : -1;
  };
  return Object.values(state.tasks)
    .map((t) => ({ t, r: skip.has(t.id) ? -1 : rank(t.title) }))
    .filter((x) => x.r >= 0)
    .map((x) => ({ ...x, d: getDepth(state, x.t.id), o: order.get(x.t.id) }))
    .sort((a, b) => (q ? a.r - b.r || a.d - b.d : 0) || a.o - b.o)
    .map((x) => x.t.id);
}

export function matchesStatus(state, task, status, today) {
  switch (status) {
    case 'all': return true;
    case 'open': return !task.done;
    case 'done': return task.done;
    case 'today': return !task.done && task.due === today;
    case 'overdue': return !task.done && task.due !== null && task.due < today;
    case 'blocked': return !task.done && isBlocked(state, task.id);
    default: throw new LogicError('INVALID_FILTER', `Unbekannter Filter: ${status}`);
  }
}

/** Treffer-IDs in Baumreihenfolge. */
export function filterTasks(state, { status = 'all', query = '', tag = null, today = toDateString() } = {}) {
  const t0 = tag ? String(tag).replace(/^#/, '').toLowerCase() : null;
  const order = treePositions(state);
  return Object.values(state.tasks)
    .filter((t) => matchesStatus(state, t, status, today) && matchesQuery(t, query) && (!t0 || t.tags.includes(t0)))
    .sort((a, b) => order.get(a.id) - order.get(b.id))
    .map((t) => t.id);
}

/** Treffer plus deren Vorfahren (damit der Baum den Kontext zeigt). */
export function withAncestors(state, ids) {
  const s = new Set(ids);
  for (const id of ids) for (const a of getAncestorIds(state, id)) s.add(a);
  return s;
}

/**
 * "Als Nächstes": offen, nicht (auch nicht über Vorfahren) blockiert, keine offenen Unter-Todos.
 * Sortierung: Fälligkeit aufsteigend (ohne Datum zuletzt) > Priorität absteigend > Baumreihenfolge.
 */
export function nextTasks(state, { limit = Infinity } = {}) {
  const index = buildChildIndex(state);
  const order = treePositions(state, index);
  return Object.values(state.tasks)
    .filter((t) => !t.done && !(index.get(t.id) || []).some((c) => !c.done) && !isEffectivelyBlocked(state, t.id))
    .sort((a, b) => {
      if (a.due !== b.due) {
        if (a.due === null) return 1;
        if (b.due === null) return -1;
        return a.due < b.due ? -1 : 1;
      }
      return b.priority - a.priority || order.get(a.id) - order.get(b.id);
    })
    .slice(0, limit)
    .map((t) => t.id);
}

/** Anzahl je Filter (für Sidebar-Badges). */
export function countByFilter(state, today = toDateString()) {
  const c = Object.fromEntries(FILTERS.map((f) => [f, 0]));
  for (const t of Object.values(state.tasks)) for (const f of FILTERS) if (matchesStatus(state, t, f, today)) c[f]++;
  return c;
}

export function collectTags(state) {
  const m = new Map();
  for (const t of Object.values(state.tasks)) for (const g of t.tags) m.set(g, (m.get(g) || 0) + 1);
  return [...m].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'de'));
}

const REL_DAYS = { heute: 0, morgen: 1, 'übermorgen': 2 };
const WEEKDAYS = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
const WD_SHORT = ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'];

/** Datumswort -> YYYY-MM-DD | null: heute/morgen/übermorgen, Wochentag (nächster, 1–7 Tage), TT.MM. (vorbei =
 * nächstes Jahr), TT.MM.JJJJ, JJJJ-MM-TT. short=false: ohne Kürzel mo..so ("so" im Fließtext). */
export function parseDateWord(word, today = toDateString(), { short = true } = {}) {
  const w = String(word ?? '').toLowerCase();
  if (w in REL_DAYS) return addDays(today, REL_DAYS[w]);
  let wd = WEEKDAYS.indexOf(w);
  if (wd < 0 && short) wd = WD_SHORT.indexOf(w.replace(/\.$/, ''));
  if (wd >= 0) {
    const [y, m, d] = today.split('-').map(Number);
    const cur = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return addDays(today, ((wd - cur + 7) % 7) || 7);
  }
  if (isValidDate(w)) return w;
  const dm = w.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/);
  if (dm) {
    const p = (n) => String(n).padStart(2, '0');
    const year = dm[3] ? Number(dm[3]) : Number(today.slice(0, 4));
    let s = `${year}-${p(dm[2])}-${p(dm[1])}`;
    if (!isValidDate(s)) return null;
    if (!dm[3] && s < today) s = `${year + 1}-${p(dm[2])}-${p(dm[1])}`;
    return isValidDate(s) ? s : null;
  }
  return null;
}

/**
 * Schnelleingabe: "Steuer machen #büro !hoch morgen". #tag, !1..!3 bzw. !niedrig/!mittel/!hoch, Datum mit @ (alle
 * Formen aus parseDateWord, z. B. @fr) oder ohne @ (nur klein geschriebene Wörter wie morgen/freitag sowie 12.12.,
 * 12.12.2026, 2026-12-12; "Morgen" als Nomen bleibt Titel). Erstes Datum gilt, @ hat Vorrang.
 */
export function parseQuickInput(text, { today = toDateString() } = {}) {
  const tags = [];
  let priority = 0;
  let due = null;
  const PRIO = { '1': 1, '2': 2, '3': 3, niedrig: 1, mittel: 2, hoch: 3 };
  let rest = String(text ?? '')
    .replace(/(^|\s)#([\p{L}\p{N}_\-/]+)/gu, (m, pre, tag) => { tags.push(tag); return pre; })
    .replace(/(^|\s)!(\S+)(?=\s|$)/gu, (m, pre, v) => {
      const p = PRIO[v.toLowerCase()];
      if (p === undefined) return m;
      priority = p; return pre;
    })
    .replace(/(^|\s)@(\S+)(?=\s|$)/gu, (m, pre, v) => {
      const d = parseDateWord(v, today);
      if (!d) return m;
      due = due ?? d; return pre;
    });
  if (due === null) {
    rest = rest.replace(/(^|\s)(\p{Ll}+|[\d.-]+)(?=\s|$)/gu, (m, pre, v) => {
      if (due !== null || (/^\p{Ll}+$/u.test(v) && !(v in REL_DAYS) && !WEEKDAYS.includes(v))) return m;
      const d = parseDateWord(v, today, { short: false });
      if (!d) return m;
      due = d; return pre;
    });
  }
  return { title: rest.replace(/\s+/g, ' ').trim(), tags: normalizeTags(tags), priority, due };
}

// ---------------------------------------------------------------- Einstellungen (nicht Undo-relevant)

export function setCollapsed(state, id, collapsed) {
  const has = state.settings.collapsed.includes(id);
  if (has === !!collapsed) return state;
  const list = collapsed ? [...state.settings.collapsed, id] : state.settings.collapsed.filter((c) => c !== id);
  return { ...state, settings: { ...state.settings, collapsed: list } };
}

export function setTheme(state, theme) {
  if (!THEMES.includes(theme)) throw new LogicError('INVALID_THEME', `Unbekanntes Theme: ${theme}`);
  return state.settings.theme === theme ? state : { ...state, settings: { ...state.settings, theme } };
}

// ---------------------------------------------------------------- Undo/Redo (Snapshot-Stack)

export function createHistory(present, limit = HISTORY_LIMIT) {
  return { past: [], present, future: [], limit };
}

export function commit(h, next) {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > h.limit) past.splice(0, past.length - h.limit);
  return { ...h, past, present: next, future: [] };
}

export const canUndo = (h) => h.past.length > 0;
export const canRedo = (h) => h.future.length > 0;

export function undo(h) {
  if (!canUndo(h)) return h;
  return { ...h, past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h) {
  if (!canRedo(h)) return h;
  return { ...h, past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

// ---------------------------------------------------------------- Migration, Import/Export

/** v0 = Prototyp-Format: tasks als Array oder Objekt, Felder blockedBy/doneAt, fehlende Defaults. */
function migrateV0toV1(d) {
  const list = Array.isArray(d.tasks) ? d.tasks : Object.values(d.tasks ?? {});
  const tasks = {};
  list.forEach((t, i) => {
    if (!t || typeof t !== 'object') throw new LogicError('INVALID', `Eintrag ${i} ist keine Aufgabe.`);
    const { blockedBy, doneAt, ...rest } = t;
    tasks[t.id] = {
      notes: '', done: false, parentId: null, order: i, priority: 0, due: null, tags: [],
      createdAt: EPOCH, updatedAt: t.createdAt ?? EPOCH,
      ...rest,
      dependsOn: t.dependsOn ?? blockedBy ?? [],
      completedAt: t.completedAt ?? doneAt ?? null,
    };
  });
  const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
  return { version: 1, tasks, settings: { theme: s.theme ?? 'system', collapsed: s.collapsed ?? [] } };
}

export const MIGRATIONS = { 0: migrateV0toV1 };

/** Hebt Rohdaten schrittweise auf SCHEMA_VERSION. Wirft LogicError bei unbekanntem/zu neuem Format. */
export function migrate(raw) {
  let data = Array.isArray(raw) ? { version: 0, tasks: raw } : raw;
  if (!data || typeof data !== 'object') throw new LogicError('INVALID', 'Keine gültigen Daten.');
  let v = data.version ?? 0;
  if (!Number.isInteger(v) || v < 0) throw new LogicError('INVALID', 'Ungültige Schema-Version.');
  if (v > SCHEMA_VERSION) throw new LogicError('TOO_NEW', `Daten stammen aus neuerer Version (${v}).`);
  while (v < SCHEMA_VERSION) {
    data = MIGRATIONS[v](data);
    v = data.version;
  }
  return data;
}

const TASK_FIELDS = ['id', 'title', 'notes', 'done', 'parentId', 'order', 'priority', 'due', 'tags',
  'dependsOn', 'createdAt', 'updatedAt', 'completedAt'];

/**
 * Validiert und normalisiert (JSON-String oder Objekt). Ergebnis: { ok: true, state } | { ok: false, errors }.
 * Unbekannte Felder werden verworfen, unbekannte IDs in settings.collapsed entfernt.
 */
export function validateState(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));
  } catch {
    return { ok: false, errors: ['Datei ist kein gültiges JSON.'] };
  }
  try {
    data = migrate(data);
  } catch (e) {
    return { ok: false, errors: [e.message] };
  }
  const errors = [];
  const err = (m) => { if (errors.length < 20) errors.push(m); };
  if (!data.tasks || typeof data.tasks !== 'object' || Array.isArray(data.tasks)) {
    return { ok: false, errors: ['Feld "tasks" fehlt oder ist ungültig.'] };
  }
  const tasks = {};
  const str = (v) => typeof v === 'string';
  for (const [key, t] of Object.entries(data.tasks)) {
    if (!t || typeof t !== 'object') { err(`Aufgabe ${key}: kein Objekt.`); continue; }
    const p = `Aufgabe ${key}`;
    if (t.id !== key || !str(key) || !key) err(`${p}: id passt nicht zum Schlüssel.`);
    if (!str(t.title) || !t.title.trim()) err(`${p}: Titel fehlt.`);
    if (!str(t.notes)) err(`${p}: notes muss Text sein.`);
    if (typeof t.done !== 'boolean') err(`${p}: done muss true/false sein.`);
    if (t.parentId !== null && !(str(t.parentId) && t.parentId in data.tasks && t.parentId !== key)) err(`${p}: ungültiger parentId.`);
    if (typeof t.order !== 'number' || !Number.isFinite(t.order)) err(`${p}: order muss Zahl sein.`);
    if (!Number.isInteger(t.priority) || t.priority < 0 || t.priority > 3) err(`${p}: priority muss 0–3 sein.`);
    if (t.due !== null && !isValidDate(t.due)) err(`${p}: ungültiges Fälligkeitsdatum.`);
    if (!Array.isArray(t.tags) || !t.tags.every(str)) err(`${p}: tags muss Liste von Texten sein.`);
    if (!Array.isArray(t.dependsOn) || !t.dependsOn.every((d) => str(d) && d in data.tasks && d !== key)) err(`${p}: ungültige Abhängigkeit.`);
    if (!str(t.createdAt) || !str(t.updatedAt)) err(`${p}: Zeitstempel fehlen.`);
    if (t.completedAt !== null && !str(t.completedAt)) err(`${p}: completedAt ungültig.`);
    const n = {};
    for (const f of TASK_FIELDS) n[f] = t[f];
    if (Array.isArray(n.tags)) n.tags = normalizeTags(n.tags);
    if (Array.isArray(n.dependsOn)) n.dependsOn = [...new Set(n.dependsOn)];
    tasks[key] = n;
  }
  if (errors.length) return { ok: false, errors };
  const state = {
    version: SCHEMA_VERSION,
    tasks,
    settings: {
      theme: THEMES.includes(data.settings?.theme) ? data.settings.theme : 'system',
      collapsed: Array.isArray(data.settings?.collapsed) ? data.settings.collapsed.filter((c) => c in tasks) : [],
    },
  };
  for (const id of Object.keys(tasks)) {
    const seen = new Set([id]);
    let p = tasks[id].parentId;
    while (p !== null) {
      if (seen.has(p)) { err(`Aufgabe ${id}: Elternkette ist zyklisch.`); break; }
      seen.add(p);
      p = tasks[p].parentId;
    }
  }
  const cycle = detectCycle(state);
  if (cycle) err(cycleMessage(state, cycle));
  return errors.length ? { ok: false, errors } : { ok: true, state };
}

export function exportState(state) {
  return JSON.stringify(state, null, 2);
}
