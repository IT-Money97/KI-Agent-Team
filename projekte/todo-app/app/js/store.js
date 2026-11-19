// store.js – hält den State, Undo-Historie, Persistenz in localStorage und benachrichtigt Abonnenten.
// Fluss: UI-Aktion -> store.apply(fn) -> logic-Funktion -> commit(Historie) -> speichern -> listeners(state)
import { createState, createHistory, commit, undo, redo, canUndo, canRedo, validateState, exportState } from './logic.js';

export const STORAGE_KEY = 'todo-app/state';

export function createStore({ storage = globalThis.localStorage, key = STORAGE_KEY, onError = () => {} } = {}) {
  const listeners = new Set();
  let history = createHistory(load());

  function load() {
    let raw = null;
    try { raw = storage ? storage.getItem(key) : null; } catch (e) { onError(e); }
    if (!raw) return createState();
    const r = validateState(raw);
    if (r.ok) return r.state;
    try { storage.setItem(`${key}/backup-${Date.now()}`, raw); } catch { /* Speicher voll */ }
    onError(new Error('Gespeicherte Daten waren ungültig und wurden gesichert: ' + r.errors.join(' ')));
    return createState();
  }

  function save() {
    try { if (storage) storage.setItem(key, exportState(history.present)); } catch (e) { onError(e); }
  }

  function emit() {
    save();
    for (const fn of listeners) fn(history.present);
  }

  // Einstellungen (Theme, eingeklappt) sind nicht Teil der Undo-Historie.
  function keepSettings(h, settings) {
    return { ...h, present: { ...h.present, settings } };
  }

  return {
    getState: () => history.present,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** fn: (state) => newState (Logik-Funktion). LogicError wird an den Aufrufer weitergereicht. */
    apply(fn) {
      const next = fn(history.present);
      if (next === history.present) return false;
      history = commit(history, next);
      emit();
      return true;
    },
    /** Änderungen ohne Undo-Schritt (Settings). */
    applySettings(fn) {
      const next = fn(history.present);
      if (next === history.present) return;
      history = { ...history, present: next };
      emit();
    },
    undo() {
      if (!canUndo(history)) return false;
      history = keepSettings(undo(history), history.present.settings);
      emit();
      return true;
    },
    redo() {
      if (!canRedo(history)) return false;
      history = keepSettings(redo(history), history.present.settings);
      emit();
      return true;
    },
    canUndo: () => canUndo(history),
    canRedo: () => canRedo(history),
    exportJson: () => exportState(history.present),
    /** Import (als Undo-Schritt). Gibt { ok, errors } zurück. */
    importJson(text) {
      const r = validateState(text);
      if (!r.ok) return r;
      history = commit(history, r.state);
      emit();
      return { ok: true };
    },
  };
}
