// list.js – Baumliste (role=tree, roving tabindex, Inline-Bearbeitung, Drag & Drop) und "Als Nächstes".
import {
  filterTasks, withAncestors, flattenTree, progress, getBlockers, nextTasks, buildChildIndex,
  getAncestorIds, matchesQuery, PRIORITY_LABELS,
} from '../logic.js';
import { h, $, $$, icon, relDate } from './dom.js';

let A = null;          // Aktionen aus app.js
let armed = false;     // Tab rückt nur ein, wenn die Zeile per Pfeiltaste/Klick aktiv gewählt wurde (nicht beim Durchtabben)
let drag = null;

const rowOf = (el) => el && el.closest('.row');
const rowsEl = () => $$('#task-tree > .row');

/** Kinder-Index für die Anzeige: erledigte stehen innerhalb eines Elternteils unten (stabil). */
export function displayIndex(state) {
  const idx = buildChildIndex(state);
  for (const [k, list] of idx) {
    if (list.some((t) => t.done)) idx.set(k, [...list.filter((t) => !t.done), ...list.filter((t) => t.done)]);
  }
  return idx;
}

/** Fälligkeit, Blockiert, Tags, Fortschritt als kleine Chips. */
export function metaChips(state, t, { today, index, depth = 0, hasChildren = false, tagAction = true, prog = null }) {
  const out = [];
  if (depth >= 3) out.push(h('span', { class: `chip chip-level${depth > 12 ? '' : ' only-deep-mobile'}` }, `Ebene ${depth + 1}`));
  if (hasChildren) {
    const p = prog || progress(state, t.id, index);
    out.push(h('span', { class: 'progress' },
      h('span', { class: 'progress-text' }, `${p.done}/${p.total}`),
      h('span', { class: 'progress-bar', role: 'progressbar', 'aria-label': 'Fortschritt der Unter-Todos',
        'aria-valuemin': '0', 'aria-valuemax': String(p.total), 'aria-valuenow': String(p.done) },
        h('span', { class: 'progress-fill', style: `width:${Math.round(p.ratio * 100)}%` }))));
  }
  if (t.due) {
    const over = !t.done && t.due < today;
    const now = !t.done && t.due === today;
    out.push(h('span', { class: `chip chip-due${over ? ' is-overdue' : now ? ' is-today' : ''}`, title: `Fällig am ${t.due}` },
      icon('calendar', 12), over ? `überfällig · ${relDate(t.due, today)}` : relDate(t.due, today)));
  }
  const blockers = t.done ? [] : getBlockers(state, t.id);
  if (blockers.length) {
    const first = state.tasks[blockers[0]].title;
    const long = blockers.length === 1 ? `wartet auf: ${first.length > 24 ? first.slice(0, 23) + '…' : first}` : `wartet auf ${blockers.length}`;
    const label = `Wartet auf ${blockers.map((b) => `„${state.tasks[b].title}“`).join(', ')}`;
    const inner = [icon('lock', 12), h('span', { class: 'wait-long' }, long), h('span', { class: 'wait-short', 'aria-hidden': 'true' }, 'wartet')];
    out.push(tagAction
      ? h('button', { type: 'button', class: 'chip chip-blocked', tabindex: '-1', title: `${label} – Klick öffnet „${first}“`, 'data-goto': blockers[0] }, ...inner)
      : h('span', { class: 'chip chip-blocked', title: label }, ...inner));
  }
  t.tags.forEach((g, i) => out.push(tagAction
    ? h('button', { type: 'button', class: `chip chip-tag${i ? ' tag-extra' : ''}`, tabindex: '-1', 'data-tag': g }, '#' + g)
    : h('span', { class: `chip chip-tag${i ? ' tag-extra' : ''}` }, '#' + g)));
  if (t.tags.length > 1) out.push(h('span', { class: 'chip chip-tag tag-more', 'aria-hidden': 'true' }, `+${t.tags.length - 1}`));
  return out;
}

function rowLabel(state, t, { today, hasChildren, prog: p, blockers: b }) {
  const parts = [t.title];
  if (t.done) parts.push('erledigt');
  if (t.priority) parts.push(`Priorität ${PRIORITY_LABELS[t.priority]}`);
  if (t.due) parts.push(!t.done && t.due < today ? `überfällig seit ${t.due}` : `fällig ${relDate(t.due, today)}`);
  if (b && b.length) parts.push(`wartet auf ${b.map((x) => state.tasks[x].title).join(', ')}`);
  if (hasChildren) parts.push(`${p.done} von ${p.total} Unter-Todos erledigt`);
  if (t.tags.length) parts.push(t.tags.map((g) => '#' + g).join(' '));
  return parts.join(', ');
}

function titleNode(t) {
  return h('span', { class: 'title' },
    t.priority >= 2 ? h('span', { class: 'prio-mark', 'aria-hidden': 'true' }, t.priority === 3 ? '!! ' : '! ') : null,
    h('span', { class: 'title-text' }, t.title));
}

export function renderList(state, view, actions, today) {
  A = actions;
  const tree = $('#task-tree');
  const empty = $('#list-empty');
  const filtered = view.status !== 'all' || !!view.query || !!view.tag;
  const index = displayIndex(state);
  let matches = null;
  if (filtered) matches = new Set(filterTasks(state, { status: view.status, query: view.query, tag: view.tag, today }));
  const rows = flattenTree(state, { include: matches ? withAncestors(state, [...matches]) : null, index, collapsed: filtered ? [] : undefined });
  const total = Object.keys(state.tasks).length;
  tree.hidden = !rows.length;
  empty.hidden = !!rows.length;
  if (!rows.length) {
    empty.replaceChildren(...emptyState(total, view));
    tree.replaceChildren();
    return rows;
  }
  if (!rows.some((r) => r.id === view.focusId)) view.focusId = (rows.find((r) => r.id === view.selected) || rows[0]).id;
  // Zeilen-Diffing: unveränderte Zeilen (gleiche Signatur) werden wiederverwendet (2.000 Aufgaben < 100 ms).
  const els = rows.map((r) => {
    const t = state.tasks[r.id];
    const blockers = t.done ? [] : getBlockers(state, t.id);
    const prog = r.hasChildren ? progress(state, t.id, index) : null;
    const ctx = !!matches && !matches.has(t.id);
    const sig = [t.title, t.done, t.priority, t.due, t.tags.join(' '), t.parentId, blockers.map((b) => state.tasks[b].title).join('|'), prog && `${prog.done}/${prog.total}`, r.depth,
      r.hasChildren, r.collapsed, ctx, view.selected === t.id, view.focusId === t.id, today].join('\u0001');
    let c = rowCache.get(t.id);
    if (!c || c.sig !== sig || !c.el.querySelector('.title')) c = { sig, el: buildRow(state, t, r, { today, index, view, blockers, prog, ctx }) };
    rowCache.set(t.id, c);
    return c.el;
  });
  if (rowCache.size > rows.length) for (const id of rowCache.keys()) if (!state.tasks[id]) rowCache.delete(id);
  const kids = tree.children;
  if (kids.length !== els.length || els.some((e, i) => kids[i] !== e)) tree.replaceChildren(...els);
  return rows;
}

const rowCache = new Map();

function buildRow(state, t, r, { today, index, view, blockers, prog, ctx }) {
  const cls = ['row', `prio-${t.priority}`, t.done && 'is-done', blockers.length && 'is-blocked',
    ctx && 'is-context', view.selected === t.id && 'is-selected'].filter(Boolean).join(' ');
  return h('li', {
      class: cls, role: 'treeitem', id: 'row-' + t.id, 'data-id': t.id, 'data-parent': t.parentId ?? '',
      'aria-level': String(r.depth + 1), 'aria-expanded': r.hasChildren ? String(!r.collapsed) : null,
      'aria-selected': String(view.selected === t.id), tabindex: view.focusId === t.id ? '0' : '-1',
      'aria-label': rowLabel(state, t, { today, hasChildren: r.hasChildren, prog, blockers }), style: `--lvl:${r.depth}`,
    },
    h('span', { class: 'grip', title: 'Ziehen zum Sortieren (Tastatur: Alt+↑/↓)', 'aria-hidden': 'true' }, icon('grip', 16)),
    r.hasChildren
      ? h('button', { type: 'button', class: 'chev', tabindex: '-1', 'aria-hidden': 'true', title: r.collapsed ? 'Aufklappen' : 'Zuklappen' }, icon('chevron', 16))
      : h('span', { class: 'chev-sp' }),
    h('span', { class: 'cb' }, h('input', { type: 'checkbox', tabindex: '-1', checked: t.done, 'aria-label': `„${t.title}“ erledigt` })),
    titleNode(t),
    h('span', { class: 'meta' }, metaChips(state, t, { today, index, depth: r.depth, hasChildren: r.hasChildren, prog })));
}

function emptyState(total, view) {
  if (!total) {
    return [icon('check-box', 40, 'empty-icon'),
      h('p', { class: 'empty-lead' }, 'Noch keine Aufgaben.'),
      h('ul', { class: 'empty-steps' },
        h('li', {}, 'Aufgabe in die Schnelleingabe tippen und Enter drücken, z. B. ', h('code', {}, 'Steuer machen !hoch morgen')),
        h('li', {}, 'Aufgabe anklicken bzw. antippen: Details, Unter-Todos und „Blockiert durch“'),
        h('li', {}, h('code', {}, '>'), ' am Anfang legt ein Unter-Todo der gewählten Aufgabe an')),
      h('button', { type: 'button', class: 'btn', onclick: () => A.loadExample() }, 'Beispiel-Projekt laden')];
  }
  return noMatch(view, 'Keine Aufgaben für diesen Filter.');
}

function noMatch(view, fallback) {
  const msg = view.query ? `Keine Treffer für „${view.query}“.` : fallback;
  return [icon('search', 40, 'empty-icon'), h('p', {}, msg),
    h('button', { type: 'button', class: 'btn', onclick: () => A.resetFilters() }, view.query ? 'Suche löschen' : 'Filter zurücksetzen')];
}

// --- "Als Nächstes"

export function renderNext(state, view, actions, today) {
  A = actions;
  const list = $('#next-list');
  const empty = $('#next-empty');
  const index = buildChildIndex(state);
  const all = nextTasks(state);
  let ids = all;
  if (view.query) ids = ids.filter((id) => matchesQuery(state.tasks[id], view.query));
  if (view.tag) ids = ids.filter((id) => state.tasks[id].tags.includes(view.tag));
  list.hidden = !ids.length;
  empty.hidden = !!ids.length;
  if (!ids.length) {
    const none = !Object.keys(state.tasks).length;
    if (all.length) { empty.replaceChildren(...noMatch(view, `Keine machbare Aufgabe mit #${view.tag}.`)); list.replaceChildren(); return ids; }
    empty.replaceChildren(icon('next', 40, 'empty-icon'),
      h('p', {}, none ? 'Noch keine Aufgaben.' : 'Nichts ist gerade machbar. Alles erledigt oder blockiert.'),
      none ? null : h('button', { type: 'button', class: 'link-btn', onclick: () => A.showBlocked() }, 'Blockierte anzeigen'));
    list.replaceChildren();
    return ids;
  }
  list.replaceChildren(...ids.map((id) => {
    const t = state.tasks[id];
    const path = getAncestorIds(state, id).reverse().map((a) => state.tasks[a].title).join(' › ');
    return h('li', { class: `next-item prio-${t.priority}${view.selected === id ? ' is-selected' : ''}`, 'data-id': id },
      path ? h('div', { class: 'next-path' }, path) : null,
      h('div', { class: 'next-row' },
        h('span', { class: 'cb' }, h('input', { type: 'checkbox', checked: t.done, 'data-fk': 'next-cb-' + id, 'aria-label': `„${t.title}“ erledigt` })),
        h('button', { type: 'button', class: 'next-title', 'data-fk': 'next-' + id },
          t.priority >= 2 ? h('span', { class: 'prio-mark' }, t.priority === 3 ? '!! ' : '! ') : null,
          h('span', { class: 'visually-hidden' }, t.priority ? `Priorität ${PRIORITY_LABELS[t.priority]}: ` : ''), t.title),
        h('span', { class: 'meta' }, metaChips(state, t, { today, index, tagAction: false }))));
  }));
  return ids;
}

// --- Inline-Bearbeitung

export function startInlineEdit(id) {
  const row = document.getElementById('row-' + id);
  if (!row) return;
  const title = $('.title', row);
  const old = $('.title-text', row).textContent;
  const input = h('input', { type: 'text', class: 'inline-edit', value: old, 'aria-label': 'Titel bearbeiten' });
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (save && v && v !== old) A.rename(id, v, { focusRow: true });
    else { input.replaceWith(title); A.focusRow(id); }
  };
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
  title.replaceWith(input);
  input.focus();
  input.select();
}

// --- Ereignisse (einmalig gebunden)

function siblingsShown(row) {
  return rowsEl().filter((r) => r.dataset.parent === row.dataset.parent);
}

function focusRowEl(row) {
  if (!row) return;
  for (const r of rowsEl()) r.tabIndex = r === row ? 0 : -1;
  row.focus();
}

/** Ziel-Index für moveTask relativ zu einem angezeigten Geschwister. */
export function indexRelative(state, id, refId, after) {
  const parent = state.tasks[id].parentId ?? null;
  const sibs = Object.values(state.tasks).filter((t) => (t.parentId ?? null) === parent && t.id !== id)
    .sort((a, b) => a.order - b.order).map((t) => t.id);
  return sibs.indexOf(refId) + (after ? 1 : 0);
}

export function moveRelative(state, id, dir) {
  const row = document.getElementById('row-' + id);
  if (!row) return null;
  const sibs = siblingsShown(row);
  const i = sibs.indexOf(row);
  const ref = sibs[i + dir];
  if (!ref) return null;
  return indexRelative(state, id, ref.dataset.id, dir > 0);
}

export function prevShownSibling(id) {
  const row = document.getElementById('row-' + id);
  if (!row) return null;
  const sibs = siblingsShown(row);
  const i = sibs.indexOf(row);
  return i > 0 ? sibs[i - 1].dataset.id : null;
}

export function initList(actions) {
  A = actions;
  const tree = $('#task-tree');

  tree.addEventListener('click', (e) => {
    const row = rowOf(e.target);
    if (!row || drag?.moved) return;
    const id = row.dataset.id;
    if (e.target.closest('.chev')) { A.toggleCollapse(id); return; }
    if (e.target.closest('.cb') || e.target.closest('.inline-edit') || e.target.closest('.grip')) return;
    const go = e.target.closest('[data-goto]');
    if (go) { A.goto(go.dataset.goto); return; }
    const tag = e.target.closest('[data-tag]');
    if (tag) { A.setTag(tag.dataset.tag); return; }
    A.select(id);
  });
  tree.addEventListener('dblclick', (e) => {
    const row = rowOf(e.target);
    if (row && e.target.closest('.title')) startInlineEdit(row.dataset.id);
  });
  tree.addEventListener('change', (e) => {
    const row = rowOf(e.target);
    if (row && e.target.type === 'checkbox') { A.focusId(row.dataset.id); A.toggle(row.dataset.id); }
  });
  tree.addEventListener('focusin', (e) => {
    const row = e.target.matches?.('.row') ? e.target : null;
    if (!row) return;
    if (e.relatedTarget && !tree.contains(e.relatedTarget)) armed = false; // per Tab von außen hereingekommen
    A.focusId(row.dataset.id);
    for (const r of rowsEl()) r.tabIndex = r === row ? 0 : -1;
  });

  tree.addEventListener('keydown', (e) => {
    const row = e.target.matches?.('.row') ? e.target : null;
    if (!row) return;
    const id = row.dataset.id;
    const rows = rowsEl();
    const i = rows.indexOf(row);
    const key = e.key;
    const handled = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.ctrlKey || e.metaKey) return;
    if (!['Tab', 'Shift', 'Escape'].includes(key)) armed = true;
    if (e.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) { handled(); A.moveBy(id, key === 'ArrowUp' ? -1 : 1); return; }
    if (e.altKey && (key === 'ArrowRight' || key === 'ArrowLeft')) { handled(); if (key === 'ArrowRight') A.indent(id); else A.outdent(id); return; }
    if (e.altKey) return;
    switch (key) {
      case 'ArrowDown': case 'j': handled(); focusRowEl(rows[i + 1]); break;
      case 'ArrowUp': case 'k': handled(); focusRowEl(rows[i - 1]); break;
      case 'Home': handled(); focusRowEl(rows[0]); break;
      case 'End': handled(); focusRowEl(rows[rows.length - 1]); break;
      case 'ArrowRight':
        handled();
        if (row.getAttribute('aria-expanded') === 'false') A.toggleCollapse(id, false);
        else if (row.getAttribute('aria-expanded') === 'true') focusRowEl(rows[i + 1]);
        break;
      case 'ArrowLeft': {
        handled();
        if (row.getAttribute('aria-expanded') === 'true') A.toggleCollapse(id, true);
        else if (row.dataset.parent) focusRowEl(document.getElementById('row-' + row.dataset.parent));
        break;
      }
      case 'Enter': handled(); A.enter(id); break;
      case 'F2': handled(); startInlineEdit(id); break;
      case ' ': handled(); A.toggle(id); break;
      case 'Delete': handled(); A.remove(id); break;
      case 'Escape': armed = false; break; // danach verlässt Tab die Liste; Esc schließt zusätzlich global das Panel
      case 'Tab':
        if (!armed) return;
        handled();
        if (e.shiftKey) A.outdent(id); else A.indent(id);
        break;
      default:
    }
  });

  // Drag & Drop (Maus + Touch über Pointer Events) am Griff; nur innerhalb derselben Ebene.
  tree.addEventListener('pointerdown', (e) => {
    if (rowOf(e.target)) armed = true;
    const grip = e.target.closest('.grip');
    if (!grip || e.button !== 0) return;
    const row = rowOf(grip);
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    drag = { row, id: row.dataset.id, y0: e.clientY, moved: false, sibs: siblingsShown(row).filter((r) => r !== row), k: -1, grip };
  });
  tree.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    if (!drag.moved && Math.abs(dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.row.classList.add('is-dragging');
      drag.marker = h('li', { class: 'drop-marker', 'aria-hidden': 'true', style: `--lvl:${drag.row.style.getPropertyValue('--lvl')}` });
      tree.append(drag.marker);
    }
    drag.row.style.transform = `translateY(${dy}px)`;
    const k = drag.sibs.filter((r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 < e.clientY; }).length;
    drag.k = k;
    const tb = tree.getBoundingClientRect();
    let y;
    if (k < drag.sibs.length) y = drag.sibs[k].getBoundingClientRect().top;
    else {
      const last = drag.sibs[drag.sibs.length - 1];
      if (!last) { y = drag.row.getBoundingClientRect().top; }
      else {
        const all = rowsEl();
        let j = all.indexOf(last);
        const lvl = Number(last.getAttribute('aria-level'));
        while (all[j + 1] && Number(all[j + 1].getAttribute('aria-level')) > lvl) j++;
        y = all[j].getBoundingClientRect().bottom;
      }
    }
    drag.marker.style.top = `${y - tb.top - 1}px`;
    if (e.clientY < 72) window.scrollBy(0, -12);
    else if (e.clientY > innerHeight - 96) window.scrollBy(0, 12);
    const main = $('#main');
    if (main.scrollHeight > main.clientHeight) {
      const mb = main.getBoundingClientRect();
      if (e.clientY < mb.top + 120) main.scrollTop -= 12; else if (e.clientY > mb.bottom - 48) main.scrollTop += 12;
    }
  });
  const end = (e, cancel) => {
    if (!drag) return;
    const d = drag;
    d.row.classList.remove('is-dragging');
    d.row.style.transform = '';
    d.marker?.remove();
    setTimeout(() => { drag = null; });
    if (!d.moved || cancel || d.k < 0) return;
    const ref = d.k < d.sibs.length ? d.sibs[d.k] : d.sibs[d.sibs.length - 1];
    if (!ref) return;
    A.moveToRef(d.id, ref.dataset.id, d.k >= d.sibs.length);
  };
  tree.addEventListener('pointerup', (e) => end(e, false));
  tree.addEventListener('pointercancel', (e) => end(e, true));
}

