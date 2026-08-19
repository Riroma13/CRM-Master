import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('standing chained workload proceeds while true exception stops', () => {
  assert.equal(evaluateWorkloadGuard({ estimatedLines: 900, delivery: 'force-chained', chainStrategy: 'stacked-to-main' }).status, 'PASS');
  assert.equal(evaluateWorkloadGuard({ estimatedLines: 900, delivery: 'size-exception', chainStrategy: 'stacked-to-main', exception: true }).status, 'HUMAN_HANDOFF');
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
  const legacy = await readFile(new URL('../opencode.json', import.meta.url), 'utf8');
  assert.match(orchestrator, /sdd-runtime\.mjs/);
  assert.match(legacy, /CRM_SDD_LEGACY_BOUNDARY/);
  assert.deepEqual(Object.keys(BLOCKER_POLICIES).length, 12);
});
