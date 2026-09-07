import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  BLOCKER_POLICIES,
  buildInitialState,
  dispatchUntilTerminal,
  evaluateWorkloadGuard,
  reconstructState,
  resolveRoute,
  selectNextTransition,
  validateRuntimeState,
  createTraceEvent,
  persistTransition,
  recoverStrandedCheckpoint,
  hashObject,
  STRANDED_RECOVERY_TARGET,
} from './sdd-runtime.mjs';

const hashes = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
const edges = {
  Design: 'Architecture Review', 'Architecture Review': 'Tasks', Tasks: 'Tasks Review', 'Tasks Review': 'Workload Guard',
  'Workload Guard': 'Apply 7.1 Foundation', 'Apply 7.1 Foundation': 'Apply 7.2 Core Engine', 'Apply 7.2 Core Engine': 'Apply 7.3 Feature Implementation',
  'Apply 7.3 Feature Implementation': 'Apply 7.4 Integration', 'Apply 7.4 Integration': 'Apply 7.5 Testing', 'Apply 7.5 Testing': 'Apply 7.6 Apply Summary',
  'Apply 7.6 Apply Summary': 'Verify', Verify: 'Archive', Archive: 'Health Report', 'Health Report': 'Repository Ready',
};
const highPhases = new Set(['Design', 'Architecture Review', 'Design Refinement', 'Verify']);
const outcomeFor = (change, action) => ({ change, action, role: highPhases.has(action) ? 'HIGH' : ['Archive', 'Health Report', 'Repository Ready'].includes(action) ? 'LOW' : 'MID', status: 'PASS', artifacts: [], evidence: [`fixture:${action}`], next: edges[action] || 'HUMAN_HANDOFF' });

function initialState() {
  return buildInitialState({ root: '/repo', change: 'e2e-change', fingerprints: hashes });
}

test('one invocation reaches Repository Ready with exactly one final HUMAN handoff', () => {
  let executorCalls = 0;
  const result = dispatchUntilTerminal({
    state: initialState(),
    execute: (state) => { executorCalls += 1; return outcomeFor(state.change, state.checkpoint.next); },
  });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.equal(result.state.checkpoint.phase, 'Repository Ready');
  assert.equal(executorCalls, 15);
  assert.equal(result.state.lastTransition.action, 'Repository Ready');
});

test('one generic recovery invocation continues from an interrupted READY checkpoint', () => {
  const actions = ['Design', 'Architecture Review', 'Tasks', 'Tasks Review', 'Workload Guard'];
  const interrupted = dispatchUntilTerminal({ state: initialState(), outcomes: actions.map((action) => outcomeFor('e2e-change', action)) });
  assert.equal(interrupted.state.checkpoint.next, 'Apply 7.1 Foundation');
  let resumedCalls = 0;
  const resumed = dispatchUntilTerminal({ state: interrupted.state, execute: (state) => { resumedCalls += 1; return outcomeFor(state.change, state.checkpoint.next); } });
  assert.equal(resumed.status, 'HUMAN_HANDOFF');
  assert.equal(resumed.state.checkpoint.phase, 'Repository Ready');
  assert.equal(resumedCalls, 10);
});

test('all AC-06 HUMAN blocker classes stop without executor dispatch', () => {
  for (const blockerClass of ['HUMAN_ARCHITECTURE', 'HUMAN_SECURITY', 'HUMAN_SCOPE', 'HUMAN_GIT']) {
    let calls = 0;
    const result = dispatchUntilTerminal({ state: initialState(), execute: () => { calls += 1; return outcomeFor('e2e-change', 'Design'); }, outcomes: [{ change: 'e2e-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: [], next: 'Design', blocker: { class: blockerClass, human_required: true, reason: blockerClass, resume_phase: null } }] });
    assert.equal(result.status, 'HUMAN_HANDOFF');
    assert.equal(result.blocker.class, blockerClass);
    assert.equal(calls, 0);
  }
});

test('machine-recoverable blocker follows bounded retry policy without HUMAN', () => {
  const outcomes = [
    { change: 'e2e-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: ['quota'], next: 'Design', blocker: { class: 'AUTO_RETRY', human_required: false, reason: 'transient', resume_phase: 'Design' } },
    outcomeFor('e2e-change', 'Design'),
  ];
  const result = dispatchUntilTerminal({ state: initialState(), outcomes });
  assert.equal(result.status, 'READY');
  assert.equal(result.state.checkpoint.next, 'Architecture Review');
  assert.equal(result.state.attempts.Design, 2);
});

test('small and very large in-scope forecasts pass without execution topology', () => {
  for (const estimatedLines of [100, 1500, 1000000]) {
    const result = evaluateWorkloadGuard({ estimatedLines, withinApprovedDesign: true, withinApprovedTasks: true, withinApprovedWorkingSet: true });
    assert.equal(result.status, 'PASS');
    assert.equal(result.human_required, false);
    assert.equal(Object.hasOwn(result, 'partition'), false);
    assert.equal(Object.hasOwn(result, 'delivery'), false);
    assert.equal(Object.hasOwn(result, 'chainStrategy'), false);
  }
});

test('material scope expansion remains a semantic HUMAN stop', () => {
  const result = evaluateWorkloadGuard({ estimatedLines: 1500, withinApprovedWorkingSet: false });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.equal(result.blocker.class, 'HUMAN_SCOPE');
  assert.equal(result.blocker.resume_phase, 'Design Refinement');
});

test('scope and unsafe state remain fail-closed', () => {
  const state = initialState();
  assert.throws(() => selectNextTransition(state, outcomeFor('foreign-change', 'Design')), /scope mismatch/);
  assert.throws(() => validateRuntimeState({ ...state, sequence: 1 }), /trace cursor sequence mismatch/);
  assert.throws(() => reconstructState({ root: '/repo', change: 'e2e-change', artifacts: [{ phase: 'Design' }, { phase: 'Tasks' }] }), /ambiguous/);
});

test('local agents and legacy commands remain project-local and STOP-only', async () => {
  const map = JSON.parse(await readFile(new URL('../.opencode/sdd-model-map.json', import.meta.url), 'utf8'));
  assert.equal(map.phase_roles.Commit, 'HUMAN');
  assert.equal(map.phase_roles.Push, 'HUMAN');
  assert.equal(map.phase_roles.Merge, 'HUMAN');
  const orchestrator = await readFile(new URL('../.opencode/agents/sdd-direct-orchestrator.md', import.meta.url), 'utf8');
  const direct = await readFile(new URL('../.opencode/commands/sdd-direct.md', import.meta.url), 'utf8');
  const legacy = await readFile(new URL('../opencode.json', import.meta.url), 'utf8');
  assert.match(orchestrator, /sdd-runtime\.mjs/);
  assert.match(orchestrator, /persistExecutorOutcome/);
  assert.match(orchestrator, /persistTransition/);
  assert.match(direct, /persistExecutorOutcome/);
  assert.match(orchestrator, /technical planning/i);
  assert.match(direct, /technical planning/i);
  assert.match(legacy, /CRM_SDD_LEGACY_BOUNDARY/);
  assert.deepEqual(Object.keys(BLOCKER_POLICIES).length, 12);
});

test('unrecovered HUMAN_HANDOFF remains terminal and concurrent recovery is fail-closed', async () => {
  let calls = 0;
  const stopped = dispatchUntilTerminal({ state: { ...initialState(), status: 'HUMAN_HANDOFF', checkpoint: { phase: 'Apply 7.3 Feature Implementation', artifact: null, verdict: 'BLOCKED', next: null } }, execute: () => { calls += 1; return outcomeFor('e2e-change', 'Apply 7.3 Feature Implementation'); } });
  assert.equal(stopped.status, 'HUMAN_HANDOFF'); assert.equal(calls, 0);

  const root = await mkdtemp(join(tmpdir(), 'crm-stranded-e2e-')); const change = 'e2e-stranded'; const changePath = join(root, 'openspec', 'changes', change);
  const refs = { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' }; await Promise.all([mkdir(join(root, 'docs'), { recursive: true }), mkdir(join(root, '.opencode'), { recursive: true }), mkdir(join(root, 'openspec'), { recursive: true })]); for (const [key, file] of Object.entries(refs)) await writeFile(join(root, file), key);
  const fingerprints = { workflow: hashObject(await readFile(join(root, refs.workflow))), modelMap: hashObject(await readFile(join(root, refs.modelMap))), config: hashObject(await readFile(join(root, refs.config))), artifacts: {} };
  let state = buildInitialState({ root, change, fingerprints });
  for (const [index, action] of ['Apply 7.2 Core Engine'].entries()) {
    const after = { ...state, sequence: 1, checkpoint: { phase: action, artifact: null, verdict: 'PASS', next: 'Apply 7.3 Feature Implementation' }, traceCursor: { sequence: 1, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), afterStateHash: hashObject({ action }) } };
    const event = createTraceEvent({ change, sequence: index + 1, action, role: 'MID', inputHash: after.lastTransition.inputHash, outcomeHash: after.lastTransition.outcomeHash, beforeState: state, afterState: after }); await persistTransition({ changePath, event, state: after }); state = { ...after, traceCursor: { sequence: 1, eventHash: event.eventHash, chainHash: event.chainHash } };
  }
  const after = { ...state, status: 'HUMAN_HANDOFF', sequence: 2, checkpoint: { phase: 'Apply 7.3 Feature Implementation', artifact: null, verdict: 'BLOCKED', next: null }, traceCursor: { sequence: 2, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'f'.repeat(64), outcomeHash: 'a'.repeat(64), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } };
  const handoff = createTraceEvent({ change, sequence: 2, action: 'Apply 7.3 Feature Implementation', role: 'MID', inputHash: after.lastTransition.inputHash, outcomeHash: after.lastTransition.outcomeHash, beforeState: state, afterState: after }); await persistTransition({ changePath, event: handoff, state: after });
  const request = { root, change, canonicalPath: changePath, expectedSequence: 2, target: STRANDED_RECOVERY_TARGET, authorityRefs: refs, fingerprints, authorization: { actor: 'HUMAN / MAINTAINER', approval: 'approval' } };
  try { const results = await Promise.allSettled([recoverStrandedCheckpoint(request), recoverStrandedCheckpoint(request)]); assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1); assert.equal(results.filter((item) => item.status === 'rejected').length, 1); assert.match(results.find((item) => item.status === 'rejected').reason.message, /concurrent|stale/i); } finally { await rm(root, { recursive: true, force: true }); }
});
