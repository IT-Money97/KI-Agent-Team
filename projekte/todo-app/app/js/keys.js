// keys.js – globale Tastenkürzel. Einbuchstaben-Kürzel greifen nicht, solange ein Eingabefeld fokussiert ist;
// Esc wirkt immer, Strg+Z in Feldern nur, wenn das Feld leer ist (sonst natives Text-Undo).
const isTyping = (t) => t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
  && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(t.type);

export function bindKeys(handlers) {
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
    const mod = e.ctrlKey || e.metaKey;
    const typing = isTyping(e.target);
    const k = e.key.toLowerCase();
    if (mod && (k === 'z' || k === 'y') && !e.altKey) {
      if (typing && e.target.value) return;
      e.preventDefault();
      if (k === 'y' || e.shiftKey) handlers.redo(); else handlers.undo();
      return;
    }
    if (e.key === 'Escape') { handlers.escape(e); return; }
    if (mod || e.altKey || typing) return;
    const map = {
      n: handlers.newTask, '/': handlers.search, '?': handlers.help, g: () => handlers.view('graph'),
      1: () => handlers.view('list'), 2: () => handlers.view('next'), 3: () => handlers.view('graph'),
      ArrowDown: handlers.focusList, ArrowUp: handlers.focusList, j: handlers.focusList, k: handlers.focusList,
    };
    const fn = map[e.key];
    const nav = ['ArrowDown', 'ArrowUp', 'j', 'k'].includes(e.key);
    if (fn && (!nav || e.target === document.body || e.target.id === 'task-tree')) { e.preventDefault(); fn(); }
  });
}
