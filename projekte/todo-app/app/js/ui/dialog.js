// dialog.js – native <dialog>: Rückfrage mit mehreren Knöpfen (Promise) und Hilfe-Dialog.
import { $, h } from './dom.js';

/**
 * confirmDialog({ title, text, actions: [{ label, value, kind }] }) -> Promise<value | null>
 * Esc bzw. Abbrechen ergibt null. Fokus landet auf der ersten Aktion und kehrt danach zurück.
 */
export function confirmDialog({ title, text, actions }) {
  const dlg = $('#dlg-confirm');
  const back = document.activeElement;
  $('#dlg-confirm-h').textContent = title;
  const body = $('#dlg-confirm-text');
  body.replaceChildren(...[].concat(text).map((t) => (typeof t === 'string' ? h('p', {}, t) : t)));
  return new Promise((resolve) => {
    let result = null;
    $('#dlg-confirm-actions').replaceChildren(...actions.map((a) => h('button', {
      type: 'button', class: `btn ${a.kind ? 'btn-' + a.kind : ''}`,
      onclick: () => { result = a.value; dlg.close(); },
    }, a.label)));
    dlg.addEventListener('close', () => {
      if (back && back.isConnected) back.focus();
      resolve(result);
    }, { once: true });
    dlg.showModal();
    $('#dlg-confirm-actions button').focus();
  });
}

export function openHelp() {
  const dlg = $('#dlg-help');
  if (!dlg.open) dlg.showModal();
}

export function initDialogs() {
  for (const dlg of document.querySelectorAll('dialog')) {
    dlg.addEventListener('click', (e) => {
      // Klick auf den Hintergrund (außerhalb des Inhalts) oder auf [data-close] schließt
      const r = dlg.getBoundingClientRect();
      const outside = e.target === dlg && e.clientX !== 0 &&
        (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
      if (outside || e.target.closest('[data-close]')) dlg.close();
    });
  }
}
