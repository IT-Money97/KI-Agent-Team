// sidebar.js – Ansichten (mit Zähler "Als Nächstes"), Filter mit Zählern, Tags, Theme-Knopf.
import { FILTERS, countByFilter, collectTags, nextTasks, linkedIds } from '../logic.js';
import { h, $, icon } from './dom.js';

export const FILTER_LABELS = { all: 'Alle', open: 'Offen', done: 'Erledigt', today: 'Heute', overdue: 'Überfällig', blocked: 'Blockiert' };
export const VIEW_LABELS = { list: 'Liste', next: 'Als Nächstes', graph: 'Graph' };
const VIEW_ICONS = { list: 'list', next: 'next', graph: 'graph' };
const THEME = { system: ['monitor', 'System'], light: ['sun', 'Hell'], dark: ['moon', 'Dunkel'] };

const item = (key, pressedAttr, active, onclick, ...content) => h('li', {},
  h('button', { type: 'button', class: 'side-item', 'data-fk': key, [pressedAttr]: active ? (pressedAttr === 'aria-current' ? 'page' : 'true') : (pressedAttr === 'aria-current' ? null : 'false'), onclick }, ...content));

export function renderSidebar(state, view, A, today) {
  const counts = countByFilter(state, today);
  const viewCounts = { list: counts.all, next: nextTasks(state).length, graph: linkedIds(state).length };
  $('#views').replaceChildren(...Object.keys(VIEW_LABELS).map((v) => item('view-' + v, 'aria-current', view.view === v,
    () => A.setView(v), icon(VIEW_ICONS[v], 16), h('span', { class: 'side-label' }, VIEW_LABELS[v]),
    h('span', { class: 'count' }, String(viewCounts[v]), h('span', { class: 'visually-hidden' }, v === 'graph' ? ' Aufgaben mit Abhängigkeiten' : ' Aufgaben')))));
  $('#filters').replaceChildren(...FILTERS.map((f) => item('filter-' + f, 'aria-pressed', view.status === f,
    () => A.setFilter(f), h('span', { class: `side-label filter-${f}` }, FILTER_LABELS[f]), h('span', { class: 'count' }, String(counts[f])))));
  const tags = collectTags(state);
  $('#tags').replaceChildren(...(tags.length
    ? tags.map(({ tag, count }) => item('tag-' + tag, 'aria-pressed', view.tag === tag,
      () => A.setTag(view.tag === tag ? null : tag), h('span', { class: 'side-label' }, '#' + tag), h('span', { class: 'count' }, String(count))))
    : [h('li', { class: 'side-empty' }, 'Noch keine Tags. Schreibe z. B. #arbeit in eine Aufgabe.')]));
  const [ic, label] = THEME[state.settings.theme] || THEME.system;
  const btn = $('#btn-theme');
  btn.replaceChildren(icon(ic, 16), `Design: ${label}`,
    h('span', { class: 'visually-hidden' }, `, wechseln zu ${THEME[{ system: 'light', light: 'dark', dark: 'system' }[state.settings.theme]][1]}`));
}
