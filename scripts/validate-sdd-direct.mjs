#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS = join(ROOT, '.opencode', 'agents');
const COMMAND = join(ROOT, '.opencode', 'commands', 'sdd-direct.md');
const GUARD = join(ROOT, 'docs', 'sdd-workflow-guard.md');
const DIRECT_ARCHITECTURE = join(ROOT, 'docs', 'architecture', 'sdd-direct.md');
const ORCHESTRATOR = join(AGENTS, 'sdd-direct-orchestrator.md');
const VERIFY = join(AGENTS, 'sdd-direct-verify.md');
const KEEP_AGENTS = ['sdd-direct-orchestrator.md', 'sdd-direct-design.md', 'sdd-direct-architecture-review.md', 'sdd-direct-verify.md'];
const CANONICAL = 'openspec/changes/<change-name>/';
const FORBIDDEN = 'docs/sdd-direct/changes/';
const RECOVERY_PATH = 'Verify BLOCKED -> orchestrator-owned Direct Fix -> Verify';
const PREFLIGHT_SEQUENCE = 'Direct preflight -> Design';

const failures = [];
const fail = (m) => failures.push(m);
const p = (f) => relative(ROOT, f) || '.';
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
function fm(text) {
  if (!text || !text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const m = {};
  for (const line of text.slice(4, end).split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match) m[match[1]] = match[2].trim();
  }
  return { fm: m, body: text.slice(end + 5) };
}

// Rule 1: Frontmatter structure validation
for (const name of KEEP_AGENTS) {
  const f = join(AGENTS, name);
  if (!read(f)) { fail(`${p(f)}: missing`); continue; }
  if (!fm(read(f))) fail(`${p(f)}: invalid frontmatter`);
}
const cmd = read(COMMAND);
if (!cmd || !fm(cmd)) fail(`${p(COMMAND)}: invalid frontmatter`);

// Rule 2: Mode validation
for (const name of KEEP_AGENTS) {
  const parsed = fm(read(join(AGENTS, name)));
  if (!parsed) continue;
  if (name === 'sdd-direct-orchestrator.md' && parsed.fm.mode !== 'primary') fail(`${name}: mode must be primary`);
  if (name !== 'sdd-direct-orchestrator.md' && parsed.fm.mode !== 'subagent') fail(`${name}: mode must be subagent`);
}

// Rule 3: Description presence
for (const name of KEEP_AGENTS) {
  const parsed = fm(read(join(AGENTS, name)));
  if (parsed && !parsed.fm.description) fail(`${name}: missing description`);
}
const cmdParsed = fm(cmd);
if (cmdParsed && !cmdParsed.fm.description) fail(`${p(COMMAND)}: missing description`);

// Rule 4: Command selects sdd-direct-orchestrator
if (cmdParsed && cmdParsed.fm.agent !== 'sdd-direct-orchestrator') fail(`${p(COMMAND)}: agent must be sdd-direct-orchestrator`);

// Rule 5: Canonical path reference
if (cmdParsed && !cmdParsed.body.includes(CANONICAL)) fail(`${p(COMMAND)}: must reference ${CANONICAL}`);
for (const name of KEEP_AGENTS) {
  const parsed = fm(read(join(AGENTS, name)));
  if (parsed && !parsed.body.includes(CANONICAL)) fail(`${name}: must reference ${CANONICAL}`);
}

// Rule 6: Forbidden store absence
if (existsSync(join(ROOT, FORBIDDEN))) fail(`forbidden store exists: ${FORBIDDEN}`);
for (const name of [...KEEP_AGENTS, 'sdd-direct.md']) {
  const f = name === 'sdd-direct.md' ? COMMAND : join(AGENTS, name);
  const text = read(f);
  if (text && text.includes(FORBIDDEN)) fail(`${name}: references forbidden store`);
}

// Rule 7: Direct Verify recovery invariants
const guard = read(GUARD);
const directArchitecture = read(DIRECT_ARCHITECTURE);
const orchestrator = read(ORCHESTRATOR);
const verify = read(VERIFY);
const requireText = (text, expected, message) => {
  if (!text || !text.includes(expected)) fail(message);
};
const requirePattern = (text, pattern, message) => {
  if (!text || !pattern.test(text)) fail(message);
};

requireText(guard, RECOVERY_PATH, 'Workflow Guard: Verify BLOCKED must route through orchestrator-owned Direct Fix back to Verify');
requireText(directArchitecture, RECOVERY_PATH, 'Direct architecture: Verify BLOCKED recovery loop is missing');
requireText(orchestrator, RECOVERY_PATH, 'Orchestrator: Direct Fix must return control to Verify');
requireText(verify, RECOVERY_PATH, 'Verify: BLOCKED result must route to orchestrator-owned Direct Fix and back to Verify');
requirePattern(
  guard,
  /While Verify is\s*`BLOCKED`,\s+Archive,\s+Health\s+Report,\s+and Repository Ready are forbidden/,
  'Workflow Guard: Archive, Health Report, and Repository Ready must be forbidden from BLOCKED Verify',
);
if (existsSync(join(AGENTS, 'sdd-direct-fix.md'))) fail('Direct Fix must remain a repair mode, not an agent');

// Rule 8: Direct preflight sequencing
requireText(orchestrator, PREFLIGHT_SEQUENCE, 'Orchestrator: Direct preflight must precede Design');
requireText(directArchitecture, PREFLIGHT_SEQUENCE, 'Direct architecture: Direct preflight must precede Design');
requirePattern(
  orchestrator,
  /The first Direct step, before Design or any phase execution/,
  'Orchestrator: Direct preflight must be the first step before phase execution',
);
requireText(orchestrator, '`sdd-direct-orchestrator` owns this step', 'Orchestrator: Direct preflight ownership is missing');

// Rule 9: Maintainer-controlled terminal gates
requireText(directArchitecture, 'manual maintainer-controlled destructive gates', 'Direct architecture: terminal gates must remain maintainer-controlled');
requireText(orchestrator, 'manual maintainer-controlled destructive gates', 'Orchestrator: terminal gates must remain maintainer-controlled');
requirePattern(directArchitecture, /Commit,\s+Push,\s+Merge,\s+Release,\s+and Tag/, 'Direct architecture: terminal gate list is incomplete');

if (failures.length) {
  console.error('SDD-Direct validation: FAIL');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exitCode = 1;
} else {
  console.log('SDD-Direct validation: PASS');
  console.log(`- ${KEEP_AGENTS.length} agents valid`);
  console.log('- Command routes to orchestrator');
  console.log('- Canonical path and forbidden store checks passed');
  console.log('- Verify BLOCKED recovery loop is orchestrator-owned and returns to Verify');
  console.log('- Direct preflight precedes Design');
  console.log('- Terminal destructive gates remain maintainer-controlled');
}
