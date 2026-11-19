import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';

const NOW = '2026-11-19T10:00:00.000Z';
const TODAY = '2026-11-19';
const o = (id) => ({ id, now: NOW });

/** a, b, c auf Wurzelebene; a1, a2 unter a; a1x unter a1 */
function sample() {
  let s = L.createState();
  s = L.addTask(s, { title: 'A' }, o('a'));
  s = L.addTask(s, { title: 'B' }, o('b'));
  s = L.addTask(s, { title: 'C' }, o('c'));
  s = L.addTask(s, { title: 'A1', parentId: 'a' }, o('a1'));
  s = L.addTask(s, { title: 'A2', parentId: 'a' }, o('a2'));
  s = L.addTask(s, { title: 'A1x', parentId: 'a1' }, o('a1x'));
  return s;
}
const ids = (rows) => rows.map((r) => r.id);

// ---- CRUD
test('createState hat Version und leere Aufgaben', () => {
  const s = L.createState();
  assert.equal(s.version, L.SCHEMA_VERSION);
  assert.deepEqual(s.tasks, {});
  assert.deepEqual(s.settings, { theme: 'system', collapsed: [] });
});

test('addTask legt Aufgabe mit allen Feldern an und ist unveränderlich', () => {
  const s0 = L.createState();
  const s = L.addTask(s0, { title: '  Brot  ', priority: 2, due: TODAY, tags: ['#Einkauf'] }, o('x'));
  assert.deepEqual(s0.tasks, {});
  assert.deepEqual(s.tasks.x, {
    id: 'x', title: 'Brot', notes: '', done: false, parentId: null, order: 0, priority: 2, due: TODAY,
    tags: ['einkauf'], dependsOn: [], createdAt: NOW, updatedAt: NOW, completedAt: null,
  });
});

test('addTask lehnt leeren Titel, unbekannten Parent, ungültiges Datum und Priorität ab', () => {
  const s = L.createState();
  assert.throws(() => L.addTask(s, { title: '  ' }), { code: 'EMPTY_TITLE' });
  assert.throws(() => L.addTask(s, { title: 'x', parentId: 'nope' }), { code: 'NOT_FOUND' });
  assert.throws(() => L.addTask(s, { title: 'x', due: '2026-02-30' }), { code: 'INVALID_DATE' });
  assert.throws(() => L.addTask(s, { title: 'x', priority: 5 }), { code: 'INVALID_PRIORITY' });
});

test('addTask mit afterId fügt direkt hinter Geschwister ein', () => {
  let s = sample();
  s = L.addTask(s, { title: 'AB' }, { ...o('ab'), afterId: 'a' });
  assert.deepEqual(L.getChildren(s, null).map((t) => t.id), ['a', 'ab', 'b', 'c']);
  assert.deepEqual(L.getChildren(s, null).map((t) => t.order), [0, 1, 2, 3]);
});

test('generateId liefert eindeutige IDs', () => {
  const set = new Set(Array.from({ length: 500 }, () => L.generateId()));
  assert.equal(set.size, 500);
});

test('updateTask ändert Felder und updatedAt, unverändert gibt gleiche Referenz', () => {
  const s = sample();
  const s2 = L.updateTask(s, 'b', { title: 'B neu', notes: 'Zeile1\nZeile2', tags: ['x'] }, { now: 'T2' });
  assert.equal(s2.tasks.b.title, 'B neu');
  assert.equal(s2.tasks.b.notes, 'Zeile1\nZeile2');
  assert.equal(s2.tasks.b.updatedAt, 'T2');
  assert.equal(s2.tasks.a, s.tasks.a);
  assert.equal(L.updateTask(s, 'b', { title: 'B' }), s);
});

test('deleteTask entfernt Teilbaum, Referenzen in dependsOn und collapsed', () => {
  let s = sample();
  s = L.addDependency(s, 'b', 'a1x');
  s = L.addDependency(s, 'c', 'b');
  s = L.setCollapsed(s, 'a1', true);
  s = L.deleteTask(s, 'a');
  assert.deepEqual(Object.keys(s.tasks).sort(), ['b', 'c']);
  assert.deepEqual(s.tasks.b.dependsOn, []);
  assert.deepEqual(s.tasks.c.dependsOn, ['b']);
  assert.deepEqual(s.settings.collapsed, []);
  assert.deepEqual(L.getChildren(s, null).map((t) => t.order), [0, 1]);
});

// ---- Baum
test('flattenTree liefert DFS-Reihenfolge mit Tiefe und respektiert collapsed', () => {
  const s = sample();
  assert.deepEqual(L.flattenTree(s).map((r) => [r.id, r.depth]),
    [['a', 0], ['a1', 1], ['a1x', 2], ['a2', 1], ['b', 0], ['c', 0]]);
  assert.deepEqual(ids(L.flattenTree(s, { collapsed: ['a'] })), ['a', 'b', 'c']);
  assert.equal(L.flattenTree(s)[0].hasChildren, true);
});

test('getDescendantIds und getAncestorIds', () => {
  const s = sample();
  assert.deepEqual(L.getDescendantIds(s, 'a'), ['a1', 'a1x', 'a2']);
  assert.deepEqual(L.getAncestorIds(s, 'a1x'), ['a1', 'a']);
  assert.equal(L.getDepth(s, 'a1x'), 2);
});

test('indent/outdent verschieben korrekt', () => {
  let s = sample();
  s = L.indent(s, 'b');
  assert.equal(s.tasks.b.parentId, 'a');
  assert.deepEqual(L.getChildren(s, 'a').map((t) => t.id), ['a1', 'a2', 'b']);
  s = L.outdent(s, 'b');
  assert.equal(s.tasks.b.parentId, null);
  assert.deepEqual(L.getChildren(s, null).map((t) => t.id), ['a', 'b', 'c']);
  assert.equal(L.indent(s, 'a'), s, 'erstes Element kann nicht eingerückt werden');
  assert.equal(L.outdent(s, 'a'), s);
});

test('moveUp/moveDown/moveTask innerhalb einer Ebene', () => {
  let s = sample();
  s = L.moveDown(s, 'a');
  assert.deepEqual(L.getChildren(s, null).map((t) => t.id), ['b', 'a', 'c']);
  s = L.moveUp(s, 'c');
  assert.deepEqual(L.getChildren(s, null).map((t) => t.id), ['b', 'c', 'a']);
  assert.equal(L.moveUp(s, 'b'), s);
  s = L.moveTask(s, 'a', { index: 0 });
  assert.deepEqual(L.getChildren(s, null).map((t) => t.id), ['a', 'b', 'c']);
});

test('moveTask verhindert Verschieben in eigenen Nachfahren', () => {
  const s = sample();
  assert.throws(() => L.moveTask(s, 'a', { parentId: 'a1x' }), { code: 'INVALID_MOVE' });
  assert.throws(() => L.moveTask(s, 'a', { parentId: 'a' }), { code: 'INVALID_MOVE' });
});

// ---- Fortschritt / Abhaken
test('progress zählt alle Nachfahren', () => {
  let s = sample();
  assert.deepEqual(L.progress(s, 'a'), { done: 0, total: 3, ratio: 0 });
  s = L.setDone(s, 'a1x', true);
  s = L.setDone(s, 'a2', true);
  const p = L.progress(s, 'a');
  assert.equal(p.done, 2);
  assert.equal(p.total, 3);
  assert.deepEqual(L.progress(s, 'b'), { done: 0, total: 0, ratio: 0 });
});

test('setDone mit cascade hakt Unter-Todos ab, ohne nicht', () => {
  const s = sample();
  const s1 = L.setDone(s, 'a', true, { now: NOW });
  assert.equal(s1.tasks.a.done, true);
  assert.equal(s1.tasks.a.completedAt, NOW);
  assert.equal(s1.tasks.a1.done, false);
  assert.equal(L.hasOpenDescendants(s1, 'a'), true);
  const s2 = L.setDone(s, 'a', true, { cascade: true });
  assert.ok(['a', 'a1', 'a1x', 'a2'].every((id) => s2.tasks[id].done));
  const s3 = L.toggleDone(s2, 'a');
  assert.equal(s3.tasks.a.done, false);
  assert.equal(s3.tasks.a.completedAt, null);
  assert.equal(s3.tasks.a1.done, true);
});

// ---- Abhängigkeiten
test('blockiert-Status folgt dem Erledigt-Zustand der Voraussetzung', () => {
  let s = sample();
  s = L.addDependency(s, 'c', 'b');
  assert.equal(L.isBlocked(s, 'c'), true);
  assert.deepEqual(L.getBlockers(s, 'c'), ['b']);
  assert.deepEqual(L.getDependents(s, 'b'), ['c']);
  assert.equal(L.taskStatus(s, 'c'), 'blocked');
  s = L.setDone(s, 'b', true);
  assert.equal(L.isBlocked(s, 'c'), false);
  assert.equal(L.taskStatus(s, 'b'), 'done');
});

test('Zyklus A->B->A wird abgelehnt, Daten bleiben unverändert', () => {
  let s = sample();
  s = L.addDependency(s, 'a', 'b');
  const before = JSON.stringify(s);
  assert.throws(() => L.addDependency(s, 'b', 'a'), (e) => {
    assert.equal(e.code, 'CYCLE');
    assert.deepEqual(e.cycle, ['b', 'a', 'b']);
    assert.match(e.message, /Zyklus/);
    return true;
  });
  assert.equal(JSON.stringify(s), before);
});

test('längerer Zyklus und Selbstabhängigkeit werden erkannt', () => {
  let s = sample();
  s = L.addDependency(s, 'a', 'b');
  s = L.addDependency(s, 'b', 'c');
  assert.deepEqual(L.wouldCreateCycle(s, 'c', 'a'), ['c', 'a', 'b', 'c']);
  assert.deepEqual(L.wouldCreateCycle(s, 'a', 'a'), ['a', 'a']);
  assert.equal(L.wouldCreateCycle(s, 'a', 'c'), null, 'transitive Kante ohne Zyklus erlaubt');
});

test('Abhängigkeit auf Vorfahren/Nachfahren ist erlaubt', () => {
  let s = sample();
  s = L.addDependency(s, 'a', 'a1x');
  s = L.addDependency(s, 'a2', 'a');
  assert.deepEqual(s.tasks.a.dependsOn, ['a1x']);
  assert.deepEqual(s.tasks.a2.dependsOn, ['a']);
});

test('setDependencies dedupliziert, prüft Existenz, removeDependency entfernt', () => {
  let s = sample();
  s = L.setDependencies(s, 'c', ['a', 'b', 'a']);
  assert.deepEqual(s.tasks.c.dependsOn, ['a', 'b']);
  assert.throws(() => L.setDependencies(s, 'c', ['zzz']), { code: 'NOT_FOUND' });
  s = L.removeDependency(s, 'c', 'a');
  assert.deepEqual(s.tasks.c.dependsOn, ['b']);
});

test('detectCycle findet Zyklus in importierten Daten', () => {
  const s = sample();
  assert.equal(L.detectCycle(s), null);
  const bad = { ...s, tasks: { ...s.tasks, a: { ...s.tasks.a, dependsOn: ['b'] }, b: { ...s.tasks.b, dependsOn: ['a'] } } };
  const c = L.detectCycle(bad);
  assert.ok(c && c[0] === c[c.length - 1]);
});

// ---- Graph
test('computeLayers: längster Pfad bestimmt Ebene', () => {
  let s = sample();
  s = L.addDependency(s, 'c', 'b');
  s = L.addDependency(s, 'c', 'a');
  s = L.addDependency(s, 'b', 'a');
  const layers = L.computeLayers(s, ['a', 'b', 'c']);
  assert.deepEqual([layers.get('a'), layers.get('b'), layers.get('c')], [0, 1, 2]);
});

test('layoutGraph: Kanten zeigen nach rechts, Koordinaten und Größe stimmen', () => {
  let s = sample();
  s = L.addDependency(s, 'c', 'b');
  s = L.addDependency(s, 'b', 'a');
  const g = L.layoutGraph(s, { nodeWidth: 100, gapX: 50, nodeHeight: 40, gapY: 10 });
  assert.equal(g.nodes.length, 3);
  assert.equal(g.edges.length, 2);
  const x = Object.fromEntries(g.nodes.map((n) => [n.id, n.x]));
  for (const e of g.edges) assert.ok(x[e.from] < x[e.to]);
  assert.equal(g.width, 3 * 150 - 50);
  assert.equal(g.height, 40);
  assert.deepEqual(L.linkedIds(L.createState()), []);
});

test('layoutGraph reduziert Kreuzungen per Median-Heuristik', () => {
  let s = L.createState();
  for (const id of ['p1', 'p2', 'p3', 'q1', 'q2', 'q3']) s = L.addTask(s, { title: id }, o(id));
  // Baumreihenfolge q1,q2,q3 ist "verdreht" zu p3,p2,p1
  s = L.addDependency(s, 'q1', 'p3');
  s = L.addDependency(s, 'q2', 'p2');
  s = L.addDependency(s, 'q3', 'p1');
  const g = L.layoutGraph(s);
  assert.equal(g.crossings, 0);
  assert.equal(L.countCrossings([['p1', 'p2', 'p3'], ['q1', 'q2', 'q3']], g.edges), 3);
});

test('layoutGraph mit 200 Knoten unter 500 ms', () => {
  let s = L.createState();
  const tasks = {};
  for (let i = 0; i < 200; i++) {
    const deps = i > 0 ? [`n${(i * 7) % i}`, `n${Math.floor(i / 2)}`].filter((d, k, a) => a.indexOf(d) === k && d !== `n${i}`) : [];
    tasks[`n${i}`] = { id: `n${i}`, title: `N${i}`, notes: '', done: false, parentId: null, order: i, priority: 0,
      due: null, tags: [], dependsOn: deps, createdAt: NOW, updatedAt: NOW, completedAt: null };
  }
  s = { ...s, tasks };
  const t0 = performance.now();
  const g = L.layoutGraph(s);
  assert.ok(performance.now() - t0 < 500);
  assert.equal(g.nodes.length, 200);
});

// ---- Filter, Suche, Als Nächstes
test('filterTasks: Status-Filter', () => {
  let s = sample();
  s = L.updateTask(s, 'b', { due: TODAY });
  s = L.updateTask(s, 'c', { due: '2026-11-01' });
  s = L.setDone(s, 'a2', true);
  s = L.addDependency(s, 'a1', 'b');
  const f = (status) => L.filterTasks(s, { status, today: TODAY });
  assert.equal(f('all').length, 6);
  assert.deepEqual(f('done'), ['a2']);
  assert.deepEqual(f('open'), ['a', 'a1', 'a1x', 'b', 'c']);
  assert.deepEqual(f('today'), ['b']);
  assert.deepEqual(f('overdue'), ['c']);
  assert.deepEqual(f('blocked'), ['a1']);
  assert.throws(() => f('quatsch'), { code: 'INVALID_FILTER' });
  assert.deepEqual(L.countByFilter(s, TODAY), { all: 6, open: 5, done: 1, today: 1, overdue: 1, blocked: 1 });
});

test('filterTasks: Volltextsuche (alle Wörter, Notizen, Tags) und Tag-Filter', () => {
  let s = sample();
  s = L.updateTask(s, 'b', { notes: 'Milch und Brot', tags: ['einkauf'] });
  s = L.updateTask(s, 'c', { tags: ['Einkauf', 'büro'] });
  assert.deepEqual(L.filterTasks(s, { query: 'milch BROT' }), ['b']);
  assert.deepEqual(L.filterTasks(s, { query: '#büro' }), ['c']);
  assert.deepEqual(L.filterTasks(s, { tag: '#einkauf' }), ['b', 'c']);
  assert.deepEqual(L.collectTags(s), [{ tag: 'einkauf', count: 2 }, { tag: 'büro', count: 1 }]);
});

test('withAncestors ergänzt Kontext für Baumanzeige', () => {
  const s = sample();
  const inc = L.withAncestors(s, ['a1x']);
  assert.deepEqual([...inc].sort(), ['a', 'a1', 'a1x']);
  assert.deepEqual(ids(L.flattenTree(s, { include: inc, collapsed: [] })), ['a', 'a1', 'a1x']);
});

test('nextTasks: nur offene, unblockierte Blätter, sortiert nach Fälligkeit > Priorität', () => {
  let s = sample();
  s = L.updateTask(s, 'c', { priority: 3 });
  s = L.updateTask(s, 'a2', { due: '2026-11-25' });
  s = L.updateTask(s, 'a1x', { due: '2026-11-20' });
  s = L.addDependency(s, 'b', 'c');
  // a, a1 haben offene Kinder; b ist blockiert
  assert.deepEqual(L.nextTasks(s), ['a1x', 'a2', 'c']);
  s = L.setDone(s, 'c', true);
  assert.deepEqual(L.nextTasks(s), ['a1x', 'a2', 'b']);
  assert.deepEqual(L.nextTasks(s, { limit: 1 }), ['a1x']);
});

test('nextTasks: Kinder eines blockierten Elternteils sind nicht dran; Parent mit erledigten Kindern schon', () => {
  let s = sample();
  s = L.addDependency(s, 'a', 'c');
  assert.ok(!L.nextTasks(s).includes('a1x'));
  assert.equal(L.isEffectivelyBlocked(s, 'a1x'), true);
  s = L.setDone(s, 'a2', true);
  s = L.setDone(s, 'a1x', true);
  s = L.setDone(s, 'a1', true);
  s = L.setDone(s, 'c', true);
  assert.ok(L.nextTasks(s).includes('a'));
});

test('parseQuickInput erkennt #tags, !prio und @datum', () => {
  assert.deepEqual(L.parseQuickInput('Steuer machen #Büro !hoch @morgen', { today: TODAY }),
    { title: 'Steuer machen', tags: ['büro'], priority: 3, due: '2026-11-20' });
  assert.deepEqual(L.parseQuickInput('Mail an a@b.de !2 @2026-12-24 #x #x', { today: TODAY }),
    { title: 'Mail an a@b.de', tags: ['x'], priority: 2, due: '2026-12-24' });
  assert.deepEqual(L.parseQuickInput('Achtung ! wichtig @übermorgen', { today: '2026-12-31' }),
    { title: 'Achtung ! wichtig', tags: [], priority: 0, due: '2027-01-02' });
});

// ---- Undo
test('Undo/Redo mit Snapshot-Stack', () => {
  let h = L.createHistory(L.createState());
  h = L.commit(h, L.addTask(h.present, { title: 'x' }, o('x')));
  h = L.commit(h, L.addTask(h.present, { title: 'y' }, o('y')));
  assert.equal(Object.keys(h.present.tasks).length, 2);
  h = L.undo(h);
  assert.deepEqual(Object.keys(h.present.tasks), ['x']);
  assert.ok(L.canRedo(h));
  h = L.redo(h);
  assert.deepEqual(Object.keys(h.present.tasks), ['x', 'y']);
  h = L.undo(h);
  h = L.commit(h, L.addTask(h.present, { title: 'z' }, o('z')));
  assert.equal(L.canRedo(h), false, 'neue Aktion verwirft Redo');
  assert.equal(L.commit(h, h.present), h, 'No-op erzeugt keinen Schritt');
});

test('Undo-Stack begrenzt auf 50 Schritte', () => {
  let h = L.createHistory(L.createState());
  for (let i = 0; i < 60; i++) h = L.commit(h, L.addTask(h.present, { title: `t${i}` }, o(`t${i}`)));
  assert.equal(h.past.length, L.HISTORY_LIMIT);
  while (L.canUndo(h)) h = L.undo(h);
  assert.equal(Object.keys(h.present.tasks).length, 10);
});

// ---- Import/Export/Migration
test('Export -> Import ergibt identischen Zustand', () => {
  let s = sample();
  s = L.addDependency(s, 'c', 'a1x');
  s = L.updateTask(s, 'b', { tags: ['x'], due: TODAY, priority: 1, notes: 'n' });
  s = L.setCollapsed(s, 'a', true);
  s = L.setTheme(s, 'dark');
  const r = L.validateState(L.exportState(s));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, s);
});

test('Import lehnt kaputtes JSON, falsche Felder, fremde IDs und Zyklen ab', () => {
  assert.deepEqual(L.validateState('{kaputt'), { ok: false, errors: ['Datei ist kein gültiges JSON.'] });
  assert.equal(L.validateState('"text"').ok, false);
  assert.equal(L.validateState({ version: 1, tasks: [] }).ok, false);
  const s = sample();
  const mk = (patch) => ({ ...s, tasks: { ...s.tasks, b: { ...s.tasks.b, ...patch } } });
  assert.equal(L.validateState(mk({ title: '' })).ok, false);
  assert.equal(L.validateState(mk({ due: '2026-13-01' })).ok, false);
  assert.equal(L.validateState(mk({ priority: 9 })).ok, false);
  assert.equal(L.validateState(mk({ dependsOn: ['gibtsnicht'] })).ok, false);
  assert.equal(L.validateState(mk({ parentId: 'b' })).ok, false);
  const cyc = { ...s, tasks: { ...s.tasks, a: { ...s.tasks.a, dependsOn: ['b'] }, b: { ...s.tasks.b, dependsOn: ['a'] } } };
  const r = L.validateState(cyc);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /Zyklus/);
  const pc = { ...s, tasks: { ...s.tasks, a: { ...s.tasks.a, parentId: 'a1' } } };
  assert.equal(L.validateState(pc).ok, false);
});

test('Import verwirft unbekannte Felder und lehnt neuere Schema-Version ab', () => {
  const s = sample();
  const extra = { ...s, tasks: { ...s.tasks, b: { ...s.tasks.b, hack: 1 } }, fremd: true };
  const r = L.validateState(extra);
  assert.equal(r.ok, true);
  assert.equal('hack' in r.state.tasks.b, false);
  assert.equal('fremd' in r.state, false);
  const neu = L.validateState({ ...s, version: 99 });
  assert.equal(neu.ok, false);
  assert.match(neu.errors[0], /neuerer Version/);
});

test('Migration v0 (Array, blockedBy, doneAt) -> v1', () => {
  const v0 = [
    { id: 'x', title: 'X', done: true, doneAt: NOW, createdAt: NOW },
    { id: 'y', title: 'Y', blockedBy: ['x'], parentId: null },
  ];
  const r = L.validateState(v0);
  assert.equal(r.ok, true, r.errors?.join());
  assert.equal(r.state.version, 1);
  assert.deepEqual(r.state.tasks.y.dependsOn, ['x']);
  assert.equal(r.state.tasks.x.completedAt, NOW);
  assert.equal('blockedBy' in r.state.tasks.y, false);
  assert.equal(r.state.tasks.y.order, 1);
  assert.equal(L.migrate({ version: 1, tasks: {} }).version, 1);
  assert.throws(() => L.migrate(null), { code: 'INVALID' });
});

test('Performance: 2000 Aufgaben filtern und abhaken unter 100 ms', () => {
  const tasks = {};
  for (let i = 0; i < 2000; i++) {
    const parentId = i % 10 === 0 ? null : `t${i - (i % 10)}`;
    tasks[`t${i}`] = { id: `t${i}`, title: `Aufgabe ${i}`, notes: '', done: i % 3 === 0, parentId, order: i,
      priority: i % 4, due: i % 5 ? null : TODAY, tags: [`g${i % 7}`], dependsOn: i > 20 && i % 4 === 0 ? [`t${i - 13}`] : [],
      createdAt: NOW, updatedAt: NOW, completedAt: null };
  }
  const s = { ...L.createState(), tasks };
  const t0 = performance.now();
  for (const status of L.FILTERS) L.filterTasks(s, { status, today: TODAY });
  const s2 = L.toggleDone(s, 't55');
  L.flattenTree(s2);
  L.nextTasks(s2);
  const dt = performance.now() - t0;
  assert.ok(dt < 100 * L.FILTERS.length, `zu langsam: ${dt.toFixed(1)} ms`);
});

test('Hilfen: isValidDate, addDays, toDateString, setTheme', () => {
  assert.equal(L.isValidDate('2024-02-29'), true);
  assert.equal(L.isValidDate('2025-02-29'), false);
  assert.equal(L.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(L.toDateString(new Date(2026, 0, 5)), '2026-01-05');
  assert.throws(() => L.setTheme(L.createState(), 'pink'), { code: 'INVALID_THEME' });
});

test('parseDateWord: relative Wörter, Wochentage, TT.MM., ISO', () => {
  // 2026-11-19 ist ein Donnerstag
  assert.equal(L.parseDateWord('heute', TODAY), '2026-11-19');
  assert.equal(L.parseDateWord('Morgen', TODAY), '2026-11-20');
  assert.equal(L.parseDateWord('fr', TODAY), '2026-11-20');
  assert.equal(L.parseDateWord('do', TODAY), '2026-11-26', 'gleicher Wochentag = nächste Woche');
  assert.equal(L.parseDateWord('montag', TODAY), '2026-11-23');
  assert.equal(L.parseDateWord('so', TODAY, { short: false }), null);
  assert.equal(L.parseDateWord('24.12.', TODAY), '2026-12-24');
  assert.equal(L.parseDateWord('3.1.', TODAY), '2027-01-03', 'vergangenes TT.MM. = nächstes Jahr');
  assert.equal(L.parseDateWord('31.02.', TODAY), null);
  assert.equal(L.parseDateWord('01.03.2027', TODAY), '2027-03-01');
  assert.equal(L.parseDateWord('2026-12-12', TODAY), '2026-12-12');
  assert.equal(L.parseDateWord('quatsch', TODAY), null);
});

test('parseQuickInput: Datum ohne @ gemäß DESIGN.md, Nomen und Kürzel bleiben Titel', () => {
  assert.deepEqual(L.parseQuickInput('Steuer machen !hoch morgen', { today: TODAY }),
    { title: 'Steuer machen', tags: [], priority: 3, due: '2026-11-20' });
  assert.deepEqual(L.parseQuickInput('Guten Morgen sagen', { today: TODAY }),
    { title: 'Guten Morgen sagen', tags: [], priority: 0, due: null });
  assert.deepEqual(L.parseQuickInput('So geht das freitag', { today: TODAY }),
    { title: 'So geht das', tags: [], priority: 0, due: '2026-11-20' });
  assert.deepEqual(L.parseQuickInput('Geschenke 24.12. #privat', { today: TODAY }),
    { title: 'Geschenke', tags: ['privat'], priority: 0, due: '2026-12-24' });
  assert.deepEqual(L.parseQuickInput('von heute auf morgen @fr', { today: TODAY }),
    { title: 'von heute auf morgen', tags: [], priority: 0, due: '2026-11-20' });
  assert.deepEqual(L.parseQuickInput('Version 1.2 testen 2026-12-01', { today: TODAY }),
    { title: 'Version 1.2 testen', tags: [], priority: 0, due: '2026-12-01' });
});

// ---- Runde 2: Dummy-Knoten, Richtung, Kette, Suche, Abhängige
const chainState = () => {
  let s = L.createState();
  for (const id of ['a', 'b', 'c', 'd', 'x', 'y']) s = L.addTask(s, { title: id }, o(id));
  s = L.addDependency(s, 'b', 'a');
  s = L.addDependency(s, 'c', 'b');
  s = L.addDependency(s, 'd', 'c');
  s = L.addDependency(s, 'd', 'a'); // lange Kante a -> d über 2 Zwischenebenen
  s = L.addDependency(s, 'y', 'x');
  return s;
};

test('layoutGraph: lange Kanten laufen über Dummy-Punkte und nie durch fremde Knoten', () => {
  const s = chainState();
  const g = L.layoutGraph(s, { nodeWidth: 100, nodeHeight: 40, gapX: 50, gapY: 10, dummySize: 12 });
  const long = g.edges.find((e) => e.from === 'a' && e.to === 'd');
  assert.equal(long.points.length, 4); // 2 Dummies × (Eintritt, Austritt)
  for (let i = 0; i < 4; i += 2) assert.equal(long.points[i].y, long.points[i + 1].y);
  assert.equal(g.edges.find((e) => e.from === 'a' && e.to === 'b').points.length, 0);
  assert.deepEqual(g.layers.flat().sort(), ['a', 'b', 'c', 'd', 'x', 'y']);
  for (const p of long.points) {
    for (const n of g.nodes) {
      const inside = p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height;
      assert.ok(!inside, `Dummy-Punkt liegt in Knoten ${n.id}`);
    }
  }
  assert.equal(g.crossings, 0);
});

test('layoutGraph: Richtung TB legt Ebenen von oben nach unten', () => {
  const s = chainState();
  const g = L.layoutGraph(s, { direction: 'TB', nodeWidth: 100, nodeHeight: 40, gapX: 30, gapY: 10 });
  const y = Object.fromEntries(g.nodes.map((n) => [n.id, n.y]));
  for (const e of g.edges) assert.ok(y[e.from] < y[e.to]);
  assert.equal(g.direction, 'TB');
  assert.equal(g.height, 4 * 70 - 30);
  for (const n of g.nodes) assert.ok(n.x + n.width <= g.width && n.y + n.height <= g.height);
});

test('dependencyChain: Vorgänger und Nachfolger transitiv, Fremdes nicht', () => {
  const s = chainState();
  assert.deepEqual([...L.dependencyChain(s, 'b')].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual([...L.dependencyChain(s, 'y')].sort(), ['x', 'y']);
  assert.throws(() => L.dependencyChain(s, 'nix'), { code: 'NOT_FOUND' });
});

test('externalDependents: Abhängige des Teilbaums außerhalb des Teilbaums', () => {
  let s = chainState();
  s = L.addTask(s, { title: 'kind', parentId: 'x' }, o('k'));
  s = L.addTask(s, { title: 'z' }, o('z'));
  s = L.addDependency(s, 'z', 'k');
  s = L.addDependency(s, 'k', 'y'); // y liegt außerhalb, k innerhalb: k ist kein externer Abhängiger
  assert.deepEqual(L.externalDependents(s, 'x'), ['y', 'z']);
  assert.deepEqual(L.externalDependents(s, 'd'), []);
});

test('searchByTitle: exakt vor Anfang vor Wortanfang vor enthält, höhere Ebene zuerst', () => {
  let s = L.createState();
  s = L.addTask(s, { title: 'Urlaub planen' }, o('u'));
  s = L.addTask(s, { title: 'Flug buchen intern', parentId: 'u' }, o('f1'));
  s = L.addTask(s, { title: 'Rückflug prüfen' }, o('f2'));
  s = L.addTask(s, { title: 'Billig Flug suchen' }, o('f3'));
  s = L.addTask(s, { title: 'Flug buchen' }, o('f4'));
  s = L.addTask(s, { title: 'flug' }, o('f5'));
  assert.deepEqual(L.searchByTitle(s, 'Flug'), ['f5', 'f4', 'f1', 'f3', 'f2']);
  assert.deepEqual(L.searchByTitle(s, 'flug', { exclude: ['f5'] }).slice(0, 1), ['f4']);
  assert.deepEqual(L.searchByTitle(s, ''), ['u', 'f1', 'f2', 'f3', 'f4', 'f5']);
});
