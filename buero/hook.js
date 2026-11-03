#!/usr/bin/env node
// Agenten-Büro: Claude Code ruft dieses Skript bei jeder Aktion auf (siehe .claude/settings.json).
// Es schreibt eine kurze Zeile nach buero/events.jsonl. Das Büro im Browser liest diese Datei live.
// Wichtig: Das Skript darf Claude nie blockieren. Es endet immer mit Exit-Code 0 und gibt nichts aus.
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, 'events.jsonl');
const MAX_BYTES = 5 * 1024 * 1024;

function kurz(text, n = 90) {
  if (text == null) return '';
  let s = String(text).replace(/\s+/g, ' ').trim();
  // Lange Zeichenketten (mögliche Tokens/Schlüssel) ausblenden, damit nie ein Secret im Log landet.
  s = s.replace(/[A-Za-z0-9_\-+/=]{28,}/g, '•••');
  s = s.replace(/((?:token|key|secret|password|passwort)\S*\s*[=:]\s*)\S+/gi, '$1•••');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function datei(p) {
  if (!p) return '';
  return path.basename(String(p));
}

function info(tool, input) {
  if (!input || typeof input !== 'object') return '';
  switch (tool) {
    case 'Read': case 'Write': case 'Edit': case 'MultiEdit': case 'NotebookEdit':
      return datei(input.file_path || input.notebook_path);
    case 'Bash': return kurz(input.description || input.command, 70);
    case 'Grep': case 'Glob': return kurz(input.pattern, 50);
    case 'WebSearch': return kurz(input.query, 70);
    case 'WebFetch': try { return new URL(input.url).hostname; } catch { return ''; }
    case 'Agent': case 'Task': return kurz(input.description, 70);
    default: return '';
  }
}

function main(raw) {
  let d;
  try { d = JSON.parse(raw); } catch { return; }
  const tool = d.tool_name || '';
  const input = d.tool_input || {};
  const ev = {
    t: Date.now(),
    e: d.hook_event_name || '',
    sid: String(d.session_id || '').slice(0, 8),
  };
  if (d.agent_id) ev.aid = String(d.agent_id);
  if (d.agent_type) ev.at = String(d.agent_type);
  if (tool) { ev.tool = tool; ev.info = info(tool, input); }
  if ((tool === 'Agent' || tool === 'Task') && input.subagent_type) ev.sub = String(input.subagent_type);
  if (d.hook_event_name === 'UserPromptSubmit') ev.info = kurz(d.prompt, 90);

  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > MAX_BYTES) fs.writeFileSync(LOG, '');
    fs.appendFileSync(LOG, JSON.stringify(ev) + '\n');
  } catch { /* nie blockieren */ }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => { try { main(buf); } catch { /* egal */ } process.exit(0); });
setTimeout(() => process.exit(0), 3000).unref();
