// toast.js – Meldungen (role=status, aria-live) mit optionaler Aktion "Rückgängig"; 6 s, pausiert bei Hover/Fokus.
import { $, h } from './dom.js';

let timer = null;
let remaining = 0;
let started = 0;

function hide() {
  const box = $('#toast');
  clearTimeout(timer);
  timer = null;
  box.classList.remove('is-visible');
  box.replaceChildren();
}

function start(ms) {
  clearTimeout(timer);
  remaining = ms;
  started = Date.now();
  timer = setTimeout(hide, ms);
}

/** toast('Text', { kind: 'info'|'error', action: { label, fn }, ms }) */
export function toast(message, { kind = 'info', action = null, ms = 6000 } = {}) {
  const box = $('#toast');
  if (!box) return;
  const card = h('div', { class: `toast toast-${kind}` },
    h('span', { class: 'toast-msg' }, message),
    action ? h('button', { type: 'button', class: 'toast-action', onclick: () => { hide(); action.fn(); } }, action.label) : null,
    h('button', { type: 'button', class: 'toast-close', 'aria-label': 'Meldung schließen', onclick: hide }, '×'));
  box.replaceChildren(card);
  box.classList.add('is-visible');
  start(ms);
}

/** Leise Ansage für Screenreader (ohne sichtbaren Toast). */
export function announce(message) {
  const live = $('#live');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => { live.textContent = message; });
}

export function initToast() {
  const box = $('#toast');
  const pause = () => { if (timer) { clearTimeout(timer); timer = null; remaining -= Date.now() - started; } };
  const resume = () => { if (!timer && box.firstChild && !box.matches(':hover') && !box.contains(document.activeElement)) start(Math.max(remaining, 1500)); };
  box.addEventListener('mouseenter', pause);
  box.addEventListener('focusin', pause);
  box.addEventListener('mouseleave', resume);
  box.addEventListener('focusout', () => setTimeout(resume));
}
