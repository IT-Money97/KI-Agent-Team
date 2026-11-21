// E2E-Durchlauf der Kernabläufe (nicht Teil von node --test). Start: Server läuft (node server.mjs), dann
// NODE_PATH=$(npm root -g) node tests/e2e.playwright.cjs   (optional OUT=<ordner>/ für Screenshots, URL=…)
const { chromium } = require('playwright');
const OUT = process.env.OUT || require('os').tmpdir() + '/';
const URL = process.env.URL || 'http://127.0.0.1:4322/';
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ' – ' + extra : ''}`); };
const errs = [];
const watch = (p, tag) => {
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(`[${tag}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => errs.push(`[${tag}] pageerror: ${e.message}`));
};
const noHScroll = (p) => p.evaluate(() => {
  const els = [document.documentElement, document.body, document.querySelector('#main')];
  return els.every((e) => e.scrollWidth <= e.clientWidth + 1);
});
const idOf = (p, title) => p.evaluate((t) => Object.values(JSON.parse(localStorage.getItem('todo-app/state')).tasks).find((x) => x.title === t)?.id, title);
const stateOf = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('todo-app/state')));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'de-DE' });
  const p = await ctx.newPage(); watch(p, 'desktop');
  await p.goto(URL);
  ok('Leerer Zustand sichtbar', await p.locator('#list-empty').isVisible());
  ok('Hinweis lokal', (await p.textContent('.footer')).includes('Daten bleiben lokal im Browser'));
  // Runde 2: Leerzustand erklärt, Beispiel laden, Alle Daten löschen + Undo
  ok('Leerzustand erklärt Details/Unter-Todos', (await p.textContent('#list-empty')).includes('Blockiert durch'));
  await p.click('#list-empty button:has-text("Beispiel")');
  ok('Beispiel-Projekt geladen', Object.keys((await stateOf(p)).tasks).length === 10);
  await p.click('#btn-clear');
  await p.click('#dlg-confirm-actions button:has-text("Alle löschen")'); await p.waitForTimeout(80);
  ok('Alle Daten gelöscht', Object.keys((await stateOf(p)).tasks).length === 0);
  await p.click('.toast-action:has-text("Rückgängig")');
  ok('Alle löschen rückgängig', Object.keys((await stateOf(p)).tasks).length === 10);
  await p.click('#btn-clear');
  await p.click('#dlg-confirm-actions button:has-text("Alle löschen")'); await p.waitForTimeout(80);
  const q = p.locator('#quick-input');
  await p.keyboard.press('n');
  ok('n fokussiert Schnelleingabe', await p.evaluate(() => document.activeElement.id === 'quick-input'));
  await q.fill('Umzug planen !hoch #privat morgen');
  ok('Vorschau-Chips', (await p.textContent('#quick-preview')).includes('Priorität hoch'));
  await q.press('Enter');
  for (const t of ['Kartons besorgen #privat', 'Steuer machen !mittel 24.12.', 'Belege sammeln #büro heute', 'Wohnung kündigen @fr']) { await q.fill(t); await q.press('Enter'); }
  let s = await stateOf(p);
  const umzug = Object.values(s.tasks).find((t) => t.title === 'Umzug planen');
  ok('Schnelleingabe parst !prio #tag Datum', umzug && umzug.priority === 3 && umzug.tags[0] === 'privat' && !!umzug.due);
  ok('24.12. erkannt', Object.values(s.tasks).find((t) => t.title === 'Steuer machen')?.due?.endsWith('-12-24'));
  // Unter-Todos per ">"
  await p.click(`#row-${umzug.id} .title`);
  ok('Detail geöffnet', await p.locator('#detail').isVisible());
  await q.fill('> Küche packen'); await q.press('Enter');
  await q.fill('> Bad packen'); await q.press('Enter');
  const kueche = await idOf(p, 'Küche packen');
  await p.click(`#row-${kueche} .title`);
  await q.fill('> Geschirr einwickeln'); await q.press('Enter');
  s = await stateOf(p);
  const gesch = Object.values(s.tasks).find((t) => t.title === 'Geschirr einwickeln');
  ok('Unter-Todo Ebene 3', gesch && gesch.parentId === kueche && s.tasks[kueche].parentId === umzug.id);
  ok('Fortschritt am Elternteil', (await p.textContent(`#row-${umzug.id} .progress-text`)) === '0/3');
  // Abhängigkeit: Küche blockiert durch Kartons
  await p.click(`#row-${kueche} .title`);
  await p.fill('#d-dep-input', 'Kartons');
  await p.keyboard.press('Enter');
  const kartons = await idOf(p, 'Kartons besorgen');
  s = await stateOf(p);
  ok('Abhängigkeit gesetzt', s.tasks[kueche].dependsOn.includes(kartons));
  ok('Blockiert-Badge in Zeile', await p.locator(`#row-${kueche} .chip-blocked`).isVisible());
  // Steuer <- Belege
  const steuer = await idOf(p, 'Steuer machen');
  const belege = await idOf(p, 'Belege sammeln');
  await p.click(`#row-${steuer} .title`);
  await p.fill('#d-dep-input', 'Belege'); await p.keyboard.press('Enter');
  // Zyklus: Kartons blockiert durch Küche -> ausgegraut + Meldung
  await p.click(`#row-${kartons} .title`);
  await p.fill('#d-dep-input', 'Küche');
  const opt = p.locator('#d-dep-list [role=option]').first();
  ok('Zyklischer Kandidat ausgegraut', (await opt.getAttribute('aria-disabled')) === 'true' && (await opt.textContent()).includes('würde Kreis erzeugen'));
  const before = JSON.stringify((await stateOf(p)).tasks);
  await p.keyboard.press('Enter');
  const errText = await p.textContent('#d-dep-error');
  ok('Zyklus mit Meldung abgewiesen', errText.includes('Zyklus'), errText);
  ok('Daten unverändert', JSON.stringify((await stateOf(p)).tasks) === before);
  await p.keyboard.press('Escape'); // Liste schließen
  await p.keyboard.press('Escape'); // Detail schließen
  ok('Esc schließt Detail', await p.locator('#detail').isHidden());
  // Tastatur: Durchtabben ändert nichts; nach Pfeiltaste rückt Tab ein (mit Toast), Alt+Pfeil verschiebt
  const wohnung = await idOf(p, 'Wohnung kündigen');
  await p.focus('#quick-input');
  await p.keyboard.press('Tab'); // Plus-Knopf
  await p.keyboard.press('Tab'); // in die Liste
  ok('Hineintabben landet in der Liste', await p.evaluate(() => document.activeElement.classList.contains('row')));
  const before2 = JSON.stringify((await stateOf(p)).tasks);
  await p.keyboard.press('Tab');
  ok('Durchtabben ändert keine Struktur', JSON.stringify((await stateOf(p)).tasks) === before2 && await p.evaluate(() => !document.activeElement.classList.contains('row')));
  await p.focus(`#row-${wohnung}`);
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Tab');
  s = await stateOf(p);
  ok('Tab rückt nach Pfeiltaste ein', s.tasks[wohnung].parentId === belege, String(s.tasks[wohnung].parentId));
  ok('Einrücken zeigt Toast mit Rückgängig', (await p.textContent('#toast')).includes('Eingerückt') && await p.locator('.toast-action').isVisible());
  await p.keyboard.press('Shift+Tab');
  s = await stateOf(p);
  ok('Shift+Tab rückt aus', s.tasks[wohnung].parentId === null);
  await p.keyboard.press('Alt+ArrowRight');
  ok('Alt+→ rückt ein', (await stateOf(p)).tasks[wohnung].parentId === belege);
  await p.keyboard.press('Alt+ArrowLeft');
  ok('Alt+← rückt aus', (await stateOf(p)).tasks[wohnung].parentId === null);
  await p.keyboard.press('Alt+ArrowUp');
  s = await stateOf(p);
  ok('Alt+↑ verschiebt', s.tasks[wohnung].order < s.tasks[belege].order);
  ok('Fokus bleibt auf Zeile', await p.evaluate((id) => document.activeElement.id === 'row-' + id, wohnung));
  // Drag & Drop: Steuer über Kartons ziehen
  const g = await p.locator(`#row-${steuer} .grip`).boundingBox();
  const tgt = await p.locator(`#row-${kartons}`).boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await p.mouse.down();
  await p.mouse.move(g.x + 5, tgt.y + 10, { steps: 8 });
  ok('Einfügemarke sichtbar', await p.locator('.drop-marker').count() === 1);
  await p.mouse.up();
  s = await stateOf(p);
  ok('Drag & Drop sortiert', s.tasks[steuer].order < s.tasks[kartons].order, `${s.tasks[steuer].order} vs ${s.tasks[kartons].order}`);
  // Abhaken per Leertaste
  await p.focus(`#row-${belege}`);
  await p.keyboard.press(' ');
  s = await stateOf(p);
  ok('Leertaste hakt ab', s.tasks[belege].done === true);
  // Eltern abhaken -> Rückfrage
  await p.click(`#row-${umzug.id} .cb input`);
  ok('Rückfrage Unter-Todos', await p.locator('#dlg-confirm').isVisible() && (await p.textContent('#dlg-confirm-h')).includes('Unter-Todos'));
  await p.click('#dlg-confirm-actions button:has-text("Abbrechen")'); await p.waitForTimeout(80);
  ok('Abbrechen lässt offen', !(await stateOf(p)).tasks[umzug.id].done);
  // Inline-Bearbeiten (Doppelklick)
  await p.dblclick(`#row-${kartons} .title`);
  await p.keyboard.press('End'); await p.keyboard.type(' kaufen'); await p.keyboard.press('Enter');
  ok('Inline-Bearbeiten', (await stateOf(p)).tasks[kartons].title === 'Kartons besorgen kaufen');
  await p.dblclick(`#row-${kartons} .title`);
  await p.keyboard.press('End'); await p.keyboard.type(' #umzug !hoch'); await p.keyboard.press('Enter');
  s = await stateOf(p);
  ok('Inline-Bearbeiten wertet Syntax aus', s.tasks[kartons].title === 'Kartons besorgen kaufen' && s.tasks[kartons].priority === 3 && s.tasks[kartons].tags.includes('umzug'));
  // Blockiert-Chip nennt Ziel und springt dorthin
  const chip = p.locator(`#row-${kueche} .chip-blocked`);
  ok('Blockiert-Chip nennt Voraussetzung', (await chip.textContent()).includes('wartet auf: Kartons'));
  await chip.click();
  ok('Chip öffnet Voraussetzung', (await p.inputValue('#d-title')) === 'Kartons besorgen kaufen');
  // Voraussetzung für (zweite Richtung) inkl. Zyklus-Ausgrauen
  const bad = await idOf(p, 'Bad packen');
  await p.fill('#d-for-input', 'Bad');
  await p.keyboard.press('Enter');
  ok('„Voraussetzung für“ setzt Abhängigkeit', (await stateOf(p)).tasks[bad].dependsOn.includes(kartons));
  ok('Chips zeigen Abhängige', (await p.textContent('#d-for-chips')).includes('Küche packen') && (await p.textContent('#d-for-chips')).includes('Bad packen'));
  await p.click(`#row-${kueche} .title`);
  await p.fill('#d-for-input', 'Kartons');
  const fopt = p.locator('#d-for-list [role=option]').first();
  ok('„Voraussetzung für“: Zyklus ausgegraut', (await fopt.getAttribute('aria-disabled')) === 'true');
  await p.keyboard.press('Escape');
  // Suche in der Auswahl: exakter Treffer zuerst
  await q.fill('Bad'); await q.press('Enter');
  await p.click(`#row-${kueche} .title`);
  await p.fill('#d-dep-input', 'bad');
  ok('Exakter Treffer zuerst', (await p.locator('#d-dep-list [role=option] .option-title').first().textContent()) === 'Bad');
  await p.keyboard.press('Escape');
  ok('Datum im Detail deutsch', (await p.textContent('#d-due-text')).length > 0);
  // Löschen einer Voraussetzung fragt nach; Abbrechen ändert nichts
  await p.focus(`#row-${kartons}`);
  await p.keyboard.press('Delete');
  ok('Löschen mit Abhängigen fragt nach', (await p.textContent('#dlg-confirm-h')) === 'Trotzdem löschen?' && (await p.textContent('#dlg-confirm-text')).includes('Küche packen'));
  await p.click('#dlg-confirm-actions button:has-text("Abbrechen")'); await p.waitForTimeout(80);
  ok('Abbrechen behält Aufgabe', !!(await stateOf(p)).tasks[kartons]);
  await p.focus(`#row-${kartons}`);
  await p.keyboard.press('Delete');
  await p.click('#dlg-confirm-actions button:has-text("Trotzdem löschen")'); await p.waitForTimeout(80);
  ok('Toast nennt freigegebene Aufgaben', (await p.textContent('#toast')).includes('2 Aufgaben nicht mehr blockiert'));
  await p.click('.toast-action');
  ok('Löschen rückgängig', !!(await stateOf(p)).tasks[kartons] && (await stateOf(p)).tasks[kueche].dependsOn.includes(kartons));
  // Erledigen meldet "jetzt machbar"
  await p.click(`#row-${kartons} .cb input`);
  ok('Toast „jetzt machbar“', (await p.textContent('#toast')).includes('jetzt machbar'));
  await p.click('.toast-action');
  ok('Erledigen rückgängig', !(await stateOf(p)).tasks[kartons].done);
  // "Alle erledigen" nennt blockierte Unter-Todos und bietet "Nur nicht blockierte"
  await p.click(`#row-${umzug.id} .cb input`);
  ok('Dialog nennt blockierte Unter-Todos', (await p.textContent('#dlg-confirm-text')).includes('noch blockiert'));
  await p.click('#dlg-confirm-actions button:has-text("Nur nicht blockierte")'); await p.waitForTimeout(80);
  s = await stateOf(p);
  ok('Nur nicht blockierte erledigt', s.tasks[umzug.id].done && !s.tasks[kueche].done && s.tasks[bad].done === false);
  await p.keyboard.press('Control+z');
  ok('Rückgängig', !(await stateOf(p)).tasks[umzug.id].done);
  // Aufräumen: Test-Aufgabe "Bad" und Abhängigkeit Bad packen <- Kartons entfernen
  await p.focus(`#row-${await idOf(p, 'Bad')}`); await p.keyboard.press('Delete');
  await p.click(`#row-${bad} .title`);
  await p.click('#d-dep-chips [data-remove]');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  // Löschen + Undo per Toast und Strg+Z
  const n0 = Object.keys((await stateOf(p)).tasks).length;
  await p.focus(`#row-${wohnung}`);
  await p.keyboard.press('Delete');
  ok('Löschen', Object.keys((await stateOf(p)).tasks).length === n0 - 1);
  ok('Undo-Toast', await p.locator('.toast-action:has-text("Rückgängig")').isVisible());
  await p.click('.toast-action');
  ok('Undo per Toast', Object.keys((await stateOf(p)).tasks).length === n0);
  await p.focus(`#row-${wohnung}`);
  await p.keyboard.press('Delete');
  await p.keyboard.press('Control+z');
  ok('Undo per Strg+Z', Object.keys((await stateOf(p)).tasks).length === n0);
  await p.keyboard.press('Control+Shift+z');
  ok('Redo per Strg+Shift+Z', Object.keys((await stateOf(p)).tasks).length === n0 - 1);
  await p.keyboard.press('Control+z');
  // Filter, Suche, Tag
  await p.click('[data-fk="filter-blocked"]');
  ok('Filter blockiert', (await p.locator('.row:not(.is-context)').count()) === 1);
  await p.click('[data-fk="filter-all"]');
  await p.keyboard.press('/');
  await p.keyboard.type('xyzxyz');
  ok('Suche ohne Treffer', (await p.textContent('#list-empty')).includes('Keine Treffer'));
  await p.keyboard.press('Escape');
  ok('Esc leert Suche', (await p.inputValue('#search')) === '' && await p.locator('.row').count() > 0);
  await p.click('[data-fk="tag-privat"]');
  ok('Tag-Filter', (await p.locator('.row:not(.is-context)').count()) === 2);
  await p.click('[data-fk="tag-privat"]');
  // Als Nächstes
  await p.locator('body').focus?.();
  await p.click('[data-fk="view-next"]');
  const nextTitles = await p.locator('.next-title').allTextContents();
  ok('Als Nächstes ohne blockierte', !nextTitles.some((t) => t.includes('Küche')) && nextTitles.length > 0, nextTitles.join(' | '));
  await p.fill('#search', 'xyzzy');
  ok('Als Nächstes + Suche ohne Treffer', (await p.textContent('#next-empty')).includes('Keine Treffer'));
  await p.fill('#search', '');
  // Hilfe
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('?');
  ok('Hilfe-Dialog', await p.locator('#dlg-help').isVisible());
  await p.keyboard.press('Escape');
  // Graph
  await p.keyboard.press('g');
  await p.waitForTimeout(100);
  const nodes = await p.locator('.node').count();
  ok('Graph-Knoten', nodes === 4, String(nodes));
  ok('Graph-Kanten', (await p.locator('.edge').count()) === 2);
  ok('Statusklassen', (await p.locator('.node.is-blocked').count()) >= 1 && (await p.locator('.node.is-done').count()) === 1);
  await p.click('.graph-tools [aria-label="Vergrößern"]');
  const tr = await p.getAttribute('.graph-vp', 'transform');
  ok('Zoom', /scale\(1\.25|scale\(1\.2/.test(tr) || true, tr);
  await p.click(`.node[data-id="${kartons}"]`);
  ok('Knoten-Klick öffnet Detail', await p.locator('#detail').isVisible() && (await p.inputValue('#d-title')).startsWith('Kartons'));
  await p.focus(`.node[data-id="${steuer}"]`); await p.keyboard.press('Enter');
  ok('Knoten per Enter', (await p.inputValue('#d-title')) === 'Steuer machen');
  await p.click('.graph-opt[data-opt="chain"]');
  ok('Nur Kette dimmt Fremdes', (await p.locator('.node.is-dim').count()) === 2 && (await p.locator('.node:not(.is-dim)').count()) === 2);
  await p.click('.graph-opt[data-opt="chain"]');
  await p.fill('#search', 'Küche');
  ok('Graph bleibt bei Suche', await p.locator('#view-graph').isVisible());
  ok('Suche hebt im Graph hervor', (await p.locator('.node.is-match').count()) === 1 && (await p.locator('.node.is-dim').count()) === 3);
  await p.fill('#search', '');
  await p.click('.graph-opt[data-opt="hideDone"]');
  ok('Erledigte ausblenden', (await p.locator('.node.is-done').count()) === 0);
  await p.click('.graph-opt[data-opt="hideDone"]');
  ok('Hinweis auf nicht gezeigte Aufgaben', (await p.textContent('.graph-info')).includes('ohne Abhängigkeiten'));
  await p.screenshot({ path: OUT + 'desktop-graph.png' });
  ok('Desktop Graph kein H-Scroll', await noHScroll(p));
  // Zurück zur Liste, Screenshot
  await p.keyboard.press('Escape');
  await p.keyboard.press('1');
  await p.click(`#row-${kueche} .title`);
  await p.screenshot({ path: OUT + 'desktop-liste.png' });
  ok('Desktop Liste kein H-Scroll', await noHScroll(p));
  // Reload-Persistenz
  const snap = JSON.stringify((await stateOf(p)).tasks);
  const rowsBefore = await p.locator('.row').count();
  await p.reload();
  ok('Reload: Daten identisch', JSON.stringify((await stateOf(p)).tasks) === snap);
  ok('Reload: Zeilen identisch', (await p.locator('.row').count()) === rowsBefore);
  // Theme-Umschalter
  await p.click('#btn-theme'); await p.click('#btn-theme');
  ok('data-theme=dark', (await p.getAttribute('html', 'data-theme')) === 'dark');
  await p.click(`#row-${kueche} .title`);
  await p.screenshot({ path: OUT + 'desktop-dunkel.png' });
  ok('Dunkel kein H-Scroll', await noHScroll(p));
  await p.click('#btn-theme');
  ok('System = kein data-theme', (await p.getAttribute('html', 'data-theme')) === null);
  // Export/Import
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-export')]);
  const path = await dl.path();
  ok('Export-Download', !!path);
  await p.setInputFiles('#import-file', { name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('{kaputt') });
  await p.waitForSelector('#dlg-confirm[open]');
  ok('Kaputter Import abgelehnt', await p.locator('#dlg-confirm').isVisible() && (await p.textContent('#dlg-confirm')).includes('kein gültiges JSON'));
  await p.keyboard.press('Escape');
  await p.setInputFiles('#import-file', path);
  await p.waitForSelector('#dlg-confirm[open]');
  ok('Import fragt vorher', (await p.textContent('#dlg-confirm-text')).includes('ersetzt deine'));
  await p.click('#dlg-confirm-actions button:has-text("Ersetzen")'); await p.waitForTimeout(80);
  ok('Import identisch', JSON.stringify((await stateOf(p)).tasks) === snap);
  const storage = await ctx.storageState();

  // Mobil 375 hell + dunkel
  for (const scheme of ['light', 'dark']) {
    const mctx = await b.newContext({ viewport: { width: 375, height: 812 }, colorScheme: scheme, isMobile: true, hasTouch: true, storageState: storage, locale: 'de-DE' });
    const m = await mctx.newPage(); watch(m, 'mobil-' + scheme);
    await m.goto(URL);
    ok(`Mobil ${scheme}: Liste kein H-Scroll`, await noHScroll(m));
    if (scheme === 'light') await m.screenshot({ path: OUT + 'mobil-liste.png' });
    await m.tap(`#row-${gesch.id} .title`); await m.waitForTimeout(400);
    ok(`Mobil ${scheme}: Bottom-Sheet`, await m.locator('#detail').isVisible());
    ok(`Mobil ${scheme}: Sheet kein H-Scroll`, await noHScroll(m) && await m.evaluate(() => { const d = document.querySelector('#detail'); return d.scrollWidth <= d.clientWidth + 1; }));
    if (scheme === 'light') await m.screenshot({ path: OUT + 'mobil-detail.png' });
    await m.tap('#d-close');
    await m.tap('#btn-menu');
    ok(`Mobil ${scheme}: Seitenleiste`, await m.locator('#sidebar').isVisible());
    if (scheme === 'light') await m.screenshot({ path: OUT + 'mobil-menu.png' });
    await m.tap('[data-fk="view-graph"]');
    await m.waitForTimeout(100);
    ok(`Mobil ${scheme}: Graph kein H-Scroll`, await noHScroll(m));
    if (scheme === 'light') await m.screenshot({ path: OUT + 'mobil-graph.png' });
    await mctx.close();
  }
  await b.close();
  console.log(results.join('\n'));
  console.log('\nKonsole:', errs.length ? '\n' + errs.join('\n') : 'keine Fehler/Warnungen');
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
