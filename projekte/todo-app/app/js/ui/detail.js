// detail.js – Detail-Panel (Desktop: Spalte/Overlay rechts, mobil: Bottom-Sheet). Das Gerüst wird einmal
// gebaut und danach nur gezielt aktualisiert, damit Fokus, Cursor und Klicks beim Speichern erhalten bleiben.
import {
  PRIORITY_LABELS, getChildren, getAncestorIds, getDependents, wouldCreateCycle, searchByTitle, toDateString, addDays,
} from '../logic.js';
import { h, $, $$, icon, fmtStamp, relDate } from './dom.js';

let A = null;
let cur = { id: null, sig: {} };
let state = null;

/**
 * Zwei Auswahllisten mit gleicher Bedienung: "dep" = Blockiert durch (diese Aufgabe wartet auf c),
 * "for" = Voraussetzung für (c wartet auf diese Aufgabe). Zyklische Kandidaten sind vorab ausgegraut.
 */
const COMBOS = {
  dep: {
    label: 'Blockiert durch', hint: 'Diese Aufgabe ist erst machbar, wenn die gewählten erledigt sind.',
    selected: (id) => state.tasks[id].dependsOn.filter((d) => state.tasks[d]),
    cyclic: (id, c) => wouldCreateCycle(state, id, c),
    add: (id, c) => A.addDep(id, c), remove: (id, c) => A.removeDep(id, c),
    chipLabel: (t) => `Abhängigkeit von „${t.title}“ entfernen`,
  },
  for: {
    label: 'Voraussetzung für', hint: 'Diese Aufgaben warten, bis diese hier erledigt ist.',
    selected: (id) => getDependents(state, id),
    cyclic: (id, c) => wouldCreateCycle(state, c, id),
    add: (id, c) => A.addDep(c, id), remove: (id, c) => A.removeDep(c, id),
    chipLabel: (t) => `„${t.title}“ wartet nicht mehr darauf – entfernen`,
  },
};
const comboState = { dep: { active: -1, options: [] }, for: { active: -1, options: [] } };
const cid = (k, part) => `d-${k}-${part}`;

function comboField(k) {
  const c = COMBOS[k];
  return field(c.label, cid(k, 'input'),
    h('ul', { id: cid(k, 'chips'), class: 'plain chip-list', 'aria-label': c.label }),
    h('div', { class: 'combo' },
      h('input', { id: cid(k, 'input'), class: 'input', type: 'text', role: 'combobox', autocomplete: 'off',
        'aria-expanded': 'false', 'aria-controls': cid(k, 'list'), 'aria-autocomplete': 'list', 'aria-describedby': cid(k, 'hint'),
        placeholder: 'Aufgabe suchen …', 'data-combo': k }),
      h('ul', { id: cid(k, 'list'), class: 'plain listbox', role: 'listbox', 'aria-label': `${c.label}: Aufgaben wählen`, 'aria-multiselectable': 'true', hidden: true })),
    h('p', { id: cid(k, 'hint'), class: 'field-hint' }, c.hint),
    h('div', { id: cid(k, 'error'), class: 'field-error', role: 'alert' }));
}

const field = (label, forId, ...content) => h('div', { class: 'field' },
  forId ? h('label', { class: 'field-label', for: forId }, label) : h('span', { class: 'field-label' }, label), ...content);

export function initDetail(actions) {
  A = actions;
  const panel = $('#detail');
  const prio = h('fieldset', { class: 'field segmented' },
    h('legend', { class: 'field-label' }, 'Priorität'),
    h('div', { class: 'seg' }, ...[0, 1, 2, 3].map((p) => h('label', { class: `seg-opt seg-${p}` },
      h('input', { type: 'radio', name: 'd-prio', value: String(p), class: 'visually-hidden', id: 'd-prio-' + p }),
      h('span', {}, PRIORITY_LABELS[p][0].toUpperCase() + PRIORITY_LABELS[p].slice(1))))));
  panel.replaceChildren(
    h('button', { type: 'button', class: 'sheet-grip only-mobile', id: 'd-grip', 'aria-label': 'Panel vergrößern oder verkleinern' }, h('span', { class: 'sheet-grip-bar' })),
    h('h2', { id: 'detail-h', class: 'visually-hidden' }, 'Details'),
    h('div', { class: 'detail-head' },
      h('span', { class: 'cb cb-lg' }, h('input', { type: 'checkbox', id: 'd-done', 'aria-label': 'Erledigt' })),
      h('label', { class: 'visually-hidden', for: 'd-title' }, 'Titel'),
      h('textarea', { id: 'd-title', class: 'detail-title', rows: '1', enterkeyhint: 'done' }),
      h('button', { type: 'button', class: 'icon-btn', id: 'd-close', 'aria-label': 'Details schließen (Esc)' }, icon('close', 20))),
    h('div', { id: 'd-status', class: 'detail-status' }),
    prio,
    field('Fälligkeit', 'd-due', h('div', { class: 'due-row' },
      h('input', { type: 'date', id: 'd-due', class: 'input' }),
      h('button', { type: 'button', class: 'btn btn-sm', 'data-due': '0' }, 'Heute'),
      h('button', { type: 'button', class: 'btn btn-sm', 'data-due': '1' }, 'Morgen'),
      h('button', { type: 'button', class: 'btn btn-sm', 'data-due': '' }, 'Keine')),
      h('p', { id: 'd-due-text', class: 'field-hint', 'aria-live': 'polite' })),
    field('Tags', 'd-tag-input', h('div', { class: 'chip-input' },
      h('ul', { id: 'd-tags', class: 'plain chip-list', 'aria-label': 'Tags' }),
      h('input', { id: 'd-tag-input', class: 'chip-input-field', type: 'text', placeholder: 'Tag + Enter', autocomplete: 'off' }))),
    comboField('dep'),
    comboField('for'),
    h('div', { class: 'field' },
      h('h3', { class: 'field-label', id: 'd-children-h' }, 'Unter-Todos'),
      h('ul', { id: 'd-children', class: 'plain mini-list', 'aria-labelledby': 'd-children-h' }),
      h('form', { id: 'd-child-form', class: 'mini-add' },
        h('label', { class: 'visually-hidden', for: 'd-child-input' }, 'Unter-Todo hinzufügen'),
        h('input', { id: 'd-child-input', class: 'input', type: 'text', placeholder: 'Unter-Todo hinzufügen …', autocomplete: 'off' }),
        h('button', { type: 'submit', class: 'btn btn-sm', 'aria-label': 'Unter-Todo hinzufügen' }, icon('plus', 16)))),
    field('Notizen', 'd-notes', h('textarea', { id: 'd-notes', class: 'input notes', rows: '4' })),
    h('div', { class: 'detail-foot' },
      h('button', { type: 'button', id: 'd-delete', class: 'btn-text-danger' }, icon('trash', 16), 'Aufgabe löschen'),
      h('p', { id: 'd-meta', class: 'detail-meta' })));
  bind(panel);
}

function bind(panel) {
  const id = () => cur.id;
  $('#d-close').addEventListener('click', () => A.closeDetail());
  $('#d-done').addEventListener('change', () => A.toggle(id()));
  const title = $('#d-title');
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  title.addEventListener('change', () => {
    if (!title.value.trim()) { title.value = state.tasks[id()].title; A.error('Titel darf nicht leer sein – alter Titel wiederhergestellt.'); return; }
    A.rename(id(), title.value);
  });
  panel.addEventListener('change', (e) => {
    if (e.target.name === 'd-prio') A.update(id(), { priority: Number(e.target.value) });
  });
  $('#d-due').addEventListener('change', (e) => A.update(id(), { due: e.target.value || null }));
  for (const b of $$('[data-due]', panel)) {
    b.addEventListener('click', () => A.update(id(), { due: b.dataset.due === '' ? null : addDays(toDateString(), Number(b.dataset.due)) }));
  }
  const tagIn = $('#d-tag-input');
  tagIn.addEventListener('keydown', (e) => {
    const t = state.tasks[id()];
    if ((e.key === 'Enter' || e.key === ',') && tagIn.value.trim()) {
      e.preventDefault();
      A.update(id(), { tags: [...t.tags, ...tagIn.value.split(/[\s,]+/)] });
      tagIn.value = '';
    } else if (e.key === 'Enter') e.preventDefault();
    else if (e.key === 'Backspace' && !tagIn.value && t.tags.length) A.update(id(), { tags: t.tags.slice(0, -1) });
  });
  $('#d-tags').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove-tag]');
    if (b) { A.update(id(), { tags: state.tasks[id()].tags.filter((g) => g !== b.dataset.removeTag) }); tagIn.focus(); }
  });
  for (const k of Object.keys(COMBOS)) bindCombo(k);
  $('#d-children').addEventListener('change', (e) => { if (e.target.dataset.child) A.toggle(e.target.dataset.child); });
  $('#d-children').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) A.select(b.dataset.open, { keepFocus: false }); });
  $('#d-child-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#d-child-input');
    if (A.addChild(id(), inp.value)) inp.value = '';
  });
  $('#d-notes').addEventListener('change', (e) => A.update(id(), { notes: e.target.value }));
  $('#d-delete').addEventListener('click', () => A.remove(id()));
  bindSheet();
}

function bindSheet() {
  const panel = $('#detail');
  const grip = $('#d-grip');
  let start = null;
  grip.addEventListener('pointerdown', (e) => {
    start = { y: e.clientY, h: panel.getBoundingClientRect().height, moved: false };
    grip.setPointerCapture(e.pointerId);
  });
  grip.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) > 4) start.moved = true;
    if (start.moved) { panel.style.height = `${Math.max(80, start.h - dy)}px`; panel.classList.add('is-dragging'); }
  });
  grip.addEventListener('pointerup', () => {
    if (!start) return;
    const s = start;
    start = null;
    panel.classList.remove('is-dragging');
    const hgt = panel.getBoundingClientRect().height;
    panel.style.height = '';
    if (!s.moved) { panel.classList.toggle('is-full'); return; }
    if (hgt < innerHeight * 0.35) A.closeDetail();
    else panel.classList.toggle('is-full', hgt > innerHeight * 0.8);
  });
  grip.addEventListener('pointercancel', () => { start = null; panel.style.height = ''; panel.classList.remove('is-dragging'); });
}

function bindCombo(k) {
  const input = $('#' + cid(k, 'input'));
  const list = $('#' + cid(k, 'list'));
  const st = comboState[k];
  $('#' + cid(k, 'chips')).addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) { COMBOS[k].remove(cur.id, rm.dataset.remove); input.focus(); return; }
    const op = e.target.closest('[data-open]');
    if (op) A.select(op.dataset.open);
  });
  input.addEventListener('input', () => { st.active = 0; renderOptions(k, true); });
  input.addEventListener('focus', () => renderOptions(k, true));
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) closeOptions(k); }, 150));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      st.active = Math.max(0, Math.min(st.options.length - 1, st.active + (e.key === 'ArrowDown' ? 1 : -1)));
      renderOptions(k, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && st.options[st.active]) pick(k, st.options[st.active]);
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault(); e.stopPropagation(); closeOptions(k);
    }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault()); // Fokus bleibt im Suchfeld
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"][data-id]');
    if (li) { st.active = Number(li.dataset.i); pick(k, li.dataset.id); }
  });
}

function pick(k, other) {
  const c = COMBOS[k];
  const err = $('#' + cid(k, 'error'));
  if (c.selected(cur.id).includes(other)) { c.remove(cur.id, other); err.textContent = ''; return; }
  const msg = c.add(cur.id, other);
  err.textContent = msg ? `Nicht gespeichert – ${msg}` : '';
  if (!msg) { $('#' + cid(k, 'input')).value = ''; renderOptions(k, true); }
}

function closeOptions(k) {
  $('#' + cid(k, 'list')).hidden = true;
  const c = $('#' + cid(k, 'input'));
  c.setAttribute('aria-expanded', 'false');
  c.removeAttribute('aria-activedescendant');
}

function pathOf(id) {
  return getAncestorIds(state, id).reverse().map((a) => state.tasks[a].title).join(' › ');
}

function renderOptions(k, open) {
  const list = $('#' + cid(k, 'list'));
  const input = $('#' + cid(k, 'input'));
  const st = comboState[k];
  if (!cur.id || (!open && list.hidden)) return;
  const ids = searchByTitle(state, input.value, { exclude: [cur.id] }).slice(0, 40);
  const sel = new Set(COMBOS[k].selected(cur.id));
  st.options = ids;
  if (st.active >= ids.length) st.active = ids.length - 1;
  if (st.active < 0 && ids.length) st.active = 0;
  list.replaceChildren(...(ids.length ? ids.map((oid, i) => {
    const c = state.tasks[oid];
    const on = sel.has(oid);
    const cyc = !on && COMBOS[k].cyclic(cur.id, oid);
    const path = pathOf(oid);
    return h('li', {
      role: 'option', id: cid(k, 'opt-' + i), 'data-id': oid, 'data-i': String(i),
      'aria-selected': String(on), 'aria-disabled': cyc ? 'true' : null,
      class: `option${i === st.active ? ' is-active' : ''}${cyc ? ' is-cyclic' : ''}${c.done ? ' is-done' : ''}`,
    },
    h('span', { class: 'option-check', 'aria-hidden': 'true' }, on ? icon('check', 16) : null),
    h('span', { class: 'option-body' },
      h('span', { class: 'option-title' }, c.title, c.done ? h('span', { class: 'option-note' }, ' · erledigt') : null),
      path ? h('span', { class: 'option-path' }, path) : null,
      cyc ? h('span', { class: 'option-cycle' }, '(würde Kreis erzeugen)') : null));
  }) : [h('li', { class: 'option-empty', role: 'option', 'aria-disabled': 'true', 'aria-selected': 'false' }, 'Keine passende Aufgabe')]));
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (st.active >= 0 && ids.length) {
    input.setAttribute('aria-activedescendant', cid(k, 'opt-' + st.active));
    $('#' + cid(k, 'opt-' + st.active))?.scrollIntoView({ block: 'nearest' });
  } else input.removeAttribute('aria-activedescendant');
}

function renderChips(k) {
  const ids = COMBOS[k].selected(cur.id);
  const sig = ids.map((d) => `${d}:${state.tasks[d].done}:${state.tasks[d].title}:${state.tasks[d].dependsOn.join()}`).join('|');
  if (!changed('chips-' + k, sig)) return;
  $('#' + cid(k, 'chips')).replaceChildren(...ids.map((d) => {
    const dt = state.tasks[d];
    const st = dt.done ? 'done' : k === 'dep' ? 'open' : 'wait';
    return h('li', { class: `chip chip-dep chip-removable is-${st}` },
      h('button', { type: 'button', class: 'chip-open', 'data-open': d, 'data-fk': `chip-${k}-${d}` },
        icon(dt.done ? 'check' : 'lock', 12), h('span', { class: 'visually-hidden' }, dt.done ? 'erledigt: ' : 'offen: '), dt.title),
      h('button', { type: 'button', class: 'chip-x', 'data-remove': d, 'aria-label': COMBOS[k].chipLabel(dt) }, icon('close', 12)));
  }));
}

const changed = (key, sig) => { if (cur.sig[key] === sig) return false; cur.sig[key] = sig; return true; };

/** Schreibt laufende Eingaben (Titel/Notizen) fest, bevor das Panel schließt oder wechselt. */
export function flushDetail() {
  const a = document.activeElement;
  if (a && $('#detail').contains(a) && (a.id === 'd-title' || a.id === 'd-notes' || a.id === 'd-due')) a.blur();
}

export function renderDetail(s, selectedId, today) {
  state = s;
  const panel = $('#detail');
  const t = selectedId ? s.tasks[selectedId] : null;
  panel.hidden = !t;
  if (!t) { cur = { id: null, sig: {} }; panel.classList.remove('is-full'); return; }
  if (cur.id !== t.id) {
    cur = { id: t.id, sig: {} };
    for (const k of Object.keys(COMBOS)) { $('#' + cid(k, 'input')).value = ''; $('#' + cid(k, 'error')).textContent = ''; closeOptions(k); }
    $('#d-tag-input').value = '';
    $('#d-child-input').value = '';
    panel.scrollTop = 0;
  }
  const focused = document.activeElement;
  $('#detail-h').textContent = `Details: ${t.title}`;
  if (focused !== $('#d-title')) $('#d-title').value = t.title;
  $('#d-done').checked = t.done;
  $('#d-done').setAttribute('aria-label', `„${t.title}“ erledigt`);
  for (const r of $$('input[name="d-prio"]')) r.checked = Number(r.value) === t.priority;
  if (focused !== $('#d-due')) $('#d-due').value = t.due ?? '';
  $('#d-due-text').textContent = t.due ? `${longDate(t.due)} · ${relDate(t.due, today)}` : 'Kein Fälligkeitsdatum';
  if (focused !== $('#d-notes')) $('#d-notes').value = t.notes;
  panel.classList.toggle('is-done', t.done);

  const blockers = t.dependsOn.filter((d) => s.tasks[d] && !s.tasks[d].done);
  const anc = getAncestorIds(s, t.id).reverse();
  if (changed('status', `${t.done}|${blockers.join()}|${t.due}|${today}|${anc.map((a) => s.tasks[a].title).join('›')}`)) {
    const st = $('#d-status');
    const parts = [];
    if (anc.length) parts.push(h('p', { class: 'detail-path' }, 'In: ', anc.map((a) => s.tasks[a].title).join(' › ')));
    if (t.done) parts.push(h('p', { class: 'status-pill status-done' }, icon('check', 14), 'Erledigt'));
    else if (blockers.length) parts.push(h('p', { class: 'status-pill status-blocked' }, icon('lock', 14), `Blockiert – wartet auf ${blockers.length} ${blockers.length === 1 ? 'Aufgabe' : 'Aufgaben'}`));
    if (!t.done && t.due && t.due < today) parts.push(h('p', { class: 'status-pill status-overdue' }, icon('calendar', 14), 'Überfällig'));
    st.replaceChildren(...parts);
  }
  if (changed('tags', t.tags.join('\u0000'))) {
    $('#d-tags').replaceChildren(...t.tags.map((g) => h('li', { class: 'chip chip-tag chip-removable' }, '#' + g,
      h('button', { type: 'button', class: 'chip-x', 'data-remove-tag': g, 'aria-label': `Tag #${g} entfernen` }, icon('close', 12)))));
  }
  for (const k of Object.keys(COMBOS)) { renderChips(k); if (!$('#' + cid(k, 'list')).hidden) renderOptions(k, false); }
  const kids = getChildren(s, t.id);
  if (changed('kids', kids.map((k) => `${k.id}:${k.done}:${k.title}`).join('|'))) {
    $('#d-children').replaceChildren(...(kids.length ? kids.map((k) => h('li', { class: `mini-item${k.done ? ' is-done' : ''}` },
      h('span', { class: 'cb' }, h('input', { type: 'checkbox', checked: k.done, 'data-child': k.id, 'data-fk': 'kid-' + k.id, 'aria-label': `„${k.title}“ erledigt` })),
      h('button', { type: 'button', class: 'mini-title', 'data-open': k.id }, k.title)))
      : [h('li', { class: 'mini-empty' }, 'Keine Unter-Todos.')]));
  }
  $('#d-meta').textContent = `Erstellt: ${fmtStamp(t.createdAt)}${t.completedAt ? ` · Erledigt: ${fmtStamp(t.completedAt)}` : ''}`;
}

export const detailId = () => cur.id;

/** "Fr, 20. Nov. 2026" (deutsch, unabhängig von der Sprache der Browser-Oberfläche). */
function longDate(d) {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
