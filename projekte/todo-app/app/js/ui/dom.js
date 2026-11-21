// dom.js – kleine DOM-Helfer, Inline-SVG-Icons (stroke: currentColor) und Datumstexte.
export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) e.append(c);
  return e;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(name, attrs = {}) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
  return e;
}

export const ICON_PATHS = {
  check: 'M5 12l5 5L20 7',
  'check-box': 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 12l3 3 5-6',
  chevron: 'M9 6l6 6-6 6',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  help: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  next: 'M5 12h14M13 6l6 6-6 6',
  graph: 'M6 4a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM18 16a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM18 4a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM8 6h8M7.5 7.5l9 9',
  circle: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16z',
};

const iconCache = new Map();
export function icon(name, size = 16, cls = '') {
  const key = `${name}|${size}|${cls}`;
  if (iconCache.has(key)) return iconCache.get(key).cloneNode(true);
  const s = svg('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', focusable: 'false',
    class: `icon ${cls}`.trim(), fill: 'none', stroke: 'currentColor', 'stroke-width': name === 'grip' ? 3 : 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  s.append(svg('path', { d: ICON_PATHS[name] }));
  iconCache.set(key, s);
  return s.cloneNode(true);
}

/** Ersetzt data-icon-Platzhalter in statischem HTML durch SVG-Icons. */
export function hydrateIcons(root = document) {
  for (const el of $$('[data-icon]', root)) {
    el.prepend(icon(el.dataset.icon, el.classList.contains('icon-btn') || el.classList.contains('btn') ? 20 : 16));
    el.removeAttribute('data-icon');
  }
}

const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };

/** Relatives Datum: heute, morgen, gestern, Wochentag (bis 6 Tage), sonst "12. Dez." (+ Jahr, falls anders). */
export function relDate(due, today) {
  const diff = Math.round((utc(due) - utc(today)) / 864e5);
  if (diff === 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === -1) return 'gestern';
  const dt = new Date(utc(due));
  if (diff > 1 && diff < 7) return WD[dt.getUTCDay()];
  const s = `${dt.getUTCDate()}. ${MONTHS[dt.getUTCMonth()]}`;
  return due.slice(0, 4) === today.slice(0, 4) ? s : `${s} ${due.slice(0, 4)}`;
}

/** ISO-Zeitstempel -> "19.11.2026, 14:05". */
export function fmtStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
