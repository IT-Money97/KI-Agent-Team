import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';
import { addTask, setTheme } from '../js/logic.js';

const memory = () => { const m = new Map(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('Store speichert, lädt nach "Reload" identisch und benachrichtigt', () => {
  const storage = memory();
  const s1 = createStore({ storage });
  let calls = 0;
  s1.subscribe(() => calls++);
  s1.apply((s) => addTask(s, { title: 'A' }, { id: 'a' }));
  s1.apply((s) => addTask(s, { title: 'A1', parentId: 'a' }, { id: 'a1' }));
  assert.equal(calls, 2);
  const s2 = createStore({ storage });
  assert.deepEqual(s2.getState(), s1.getState());
});

test('Store-Undo behält aktuelle Einstellungen', () => {
  const st = createStore({ storage: memory() });
  st.apply((s) => addTask(s, { title: 'A' }, { id: 'a' }));
  st.applySettings((s) => setTheme(s, 'dark'));
  assert.equal(st.undo(), true);
  assert.deepEqual(st.getState().tasks, {});
  assert.equal(st.getState().settings.theme, 'dark');
  assert.equal(st.redo(), true);
  assert.ok(st.getState().tasks.a);
});

test('Store: kaputte Daten werden gesichert, Import validiert', () => {
  const storage = memory();
  storage.setItem('todo-app/state', '{kaputt');
  const errs = [];
  const st = createStore({ storage, onError: (e) => errs.push(e) });
  assert.deepEqual(st.getState().tasks, {});
  assert.equal(errs.length, 1);
  assert.ok([...storage.m.keys()].some((k) => k.startsWith('todo-app/state/backup-')));
  assert.equal(st.importJson('nope').ok, false);
  const src = createStore({ storage: memory() });
  src.apply((s) => addTask(s, { title: 'X' }, { id: 'x' }));
  assert.equal(st.importJson(src.exportJson()).ok, true);
  assert.deepEqual(st.getState(), src.getState());
});
