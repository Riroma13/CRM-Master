import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  bootstrapChange,
  buildInitialState,
  createContextPacket,
  createTraceEvent,
  gitMutationBarrier,
  persistTransition,
  reconcileTraceState,
  resolveRoute,
  resolveConfiguredRoute,
} from './sdd-runtime.mjs';

const hashes = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };

test('live dispatch context is reused without bootstrap bodies or repeated reads', () => {
  const packet = createContextPacket({
    authorityRefs: { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json' },
    fingerprints: hashes,
    workingSet: ['scripts/sdd-runtime.mjs'],
  });
  const phasePackets = ['Design', 'Tasks', 'Apply 7.4 Integration'].map((phase) => packet.forPhase(phase));
  assert.deepEqual(phasePackets.map((item) => item.audit.bootstrapReadCount), [1, 1, 1]);
  assert.deepEqual(phasePackets.map((item) => item.audit.normalPhaseBootstrapReadCount), [0, 0, 0]);
  assert.equal(Object.hasOwn(phasePackets[0], 'bodies'), false);
});

test('event-first trace publication reconciles an event-only interruption', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-runtime-integration-'));
  try {
    const changePath = join(directory, 'openspec', 'changes', 'interrupted-change');
    const before = buildInitialState({ root: directory, change: 'interrupted-change', fingerprints: hashes });
    const after = { ...before, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } };
    const event = createTraceEvent({ change: before.change, sequence: 1, action: 'Design', role: 'HIGH', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: before, afterState: after });
    await persistTransition({ changePath, event, state: { ...before, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } } });
    const traceText = await readFile(join(changePath, '.sdd-runtime', 'trace', `00000000000000000001-${event.eventHash}.json`), 'utf8');
    const reconciled = reconcileTraceState(before, [JSON.parse(traceText)]);
    assert.equal(reconciled.reconciled, true);
    assert.equal(reconciled.state.traceCursor.eventHash, event.eventHash);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('local wiring barriers reject Git/PR mutation requests before any subprocess', () => {
  for (const operation of ['commit', 'push', 'merge', 'rebase', 'release', 'deploy', 'tag']) {
    assert.throws(() => gitMutationBarrier({ operation, target: 'main' }), /HUMAN_GIT/);
  }
  assert.throws(() => gitMutationBarrier({ operation: 'pull', target: 'refs/heads/main' }), /HUMAN_GIT/);
});

test('LOW routing records same-role fallback and rejects exhaustion', () => {
  const route = resolveRoute({ role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8, candidates: [
    { id: 'primary', role: 'LOW', capabilities: ['evidence'], quality: 0.95, cost: 1, available: false },
    { id: 'fallback', role: 'LOW', capabilities: ['evidence'], quality: 0.9, cost: 2, available: true },
  ] });
  assert.equal(route.resolved, 'fallback');
  assert.equal(route.rejections[0].reason, 'provider-unavailable');
  assert.throws(() => resolveRoute({ role: 'LOW', requiredCapability: 'evidence', candidates: [{ id: 'bad', role: 'MID', capabilities: ['evidence'], cost: 1 }] }), /no compatible route/);
});

test('configured LOW routing selects the actual same-role fallback and fails closed without one', async () => {
  const modelMapPath = join(process.cwd(), '.opencode', 'sdd-model-map.json');
  const configured = JSON.parse(await readFile(modelMapPath, 'utf8'));
  const unavailablePrimary = structuredClone(configured);
  unavailablePrimary.runtime_routing.candidates.LOW[0].available = false;
  const route = await resolveConfiguredRoute({ modelMap: unavailablePrimary, role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8 });
  assert.equal(route.resolved, unavailablePrimary.runtime_routing.candidates.LOW[1].id);
  assert.equal(route.rejections[0].reason, 'provider-unavailable');

  const noFallback = structuredClone(configured);
  noFallback.runtime_routing.fallbacks.LOW = [];
  noFallback.runtime_routing.candidates.LOW[0].available = false;
  await assert.rejects(() => resolveConfiguredRoute({ modelMap: noFallback, role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8 }), /no compatible route/);
});

test('bootstrap publishes one state on a fresh path and preserves collision evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-bootstrap-integration-'));
  const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
  try {
    const first = await bootstrapChange({ root, change: 'race-change', fingerprints });
    const second = await bootstrapChange({ root, change: 'race-change', fingerprints });
    assert.equal(first.disposition, 'CREATED');
    assert.equal(second.disposition, 'REUSED');
    assert.equal(second.state.sequence, 0);
    assert.equal(second.state.checkpoint.next, 'Design');
    assert.deepEqual(await import('node:fs/promises').then(({ readdir }) => readdir(join(first.changePath, '.sdd-runtime'))), ['state.json']);
    assert.deepEqual(await import('node:fs/promises').then(({ readdir }) => readdir(join(first.changePath, '.sdd-runtime', 'trace'))).catch((error) => error.code), 'ENOENT');

    const existingPath = join(root, 'openspec', 'changes', 'preexisting-change');
    await import('node:fs/promises').then(({ mkdir, writeFile }) => mkdir(existingPath, { recursive: true }).then(() => writeFile(join(existingPath, 'user-artifact.md'), 'preserve')));
    await assert.rejects(() => bootstrapChange({ root, change: 'preexisting-change', fingerprints }), /provenance/i);
    assert.equal(await readFile(join(existingPath, 'user-artifact.md'), 'utf8'), 'preserve');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
