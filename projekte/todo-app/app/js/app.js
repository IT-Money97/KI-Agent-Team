// app.js – Einstiegspunkt: View-State, Aktionen (Store + Logik), Rendering, Verdrahtung der UI.
import {
  addTask, updateTask, deleteTask, setDone, moveTask, outdent, addDependency, removeDependency, setCollapsed,
  setTheme, parseQuickInput, generateId, toDateString, getBlockers, hasOpenDescendants, getDescendantIds,
  getAncestorIds, getChildren, isBlocked, externalDependents, setDependencies, addDays, validateState,
  PRIORITY_LABELS, LogicError,
} from './logic.js';
import { createStore } from './store.js';
import { renderList, renderNext, initList, startInlineEdit, moveRelative, prevShownSibling, indexRelative } from './ui/list.js';
import { renderSidebar, VIEW_LABELS, FILTER_LABELS } from './ui/sidebar.js';
import { renderDetail, initDetail, flushDetail } from './ui/detail.js';
import { toast, announce, initToast } from './ui/toast.js';
import { confirmDialog, openHelp, initDialogs } from './ui/dialog.js';
import { $, h, hydrateIcons, relDate } from './ui/dom.js';
import { renderGraph } from './graph.js';
import { bindKeys } from './keys.js';

const store = createStore({ onError: (e) => toast(e.message, { kind: 'error' }) });
const view = { view: 'list', status: 'all', query: '', tag: null, selected: null, focusId: null };
const S = () => store.getState();
const mqMobile = matchMedia('(max-width: 767px)');

/** Führt eine Logik-Funktion aus. Ergebnis: { ok, changed, error }. */
function run(fn) {
  try { return { ok: true, changed: store.apply(fn) }; } catch (e) {
    if (e instanceof LogicError) return { ok: false, error: e };
    throw e;
  }
}

function act(fn, { undo: undoMsg = null, say = null } = {}) {
  const r = run(fn);
  if (!r.ok) toast(r.error.message, { kind: 'error' });
  else if (r.changed && undoMsg) toast(undoMsg, { action: { label: 'Rückgängig', fn: doUndo } });
  else if (r.changed && say) announce(say);
  return r;
}

function doUndo() { if (store.undo()) toast('Rückgängig gemacht.', { action: { label: 'Wiederholen', fn: doRedo }, ms: 4000 }); else toast('Nichts rückgängig zu machen.'); }
function doRedo() { if (store.redo()) announce('Wiederhergestellt.'); else toast('Nichts wiederherzustellen.'); }

const names = (ids, s = S(), max = 3) => ids.slice(0, max).map((d) => `„${s.tasks[d].title}“`).join(', ') + (ids.length > max ? ` und ${ids.length - max} weitere` : '');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Aufgaben, die vorher blockiert waren und es jetzt nicht mehr sind (nach Erledigen oder Löschen). */
function unblocked(before, after) {
  return Object.keys(after.tasks).filter((id) => !after.tasks[id].done && before.tasks[id] && isBlocked(before, id) && !isBlocked(after, id));
}

const focusRow = (id) => { const r = id && document.getElementById('row-' + id); if (r) { r.tabIndex = 0; r.focus(); return true; } return false; };

/** Nächste sichtbare Zeile nach dem Teilbaum von id (sonst die davor) – Fokusziel nach dem Löschen. */
function neighborAfterDelete(id) {
  const gone = new Set([id, ...getDescendantIds(S(), id)]);
  const rows = [...document.querySelectorAll('#task-tree > .row')].map((r) => r.dataset.id);
  const i = rows.indexOf(id);
  return rows.slice(i + 1).find((r) => !gone.has(r)) ?? rows.slice(0, Math.max(0, i)).reverse().find((r) => !gone.has(r)) ?? null;
}

const A = {
  select(id) {
    flushDetail();
    view.selected = id;
    view.focusId = id;
    render({ selectionOnly: view.view !== 'graph' });
  },
  goto(id) {
    const s = S();
    for (const a of getAncestorIds(s, id)) if (s.settings.collapsed.includes(a)) store.applySettings((st) => setCollapsed(st, a, false));
    A.select(id);
    if (focusRow(id)) document.getElementById('row-' + id).scrollIntoView({ block: 'nearest' });
    announce(`Geöffnet: „${s.tasks[id].title}“`);
  },
  closeDetail() {
    flushDetail();
    const prev = view.selected;
    view.selected = null;
    render({ selectionOnly: true });
    if (!focusRow(prev)) document.querySelector(`[data-fk="node-${prev}"]`)?.focus();
  },
  enter(id) { if (view.selected === id && !$('#detail').hidden) startInlineEdit(id); else A.select(id); },
  async toggle(id) {
    const s = S();
    const t = s.tasks[id];
    if (!t) return;
    let mode = 'one';
    let open = [], blockedKids = [];
    if (!t.done) {
      const b = getBlockers(s, id);
      if (b.length) {
        const ok = await confirmDialog({
          title: 'Trotzdem erledigen?',
          text: [`„${t.title}“ ist noch blockiert durch: ${names(b, s, 5)}.`],
          actions: [{ label: 'Trotzdem erledigen', value: true, kind: 'primary' }, { label: 'Abbrechen', value: null }],
        });
        if (!ok) { render(); return; }
      }
      if (hasOpenDescendants(s, id)) {
        open = getDescendantIds(s, id).filter((d) => !s.tasks[d].done);
        blockedKids = open.filter((d) => isBlocked(s, d));
        const r = await confirmDialog({
          title: 'Unter-Todos mit erledigen?',
          text: [`„${t.title}“ hat ${plural(open.length, 'offenes Unter-Todo', 'offene Unter-Todos')}.`,
            blockedKids.length ? `Davon ${blockedKids.length === 1 ? 'ist 1' : `sind ${blockedKids.length}`} noch blockiert: ${names(blockedKids, s)}.` : null].filter(Boolean),
          actions: [{ label: 'Alle erledigen', value: 'all', kind: 'primary' },
            blockedKids.length ? { label: 'Nur nicht blockierte erledigen', value: 'free' } : null,
            { label: 'Nur diese Aufgabe', value: 'one' }, { label: 'Abbrechen', value: null }].filter(Boolean),
        });
        if (!r) { render(); return; }
        mode = r;
      }
    }
    const skip = new Set(blockedKids);
    const fn = mode === 'free'
      ? (st) => [id, ...open.filter((d) => !skip.has(d))].reduce((acc, d) => setDone(acc, d, true), st)
      : (st) => setDone(st, id, !t.done, { cascade: mode === 'all' });
    const r = run(fn);
    if (!r.ok) { toast(r.error.message, { kind: 'error' }); return; }
    if (r.changed) {
      const free = t.done ? [] : unblocked(s, S());
      const msg = mode === 'one' ? `„${t.title}“ ${t.done ? 'wieder offen' : 'erledigt'}.`
        : mode === 'free' ? `„${t.title}“ und nicht blockierte Unter-Todos erledigt.` : `„${t.title}“ und Unter-Todos erledigt.`;
      if (free.length) toast(`${msg} ${plural(free.length, 'Aufgabe', 'Aufgaben')} jetzt machbar: ${names(free)}.`, { action: { label: 'Rückgängig', fn: doUndo } });
      else if (mode !== 'one') toast(msg, { action: { label: 'Rückgängig', fn: doUndo } });
      else announce(msg);
    }
    if (document.activeElement === document.body) focusRow(id);
  },
  /** Titel ändern; dieselbe Syntax wie die Schnelleingabe (!prio, #tag, Datum) wird ausgewertet. */
  rename(id, text, { focusRow: fr } = {}) {
    const t = S().tasks[id];
    const q = parseQuickInput(String(text).replace(/\s*\n\s*/g, ' '));
    if (!q.title) { toast('Titel darf nicht leer sein – alter Titel wiederhergestellt.', { kind: 'error' }); render(); if (fr) focusRow(id); return; }
    const patch = { title: q.title };
    if (q.priority) patch.priority = q.priority;
    if (q.due) patch.due = q.due;
    if (q.tags.length) patch.tags = [...t.tags, ...q.tags];
    act((s) => updateTask(s, id, patch), { say: 'Gespeichert.' });
    render();
    if (fr) focusRow(id);
  },
  update(id, patch) { act((s) => updateTask(s, id, patch)); },
  async remove(id) {
    const s = S();
    const t = s.tasks[id];
    if (!t) return;
    const n = getDescendantIds(s, id).length;
    const ext = externalDependents(s, id);
    if (ext.length) {
      const ok = await confirmDialog({
        title: 'Trotzdem löschen?',
        text: [`„${t.title}“${n ? ' (oder eines der Unter-Todos)' : ''} ist Voraussetzung für ${plural(ext.length, 'Aufgabe', 'Aufgaben')}: ${names(ext, s, 5)}.`,
          'Beim Löschen warten diese nicht mehr darauf.'],
        actions: [{ label: 'Trotzdem löschen', value: true, kind: 'danger' }, { label: 'Abbrechen', value: null }],
      });
      if (!ok) return;
    }
    const wasRow = document.activeElement?.classList.contains('row') || ext.length > 0;
    if (view.focusId === id || view.selected === id) view.focusId = neighborAfterDelete(id);
    if (view.selected === id) view.selected = null;
    const r = run((st) => deleteTask(st, id));
    if (!r.ok) { toast(r.error.message, { kind: 'error' }); return; }
    const free = unblocked(s, S());
    toast(`„${t.title}“ gelöscht${n ? ` (inkl. ${plural(n, 'Unter-Todo', 'Unter-Todos')})` : ''}${free.length ? ` · ${plural(free.length, 'Aufgabe', 'Aufgaben')} nicht mehr blockiert` : ''}.`,
      { action: { label: 'Rückgängig', fn: doUndo } });
    if (wasRow || document.activeElement === document.body) focusRow(view.focusId);
  },
  toggleCollapse(id, collapsed) {
    const s = S();
    const c = collapsed ?? !s.settings.collapsed.includes(id);
    store.applySettings((st) => setCollapsed(st, id, c));
    announce(c ? 'Zugeklappt' : 'Aufgeklappt');
  },
  moveBy(id, dir) {
    const idx = moveRelative(S(), id, dir);
    if (idx == null) { announce(dir < 0 ? 'Bereits ganz oben.' : 'Bereits ganz unten.'); return; }
    act((s) => moveTask(s, id, { index: idx }), { say: dir < 0 ? 'Nach oben verschoben.' : 'Nach unten verschoben.' });
    focusRow(id);
  },
  moveToRef(id, refId, after) {
    act((s) => moveTask(s, id, { index: indexRelative(s, id, refId, after) }), { say: 'Verschoben.' });
  },
  indent(id) {
    const prev = prevShownSibling(id);
    if (!prev) { toast('Einrücken nicht möglich: keine Aufgabe darüber auf derselben Ebene. Esc, dann Tab verlässt die Liste.'); return; }
    store.applySettings((s) => setCollapsed(s, prev, false));
    act((s) => moveTask(s, id, { parentId: prev }), { undo: `Eingerückt unter „${S().tasks[prev].title}“.` });
    focusRow(id);
  },
  outdent(id) {
    if (!S().tasks[id]?.parentId) { toast('Bereits auf oberster Ebene. Esc, dann Shift+Tab verlässt die Liste.'); return; }
    act((s) => outdent(s, id), { undo: `„${S().tasks[id].title}“ ausgerückt.` });
    focusRow(id);
  },
  addDep(id, depId) {
    const r = run((s) => addDependency(s, id, depId));
    if (!r.ok) return r.error.message;
    announce(`„${S().tasks[id].title}“ wartet jetzt auf „${S().tasks[depId].title}“.`);
    return null;
  },
  removeDep(id, depId) { act((s) => removeDependency(s, id, depId), { say: 'Abhängigkeit entfernt.' }); },
  addChild(parentId, text) {
    const q = parseQuickInput(text);
    if (!q.title) return false;
    const nid = generateId();
    store.applySettings((s) => setCollapsed(s, parentId, false));
    return act((s) => addTask(s, { ...q, parentId }, { id: nid }), { say: `Unter-Todo „${q.title}“ angelegt.` }).ok;
  },
  setView(v) {
    view.view = v;
    closeSidebar(false);
    render();
    announce(`Ansicht ${VIEW_LABELS[v]}`);
  },
  setFilter(f) { view.status = f; view.view = 'list'; closeSidebar(false); render(); announce(`Filter ${FILTER_LABELS[f]}`); },
  setTag(tag) { view.tag = tag; closeSidebar(false); render(); },
  loadExample() {
    const T = toDateString();
    const id = {};
    const rows = [
      ['umzug', 'Umzug vorbereiten', { priority: 3, tags: ['umzug'] }],
      ['kartons', 'Kartons besorgen', { due: T }, 'umzug'],
      ['kueche', 'Küche packen', {}, 'umzug', ['kartons']],
      ['buecher', 'Bücher packen', {}, 'umzug', ['kartons']],
      ['vertrag', 'Neuen Mietvertrag unterschreiben', { priority: 3, due: addDays(T, 2) }],
      ['kuendigen', 'Alte Wohnung kündigen', { tags: ['umzug'] }, null, ['vertrag']],
      ['wagen', 'Umzugswagen buchen', {}, null, ['vertrag']],
      ['moebel', 'Möbel transportieren', {}, null, ['wagen', 'kueche', 'buecher']],
      ['party', 'Einweihungsparty planen', { tags: ['privat'] }, null, ['moebel']],
      ['steuer', 'Steuererklärung abgeben', { priority: 2, due: addDays(T, 20), tags: ['büro'] }],
    ];
    act((s0) => rows.reduce((s, [k, title, extra, parent, deps]) => {
      id[k] = generateId();
      const next = addTask(s, { title, ...extra, parentId: parent ? id[parent] : null }, { id: id[k] });
      return deps ? setDependencies(next, id[k], deps.map((d) => id[d])) : next;
    }, s0), { undo: 'Beispiel-Projekt geladen. Tipp: Ansicht „Graph“ zeigt die Abhängigkeiten.' });
  },
  resetFilters() { view.status = 'all'; view.query = ''; view.tag = null; $('#search').value = ''; render(); },
  showBlocked() { A.setFilter('blocked'); },
  focusId(id) { view.focusId = id; },
  focusRow,
  error(msg) { toast(msg, { kind: 'error' }); },
};

// --- Rendering

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme; else delete root.dataset.theme;
}

/** Nur Auswahl geändert: Zeilen/Knoten behalten (Doppelklick, Fokus), Detail aktualisieren. */
function markSelected() {
  for (const el of document.querySelectorAll('.row, .next-item, .node')) {
    const on = el.dataset.id === view.selected;
    el.classList.toggle('is-selected', on);
    if (el.classList.contains('row')) el.setAttribute('aria-selected', String(on));
  }
}

function render({ selectionOnly = false } = {}) {
  const state = S();
  if (selectionOnly && (!view.selected || state.tasks[view.selected])) {
    markSelected();
    renderDetail(state, view.selected, toDateString());
    $('#app').classList.toggle('has-detail', !!view.selected);
    updatePreview();
    return;
  }
  const today = toDateString();
  const ae = document.activeElement;
  const fk = ae?.dataset?.fk;
  const wasRow = ae?.classList?.contains('row');
  applyTheme(state.settings.theme);
  if (view.selected && !state.tasks[view.selected]) view.selected = null;
  renderSidebar(state, view, A, today);
  const parts = [VIEW_LABELS[view.view]];
  if (view.view === 'list' && view.status !== 'all') parts.push(FILTER_LABELS[view.status]);
  if (view.tag) parts.push('#' + view.tag);
  $('#view-title').textContent = parts.join(' · ');
  document.title = `${parts.join(' · ')} – Todo (lokal)`;
  for (const v of ['list', 'next', 'graph']) $('#view-' + v).hidden = view.view !== v;
  if (view.view === 'list') renderList(state, view, A, today);
  else if (view.view === 'next') renderNext(state, view, A, today);
  else renderGraph($('#graph'), state, { onSelect: A.select, selected: view.selected, query: view.query, tag: view.tag, mobile: mqMobile.matches, refresh: () => render() });
  $('#app').classList.toggle('is-graph', view.view === 'graph');
  renderDetail(state, view.selected, today);
  $('#app').classList.toggle('has-detail', !!view.selected);
  updatePreview();
  if (wasRow && !ae.isConnected) focusRow(view.focusId);
  else if (fk && !ae.isConnected) document.querySelector(`[data-fk="${CSS.escape(fk)}"]`)?.focus();
}

// --- Schnelleingabe mit Live-Vorschau

let previewSig = '';
function parseQuick(text) {
  const child = /^\s*>/.test(text);
  const q = parseQuickInput(child ? text.replace(/^\s*>\s*/, '') : text);
  const parentId = child ? (view.selected || view.focusId) : null;
  return { ...q, child, parentId: parentId && S().tasks[parentId] ? parentId : null };
}

function updatePreview() {
  const text = $('#quick-input').value;
  const q = parseQuick(text);
  const today = toDateString();
  const chips = [];
  if (q.child) chips.push(q.parentId ? `Unter-Todo von „${S().tasks[q.parentId].title}“` : 'Unter-Todo: erst eine Aufgabe auswählen');
  if (q.priority) chips.push(`Priorität ${PRIORITY_LABELS[q.priority]}`);
  if (q.due) chips.push(`fällig ${relDate(q.due, today)} (${q.due.split('-').reverse().join('.')})`);
  for (const g of q.tags) chips.push('#' + g);
  const sig = chips.join('|');
  if (sig === previewSig) return;
  previewSig = sig;
  $('#quick-preview').replaceChildren(...chips.map((c) => h('span', { class: 'chip chip-preview' }, c)));
}

$('#quick-input').addEventListener('input', updatePreview);
$('#quick').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#quick-input');
  const q = parseQuick(input.value);
  if (!q.title) { if (input.value.trim()) toast('Titel fehlt – nur Kürzel erkannt.', { kind: 'error' }); return; }
  if (q.child && !q.parentId) { toast('Für „>“ zuerst eine Aufgabe auswählen.', { kind: 'error' }); return; }
  const id = generateId();
  if (q.parentId) store.applySettings((s) => setCollapsed(s, q.parentId, false));
  const r = act((s) => addTask(s, { title: q.title, tags: q.tags, priority: q.priority, due: q.due, parentId: q.parentId }, { id }));
  if (!r.ok) return;
  view.focusId = id;
  input.value = '';
  updatePreview();
  const hiddenByFilter = view.view === 'list' && !document.getElementById('row-' + id);
  announce(`„${q.title}“ angelegt${hiddenByFilter ? ' (durch Filter ausgeblendet)' : ''}.`);
  document.getElementById('row-' + id)?.scrollIntoView({ block: 'nearest' });
});

// --- Kopfzeile, Seitenleiste, Daten

$('#search').addEventListener('input', (e) => {
  view.query = e.target.value;
  render();
});

function openSidebar() {
  $('#sidebar').classList.add('is-open');
  $('#scrim').hidden = false;
  $('#btn-menu').setAttribute('aria-expanded', 'true');
  $('#sidebar .side-item')?.focus();
}
function closeSidebar(refocus = true) {
  if (!$('#sidebar').classList.contains('is-open')) return false;
  $('#sidebar').classList.remove('is-open');
  $('#scrim').hidden = true;
  $('#btn-menu').setAttribute('aria-expanded', 'false');
  if (refocus) $('#btn-menu').focus();
  return true;
}
$('#btn-menu').addEventListener('click', openSidebar);
$('#btn-close-sidebar').addEventListener('click', () => closeSidebar());
$('#scrim').addEventListener('click', () => closeSidebar());
const setPlaceholder = () => { $('#quick-input').placeholder = mqMobile.matches ? 'Neue Aufgabe …' : 'Neue Aufgabe … (!hoch #tag morgen)'; };
mqMobile.addEventListener('change', () => { closeSidebar(false); setPlaceholder(); render(); });
setPlaceholder();

function toggleSearch(open) {
  const bar = $('#topbar');
  const on = open ?? !bar.classList.contains('is-searching');
  bar.classList.toggle('is-searching', on);
  $('#btn-search').setAttribute('aria-expanded', String(on));
  if (on) $('#search').focus();
}
$('#btn-search').addEventListener('click', () => toggleSearch());

$('#btn-theme').addEventListener('click', () => {
  const order = ['system', 'light', 'dark'];
  const cur = S().settings.theme;
  store.applySettings((s) => setTheme(s, order[(order.indexOf(cur) + 1) % order.length]));
});
$('#btn-help').addEventListener('click', openHelp);
$('#btn-help-2').addEventListener('click', openHelp);

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `todo-export-${toDateString()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Export erstellt (${Object.keys(S().tasks).length} Aufgaben).`);
});
$('#btn-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const text = await file.text();
  const v = validateState(text);
  if (!v.ok) {
    await confirmDialog({ title: 'Import abgelehnt', text: ['Die Datei wurde nicht übernommen, deine Daten sind unverändert.',
      `${v.errors[0]} Ist das eine Exportdatei dieser App?`,
      v.errors.length > 1 ? h('details', {}, h('summary', {}, `Alle Fehler (${v.errors.length})`), h('ul', {}, v.errors.map((x) => h('li', {}, x)))) : null].filter(Boolean),
    actions: [{ label: 'OK', value: true, kind: 'primary' }] });
    return;
  }
  const n = Object.keys(S().tasks).length;
  const m = Object.keys(v.state.tasks).length;
  if (n) {
    const ok = await confirmDialog({ title: 'Daten ersetzen?',
      text: [`Der Import ersetzt deine ${plural(n, 'Aufgabe', 'Aufgaben')} durch ${plural(m, 'Aufgabe', 'Aufgaben')} aus „${file.name}“.`,
        'Tipp: Vorher exportieren, um den aktuellen Stand zu sichern.'],
      actions: [{ label: 'Ersetzen', value: true, kind: 'primary' }, { label: 'Abbrechen', value: null }] });
    if (!ok) return;
  }
  store.importJson(text);
  view.selected = null;
  toast(`Import übernommen (${plural(m, 'Aufgabe', 'Aufgaben')}).`, { action: { label: 'Rückgängig', fn: doUndo } });
});
$('#btn-clear').addEventListener('click', async () => {
  const n = Object.keys(S().tasks).length;
  if (!n) { toast('Es gibt keine Aufgaben.'); return; }
  const ok = await confirmDialog({ title: 'Alle Daten löschen?', text: [`${plural(n, 'Aufgabe wird', 'Aufgaben werden')} gelöscht. Rückgängig ist danach möglich.`],
    actions: [{ label: 'Alle löschen', value: true, kind: 'danger' }, { label: 'Abbrechen', value: null }] });
  if (!ok) return;
  view.selected = null;
  act((s) => getChildren(s, null).reduce((acc, t) => deleteTask(acc, t.id), s), { undo: `${plural(n, 'Aufgabe', 'Aufgaben')} gelöscht.` });
});

// --- Tastenkürzel

bindKeys({
  newTask: () => { $('#quick-input').focus(); },
  search: () => { if (mqMobile.matches) toggleSearch(true); else $('#search').focus(); },
  help: openHelp,
  view: (v) => A.setView(v),
  undo: doUndo,
  redo: doRedo,
  focusList: () => { if (view.view === 'list') focusRow(view.focusId) || document.querySelector('#task-tree > .row')?.focus(); },
  escape: (e) => {
    const t = e.target;
    if (closeSidebar()) return;
    if (!$('#detail').hidden && (!t.closest || !t.closest('#quick, #topbar'))) { e.preventDefault(); A.closeDetail(); return; }
    if (t.id === 'search' || view.query) {
      if (view.query) { $('#search').value = ''; view.query = ''; render(); }
      if (mqMobile.matches) toggleSearch(false);
      t.blur?.();
      return;
    }
    if (t.id === 'quick-input') { t.blur(); if (view.view === 'list') focusRow(view.selected || view.focusId); return; }
    if (!$('#detail').hidden) A.closeDetail();
  },
});

// --- Start

hydrateIcons();
initToast();
initDialogs();
initList(A);
initDetail(A);
store.subscribe(render);
render();
addEventListener('pagehide', flushDetail);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* Offline-Modus optional */ });
}
