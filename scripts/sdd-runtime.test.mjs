import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  BLOCKER_POLICIES,
  atomicWriteJson,
  bootstrapChange,
  canonicalJson,
  createTraceEvent,
  fingerprintFiles,
  hashObject,
  buildInitialState,
  dispatchUntilTerminal,
  createContextPacket,
  evaluateWorkloadGuard,
  gitMutationBarrier,
  idempotencyKey,
  projectCanonicalWorkflow,
  reconstructState,
  recoverLegacyChange,
  recordAttempt,
  reconcileTraceState,
  selectNextTransition,
  persistTransition,
  resolveRoute,
  safeValidateOutcome,
  validateBlocker,
  validateOutcomePacket,
  validateIdentity,
  validateRuntimeState,
  validateTraceSequence,
  validateTraceEvent,
  recoverStrandedCheckpoint,
  STRANDED_RECOVERY_TARGET,
} from './sdd-runtime.mjs';

async function strandedFixture() {
  const root = await mkdtemp(join(tmpdir(), 'crm-stranded-unit-'));
  const change = 'fixture-stranded';
  const changePath = join(root, 'openspec', 'changes', change);
  const refs = { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' };
  await Promise.all([mkdir(join(root, 'docs'), { recursive: true }), mkdir(join(root, '.opencode'), { recursive: true }), mkdir(join(root, 'openspec'), { recursive: true })]);
  for (const [key, name] of Object.entries(refs)) await writeFile(join(root, name), `${key}: canonical\n`);
  const fingerprints = { workflow: hashObject(await readFile(join(root, refs.workflow))), modelMap: hashObject(await readFile(join(root, refs.modelMap))), config: hashObject(await readFile(join(root, refs.config))), artifacts: {} };
  let state = buildInitialState({ root, change, fingerprints });
  const actions = ['Design', 'Architecture Review', 'Tasks', 'Tasks Review', 'Workload Guard', 'Apply 7.1 Foundation', 'Apply 7.2 Core Engine'];
  const events = [];
  for (const action of actions) {
    const after = { ...state, sequence: state.sequence + 1, checkpoint: { phase: action, artifact: `${action}.md`, verdict: 'PASS', next: action === 'Apply 7.2 Core Engine' ? 'Apply 7.3 Feature Implementation' : projectCanonicalWorkflow().edges[action] }, traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), afterStateHash: hashObject({ action }) } };
    const event = createTraceEvent({ change, sequence: after.sequence, action, role: action === 'Design' || action === 'Architecture Review' ? 'HIGH' : 'MID', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: state, afterState: after });
    await persistTransition({ changePath, event, state: after });
    state = { ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } };
    events.push(event);
  }
  const handoff = { ...state, status: 'HUMAN_HANDOFF', sequence: state.sequence + 1, checkpoint: { phase: 'Apply 7.3 Feature Implementation', artifact: 'apply.md', verdict: 'BLOCKED', next: null }, traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'f'.repeat(64), outcomeHash: 'a'.repeat(64), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } };
  const handoffEvent = createTraceEvent({ change, sequence: handoff.sequence, action: 'Apply 7.3 Feature Implementation', role: 'MID', inputHash: handoff.lastTransition.inputHash, outcomeHash: handoff.lastTransition.outcomeHash, beforeState: state, afterState: handoff });
  await persistTransition({ changePath, event: handoffEvent, state: handoff });
  state = { ...handoff, traceCursor: { sequence: handoffEvent.sequence, eventHash: handoffEvent.eventHash, chainHash: handoffEvent.chainHash } };
  return { root, change, changePath, state, fingerprints, refs, events: [...events, handoffEvent] };
}

test('canonical JSON and hashes are deterministic', () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(hashObject({ a: 1, b: 2 }), hashObject({ b: 2, a: 1 }));
});

test('identity rejects relative escape and accepts a canonical change path', () => {
  assert.throws(() => validateIdentity({ root: '/repo', change: '../foreign' }), /change name|path/i);
  assert.deepEqual(
    validateIdentity({ root: '/repo', change: 'demo-change' }),
    { root: '/repo', change: 'demo-change', changePath: '/repo/openspec/changes/demo-change' },
  );
});

test('blocker policy is total and human-required values are discriminated', () => {
  assert.equal(Object.keys(BLOCKER_POLICIES).length, 12);
  assert.equal(validateBlocker({ class: 'HUMAN_GIT', human_required: true, reason: 'handoff', resume_phase: null }).policy, 'STOP/HUMAN_HANDOFF');
  assert.throws(
    () => validateBlocker({ class: 'AUTO_RETRY', human_required: true, reason: 'bad', resume_phase: 'Apply' }),
    /human_required/i,
  );
});

test('route preserves logical role and chooses the cheapest compatible candidate', () => {
  const decision = resolveRoute({
    role: 'LOW',
    requiredCapability: 'evidence',
    candidates: [
      { id: 'expensive', role: 'LOW', capabilities: ['evidence'], cost: 5 },
      { id: 'cheap', role: 'LOW', capabilities: ['evidence'], cost: 1 },
      { id: 'wrong-role', role: 'MID', capabilities: ['evidence'], cost: 0 },
    ],
  });
  assert.equal(decision.resolved, 'cheap');
  assert.deepEqual(decision.rejections, [{ id: 'wrong-role', reason: 'role-mismatch' }]);
});

test('trace event hashes and state contracts validate', () => {
  const state = {
    schemaVersion: 2, change: 'demo-change', canonicalPath: '/repo/openspec/changes/demo-change',
    status: 'READY', sequence: 0,
    checkpoint: { phase: null, artifact: null, verdict: null, next: 'Design' },
    fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64), artifacts: {} },
    attempts: {}, traceCursor: { sequence: 0, eventHash: null, chainHash: null }, lastTransition: null,
  };
  assert.deepEqual(validateRuntimeState(state), state);
  const event = createTraceEvent({ change: 'demo-change', sequence: 1, action: 'Design', role: 'HIGH', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: state, afterState: { ...state, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } } });
  assert.equal(validateTraceEvent(event).eventHash, event.eventHash);
  assert.deepEqual(validateTraceSequence([event]).map((item) => item.sequence), [1]);
});

test('outcomes require exactly one validated blocker when not passing', () => {
  assert.throws(() => validateOutcomePacket({ change: 'demo-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: [], next: 'Design' }), /requires blocker/i);
  const outcome = validateOutcomePacket({ change: 'demo-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: ['invalid blocker'], next: 'Design', blocker: { class: 'FATAL_INVARIANT', human_required: true, reason: 'corrupt state', resume_phase: null } });
  assert.equal(outcome.blocker.class, 'FATAL_INVARIANT');
});

test('outcome contract rejects missing next, object evidence, missing blocker class, and extra phase fields', () => {
  const pass = { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'PASS', artifacts: [], evidence: [], next: 'Architecture Review' };
  assert.throws(() => validateOutcomePacket({ ...pass, next: undefined }), /next/i);
  assert.throws(() => validateOutcomePacket({ ...pass, evidence: { result: 'ok' } }), /shape|evidence/i);
  assert.throws(() => validateOutcomePacket({ ...pass, phase: 'Design' }), /unknown outcome field/i);
  assert.throws(() => validateOutcomePacket({ ...pass, status: 'BLOCKED', next: 'Design', blocker: { human_required: true, reason: 'blocked', resume_phase: null } }), /class/i);
});

test('valid PASS and BLOCKED packets are accepted and malformed packets fail closed', () => {
  const pass = { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'PASS', artifacts: [], evidence: ['complete'], next: 'Architecture Review' };
  assert.doesNotThrow(() => validateOutcomePacket(pass));
  const blocked = { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: ['needs review'], next: 'Design', blocker: { class: 'AUTO_RETRY', human_required: false, reason: 'bounded retry', resume_phase: 'Design' } };
  assert.doesNotThrow(() => validateOutcomePacket(blocked));
  const malformed = safeValidateOutcome({ ...blocked, evidence: { object: true } });
  assert.equal(malformed.status, 'HUMAN_HANDOFF');
  assert.equal(malformed.blocker.class, 'FATAL_INVARIANT');
  assert.equal(malformed.blocker.human_required, true);
});

test('two environment-recoverable Apply blocks can be followed by PASS without consuming another attempt', () => {
  const action = 'Apply 7.3 Feature Implementation';
  const state = {
    ...buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } }),
    checkpoint: { phase: action, artifact: 'apply-progress.md', verdict: 'BLOCKED', next: action },
  };
  const blocked = (run) => ({
    change: 'demo-change', action, role: 'MID', status: 'BLOCKED', artifacts: ['apply-progress.md'],
    evidence: [`environment unavailable: run ${run}`], next: action,
    blocker: { class: 'ENVIRONMENT_RECOVERABLE', human_required: false, reason: `Redis unavailable on run ${run}`, resume_phase: action },
  });
  const pass = { change: 'demo-change', action, role: 'MID', status: 'PASS', artifacts: ['apply-progress.md'], evidence: ['environment recovered'], next: 'Apply 7.4 Integration' };

  const first = dispatchUntilTerminal({ state, outcomes: [blocked(1)] });
  const second = dispatchUntilTerminal({ state: first.state, outcomes: [blocked(2)] });
  const result = dispatchUntilTerminal({ state: second.state, outcomes: [pass] });

  assert.equal(first.state.attempts[action], 1);
  assert.equal(second.state.attempts[action], 2);
  assert.equal(result.status, 'READY');
  assert.equal(result.state.checkpoint.verdict, 'PASS');
  assert.equal(result.state.checkpoint.next, 'Apply 7.4 Integration');
  assert.equal(result.state.attempts[action], 2);
  assert.deepEqual(result.state.attempts, second.state.attempts);
});

test('non-PASS Apply retry accounting remains fail-closed after its budget is exhausted', () => {
  const action = 'Apply 7.3 Feature Implementation';
  const state = {
    ...buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } }),
    checkpoint: { phase: action, artifact: 'apply-progress.md', verdict: 'BLOCKED', next: action },
  };
  const blocked = (run) => ({
    change: 'demo-change', action, role: 'MID', status: 'BLOCKED', artifacts: ['apply-progress.md'],
    evidence: [`environment unavailable: run ${run}`], next: action,
    blocker: { class: 'ENVIRONMENT_RECOVERABLE', human_required: false, reason: `Redis unavailable on run ${run}`, resume_phase: action },
  });

  const first = dispatchUntilTerminal({ state, outcomes: [blocked(1)] });
  const second = dispatchUntilTerminal({ state: first.state, outcomes: [blocked(2)] });
  const exhausted = dispatchUntilTerminal({ state: second.state, outcomes: [blocked(3)] });

  assert.equal(second.state.attempts[action], 2);
  assert.equal(exhausted.status, 'HUMAN_HANDOFF');
  assert.equal(exhausted.blocker.class, 'FATAL_INVARIANT');
  assert.equal(exhausted.state.attempts[action], 2);
  assert.equal(exhausted.state.checkpoint.next, null);
});

test('human-required BLOCKED handoff materializes its actual action and artifact', () => {
  const action = 'Apply 7.5 Testing';
  const blocked = {
    change: 'demo-change', action, role: 'MID', status: 'BLOCKED', artifacts: ['tasks.md'],
    evidence: ['bounded recoverable evidence'], next: action,
    blocker: { class: 'HUMAN_SCOPE', human_required: true, reason: 'bounded scope decision', resume_phase: action },
  };
  const state = {
    ...buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } }),
    checkpoint: { phase: 'Apply 7.4 Integration', artifact: 'tasks.md', verdict: 'PASS', next: action },
  };
  const result = dispatchUntilTerminal({ state, outcomes: [blocked] });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.deepEqual(result.state.checkpoint, { phase: action, artifact: 'tasks.md', verdict: 'BLOCKED', next: null });
});

test('atomic JSON writes replace the target without partial output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-runtime-'));
  try {
    const target = join(directory, 'state.json');
    await atomicWriteJson(target, { status: 'READY' });
    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), { status: 'READY' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('file fingerprints include path and content hashes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-fingerprint-'));
  try {
    const file = join(directory, 'artifact.md');
    await atomicWriteJson(file, { ok: true });
    const fingerprints = await fingerprintFiles([file]);
    assert.equal(fingerprints[file].length, 64);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('canonical projection selects only the legal next action', () => {
  const projection = projectCanonicalWorkflow();
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const transition = selectNextTransition(state, { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'PASS', artifacts: [], evidence: [], next: 'Architecture Review' }, projection);
  assert.deepEqual(transition, { action: 'Architecture Review', role: 'HIGH', kind: 'canonical' });
  assert.throws(() => selectNextTransition(state, { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'PASS', artifacts: [], evidence: [], next: 'Commit' }, projection), /illegal|next/i);
});

test('blocked Architecture Review selects only Design Refinement when its budget is available', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const blocked = {
    change: 'demo-change', action: 'Architecture Review', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: ['design contradiction'], next: 'Design Refinement',
    blocker: { class: 'AUTO_REFINE', human_required: false, reason: 'bounded design correction', resume_phase: 'Architecture Review' },
  };
  const transition = selectNextTransition({ ...state, checkpoint: { ...state.checkpoint, next: 'Architecture Review' } }, blocked);
  assert.deepEqual(transition, { action: 'Design Refinement', role: 'HIGH', kind: 'refinement' });
});

test('blocked Tasks Review remains on the distinct Tasks Refinement path', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const blocked = {
    change: 'demo-change', action: 'Tasks Review', role: 'MID', status: 'BLOCKED', artifacts: [], evidence: ['task contradiction'], next: 'Tasks Refinement',
    blocker: { class: 'AUTO_REFINE', human_required: false, reason: 'bounded task correction', resume_phase: 'Tasks Review' },
  };
  const transition = selectNextTransition({ ...state, checkpoint: { ...state.checkpoint, next: 'Tasks Review' } }, blocked);
  assert.deepEqual(transition, { action: 'Tasks Refinement', role: 'MID', kind: 'refinement' });
  assert.notEqual(transition.action, 'Design Refinement');
});

test('Design Refinement PASS returns to a fresh Architecture Review', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const refinementState = {
    ...state,
    checkpoint: { phase: 'Architecture Review', artifact: 'architecture-review.md', verdict: 'BLOCKED', next: 'Design Refinement' },
  };
  const outcome = { change: 'demo-change', action: 'Design Refinement', role: 'HIGH', status: 'PASS', artifacts: ['design.md'], evidence: ['refinement complete'], next: 'Architecture Review' };
  assert.deepEqual(selectNextTransition(refinementState, outcome), { action: 'Architecture Review', role: 'HIGH', kind: 'canonical' });
});

test('exhausted refinement and cross-layer refinement stop with FATAL/HUMAN', () => {
  const base = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const architectureBlocked = {
    change: 'demo-change', action: 'Architecture Review', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: ['repeat'], next: 'Design Refinement',
    blocker: { class: 'AUTO_REFINE', human_required: false, reason: 'repeat', resume_phase: 'Architecture Review' },
  };
  const exhausted = selectNextTransition({
    ...base,
    checkpoint: { phase: 'Architecture Review', artifact: 'architecture-review.md', verdict: 'BLOCKED', next: 'Architecture Review' },
    attempts: { 'Design Refinement': 1 },
  }, architectureBlocked);
  assert.equal(exhausted.action, 'HUMAN_HANDOFF');
  assert.equal(exhausted.blocker.class, 'FATAL_INVARIANT');
  assert.equal(exhausted.blocker.human_required, true);

  const illegal = selectNextTransition({ ...base, checkpoint: { ...base.checkpoint, next: 'Tasks Review' } }, architectureBlocked);
  assert.equal(illegal.action, 'HUMAN_HANDOFF');
  assert.equal(illegal.blocker.class, 'FATAL_INVARIANT');
});

test('PASS checkpoint mismatches stop with the selector-owned FATAL/HUMAN handoff', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const transition = selectNextTransition(
    { ...state, checkpoint: { ...state.checkpoint, next: 'Tasks Review' } },
    { change: 'demo-change', action: 'Architecture Review', role: 'HIGH', status: 'PASS', artifacts: [], evidence: [], next: 'Tasks' },
  );
  assert.equal(transition.action, 'HUMAN_HANDOFF');
  assert.equal(transition.blocker.class, 'FATAL_INVARIANT');
  assert.equal(transition.blocker.human_required, true);
});

test('outcome roles must match canonical ownership for HIGH, MID, and LOW actions', () => {
  const projection = projectCanonicalWorkflow();
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const cases = [
    ['Design', 'Architecture Review', 'HIGH', 'MID'],
    ['Tasks', 'Tasks Review', 'MID', 'HIGH'],
    ['Archive', 'Health Report', 'LOW', 'MID'],
  ];
  for (const [action, next, canonicalRole, wrongRole] of cases) {
    const outcome = { change: 'demo-change', action, role: wrongRole, status: 'PASS', artifacts: [], evidence: [], next };
    assert.throws(() => validateOutcomePacket(outcome), /canonical role/i);
    assert.throws(() => selectNextTransition({ ...state, checkpoint: { ...state.checkpoint, next: action } }, outcome, projection), /canonical role/i);
    assert.doesNotThrow(() => validateOutcomePacket({ ...outcome, role: canonicalRole }));
  }
});

test('recovery reconstructs the last provable checkpoint and rejects ambiguity', () => {
  const recovered = reconstructState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) }, artifacts: [{ name: 'tasks-review.md', phase: 'Tasks Review', status: 'PASS', next: 'Workload Guard' }] });
  assert.equal(recovered.checkpoint.next, 'Workload Guard');
  assert.throws(() => reconstructState({ root: '/repo', change: 'demo-change', artifacts: [{ name: 'design.md', phase: 'Design' }, { name: 'tasks.md', phase: 'Tasks' }] }), /ambiguous/i);
});

test('attempt accounting is bounded and idempotency keys are stable', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const attempted = recordAttempt(state, 'Design');
  assert.equal(attempted.attempts.Design, 1);
  assert.equal(idempotencyKey('demo-change', 1, 'Design', 'a'.repeat(64)).length, 64);
  assert.throws(() => recordAttempt(recordAttempt(attempted, 'Design'), 'Design'), /budget/i);
});

test('duplicate outcomes are accepted only when their payload is identical', () => {
  const outcome = { change: 'demo-change', action: 'Design', role: 'HIGH', status: 'PASS', artifacts: [], evidence: [], next: 'Architecture Review' };
  const first = dispatchUntilTerminal({ state: buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } }), outcomes: [outcome] });
  assert.equal(first.status, 'READY');
  assert.equal(first.duplicate, false);
  assert.equal(dispatchUntilTerminal({ state: first.state, outcomes: [outcome] }).duplicate, true);
  const mismatch = dispatchUntilTerminal({ state: first.state, outcomes: [{ ...outcome, next: 'Tasks' }] });
  assert.equal(mismatch.status, 'HUMAN_HANDOFF');
  assert.equal(mismatch.blocker.class, 'FATAL_INVARIANT');
});

test('Git mutation barrier rejects every unauthorized lifecycle request', () => {
  for (const operation of ['commit', 'push', 'merge', 'rebase', 'release', 'deploy', 'tag']) {
    assert.throws(() => gitMutationBarrier({ operation, target: 'main' }), /HUMAN|Git/i);
  }
  assert.throws(() => gitMutationBarrier({ operation: 'pull', target: 'main' }), /direct-to-main|HUMAN|Git/i);
});

test('event-first persistence does not overwrite an existing trace event', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-trace-'));
  try {
    const state = buildInitialState({ root: directory, change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
    const event = createTraceEvent({ change: 'demo-change', sequence: 1, action: 'Design', role: 'HIGH', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: state, afterState: { ...state, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } } });
    const persistedState = { ...state, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } };
    await persistTransition({ changePath: join(directory, 'openspec', 'changes', 'demo-change'), event, state: persistedState });
    await writeFile(join(directory, 'openspec', 'changes', 'demo-change', '.sdd-runtime', 'state.json'), `${JSON.stringify(state)}\n`);
    const repeat = await persistTransition({ changePath: join(directory, 'openspec', 'changes', 'demo-change'), event, state: persistedState });
    assert.equal(repeat.duplicate, true);
    assert.deepEqual(
      JSON.parse(await readFile(join(directory, 'openspec', 'changes', 'demo-change', '.sdd-runtime', 'state.json'))),
      { ...persistedState, traceCursor: { sequence: 1, eventHash: event.eventHash, chainHash: event.chainHash } },
    );
    assert.deepEqual(
      await readdir(join(directory, 'openspec', 'changes', 'demo-change', '.sdd-runtime', 'trace')),
      [`00000000000000000001-${event.eventHash}.json`],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('trace recovery fails closed on gaps and state ahead of trace', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const event = createTraceEvent({ change: 'demo-change', sequence: 1, action: 'Design', role: 'HIGH', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: state, afterState: { ...state, sequence: 1, traceCursor: { sequence: 1, eventHash: null, chainHash: null } } });
  assert.throws(() => validateTraceSequence([{ ...event, sequence: 2 }]), /gap|duplicate|hash/i);
  const ahead = { ...state, sequence: 2, traceCursor: { sequence: 2, eventHash: 'f'.repeat(64), chainHash: 'f'.repeat(64) } };
  assert.throws(() => reconcileTraceState(ahead, [event]), /ahead|conflict/i);
});

test('safe outcome handling converts malformed or fatal packets to a HUMAN stop', () => {
  const malformed = safeValidateOutcome({ change: 'demo-change', action: 'Design', status: 'BLOCKED' });
  assert.equal(malformed.status, 'HUMAN_HANDOFF');
  assert.equal(malformed.blocker.class, 'FATAL_INVARIANT');
  const human = safeValidateOutcome({ change: 'demo-change', action: 'Design', role: 'HIGH', status: 'BLOCKED', artifacts: [], evidence: [], next: 'Design', blocker: { class: 'HUMAN_SCOPE', human_required: true, reason: 'foreign Working Set', resume_phase: null } });
  assert.equal(human.status, 'HUMAN_HANDOFF');
  assert.equal(human.blocker.human_required, true);
});

test('route fallback respects role, capability, quality, availability, and exhaustion', () => {
  const decision = resolveRoute({ role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8, candidates: [
    { id: 'quota', role: 'LOW', capabilities: ['evidence'], quality: 0.95, cost: 1, available: false },
    { id: 'fallback', role: 'LOW', capabilities: ['evidence'], quality: 0.85, cost: 2, available: true },
  ] });
  assert.equal(decision.resolved, 'fallback');
  assert.equal(decision.rejections[0].reason, 'provider-unavailable');
  assert.throws(() => resolveRoute({ role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.9, candidates: [decision.candidates?.[0] ?? { id: 'none', role: 'LOW', capabilities: ['evidence'], quality: 0.5, cost: 1, available: true }] }), /no compatible route/i);
});

test('context packets count bootstrap once and retain references without bodies', () => {
  const packet = createContextPacket({ authorityRefs: { workflow: 'docs/SDD-WORKFLOW.md' }, fingerprints: { workflow: 'a'.repeat(64) }, workingSet: ['scripts/sdd-runtime.mjs'] });
  const next = packet.forPhase('Apply 7.3 Feature Implementation');
  assert.equal(next.audit.bootstrapReadCount, 1);
  assert.equal(next.audit.normalPhaseBootstrapReadCount, 0);
  assert.deepEqual(next.audit.references, packet.audit.references);
  assert.equal(Object.hasOwn(next, 'bodies'), false);
});

test('Workload Guard treats forecast size as informational and derives no execution policy', () => {
  for (const estimatedLines of [100, 1500, 1000000]) {
    const result = evaluateWorkloadGuard({ estimatedLines, withinApprovedDesign: true, withinApprovedTasks: true, withinApprovedWorkingSet: true });
    assert.equal(result.status, 'PASS');
    assert.equal(result.human_required, false);
    assert.deepEqual(result.forecast, { estimatedLines, treatment: 'informational-only' });
    assert.equal(Object.hasOwn(result, 'partition'), false);
    assert.equal(Object.hasOwn(result, 'delivery'), false);
    assert.equal(Object.hasOwn(result, 'chainStrategy'), false);
  }
});

test('Workload Guard stops semantic scope, security, risk, and destructive exceptions', () => {
  for (const scopeKey of ['withinApprovedDesign', 'withinApprovedTasks', 'withinApprovedWorkingSet']) {
    const scope = evaluateWorkloadGuard({ estimatedLines: 1500, [scopeKey]: false });
    assert.equal(scope.status, 'HUMAN_HANDOFF');
    assert.equal(scope.blocker.class, 'HUMAN_SCOPE');
    assert.equal(scope.blocker.resume_phase, 'Design Refinement');
  }

  for (const blockerClass of ['HUMAN_SECURITY', 'HUMAN_RISK_ACCEPTANCE', 'HUMAN_GIT']) {
    const result = evaluateWorkloadGuard({
      estimatedLines: 1500,
      semanticException: { class: blockerClass, reason: `${blockerClass} requires maintainer decision`, resume_phase: null },
    });
    assert.equal(result.status, 'HUMAN_HANDOFF');
    assert.equal(result.blocker.class, blockerClass);
    assert.equal(result.blocker.human_required, true);
  }
});

test('dispatch continues through supplied legal outcomes and stops at Repository Ready', () => {
  const state = buildInitialState({ root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
  const actions = ['Design', 'Architecture Review', 'Tasks', 'Tasks Review', 'Workload Guard', 'Apply 7.1 Foundation', 'Apply 7.2 Core Engine', 'Apply 7.3 Feature Implementation', 'Apply 7.4 Integration', 'Apply 7.5 Testing', 'Apply 7.6 Apply Summary', 'Verify', 'Archive', 'Health Report', 'Repository Ready'];
  const outcomes = actions.map((action) => ({ change: 'demo-change', action, role: ['Design', 'Architecture Review', 'Verify'].includes(action) ? 'HIGH' : ['Archive', 'Health Report', 'Repository Ready'].includes(action) ? 'LOW' : 'MID', status: 'PASS', artifacts: [], evidence: [], next: action === 'Repository Ready' ? 'HUMAN_HANDOFF' : ({ Design: 'Architecture Review', 'Architecture Review': 'Tasks', Tasks: 'Tasks Review', 'Tasks Review': 'Workload Guard', 'Workload Guard': 'Apply 7.1 Foundation', 'Apply 7.1 Foundation': 'Apply 7.2 Core Engine', 'Apply 7.2 Core Engine': 'Apply 7.3 Feature Implementation', 'Apply 7.3 Feature Implementation': 'Apply 7.4 Integration', 'Apply 7.4 Integration': 'Apply 7.5 Testing', 'Apply 7.5 Testing': 'Apply 7.6 Apply Summary', 'Apply 7.6 Apply Summary': 'Verify', Verify: 'Archive', Archive: 'Health Report', 'Health Report': 'Repository Ready' }[action]) }));
  const result = dispatchUntilTerminal({ state, outcomes });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.equal(result.state.checkpoint.phase, 'Repository Ready');
});

test('legacy active changes reconstruct without generated runtime state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'crm-legacy-'));
  try {
    await import('node:fs/promises').then(({ writeFile }) => writeFile(join(directory, 'tasks-review.md'), 'phase: Tasks Review\nstatus: PASS\nnext: Workload Guard\n'));
    const recovered = await recoverLegacyChange({ changePath: directory, root: '/repo', change: 'demo-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
    assert.equal(recovered.checkpoint.next, 'Workload Guard');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('bootstrap creates the exact READY Design checkpoint for an absent change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-bootstrap-'));
  try {
    const result = await bootstrapChange({ root, change: 'new-change', fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) } });
    assert.equal(result.disposition, 'CREATED');
    assert.equal(result.state.schemaVersion, 2);
    assert.equal(result.state.status, 'READY');
    assert.equal(result.state.sequence, 0);
    assert.deepEqual(result.state.checkpoint, { phase: null, artifact: null, verdict: null, next: 'Design' });
    assert.deepEqual(JSON.parse(await readFile(join(result.changePath, '.sdd-runtime', 'state.json'), 'utf8')), result.state);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('bootstrap reuses a valid matching state and rejects existing provenance conflicts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-bootstrap-reuse-'));
  const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
  try {
    const created = await bootstrapChange({ root, change: 'reuse-change', fingerprints });
    const reused = await bootstrapChange({ root, change: 'reuse-change', fingerprints });
    assert.equal(reused.disposition, 'REUSED');
    assert.deepEqual(reused.state, created.state);

    await rm(join(root, 'openspec', 'changes', 'missing-state'), { recursive: true, force: true });
    const missingPath = join(root, 'openspec', 'changes', 'missing-state');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(missingPath, { recursive: true }));
    await assert.rejects(() => bootstrapChange({ root, change: 'missing-state', fingerprints }), /provenance/i);

    const corrupt = await bootstrapChange({ root, change: 'corrupt-state', fingerprints });
    await import('node:fs/promises').then(({ writeFile }) => writeFile(join(corrupt.changePath, '.sdd-runtime', 'state.json'), '{broken'));
    await assert.rejects(() => bootstrapChange({ root, change: 'corrupt-state', fingerprints }), /provenance/i);

    const foreign = await bootstrapChange({ root, change: 'foreign-state', fingerprints });
    await import('node:fs/promises').then(({ writeFile }) => writeFile(join(foreign.changePath, '.sdd-runtime', 'state.json'), JSON.stringify({ ...foreign.state, change: 'other-change' })));
    await assert.rejects(() => bootstrapChange({ root, change: 'foreign-state', fingerprints }), /provenance/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('HUMAN stranded recovery appends one event and materializes blocked READY Apply 7.3 without spending budget', async () => {
  const fixture = await strandedFixture();
  try {
    const before = fixture.state;
    const request = { root: fixture.root, change: fixture.change, canonicalPath: fixture.changePath, expectedSequence: before.sequence, target: STRANDED_RECOVERY_TARGET, authorityRefs: fixture.refs, fingerprints: fixture.fingerprints, authorization: { actor: 'HUMAN / MAINTAINER', approval: 'hotfix-approval' } };
    const beforeTrace = fixture.events.map((event) => canonicalJson(event));
    const result = await recoverStrandedCheckpoint(request);
    assert.equal(result.state.status, 'READY');
    assert.deepEqual(result.state.checkpoint, { phase: 'Apply 7.3 Feature Implementation', artifact: 'apply.md', verdict: 'BLOCKED', next: 'Apply 7.3 Feature Implementation' });
    assert.deepEqual(result.state.attempts, before.attempts);
    assert.equal(result.event.sequence, before.sequence + 1);
    assert.equal(result.event.operation, 'RECOVER_STRANDED_CHECKPOINT');
    assert.equal(result.event.outcomeHash === fixture.events.at(-1).outcomeHash, false);
    const trace = await readFile(result.tracePath, 'utf8');
    assert.equal(JSON.parse(trace).previousEventHash, before.traceCursor.eventHash);
    assert.equal(JSON.parse(trace).action, 'Apply 7.3 Feature Implementation');
    const traceDirectory = join(fixture.changePath, '.sdd-runtime', 'trace');
    const traceNames = await readdir(traceDirectory);
    assert.equal(traceNames.length, fixture.events.length + 1);
    const preserved = await Promise.all(fixture.events.map(async (event) => canonicalJson(JSON.parse(await readFile(join(traceDirectory, `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`), 'utf8')))));
    assert.deepEqual(preserved, beforeTrace);
    const traceEvents = await Promise.all(traceNames.map(async (name) => JSON.parse(await readFile(join(traceDirectory, name), 'utf8'))));
    assert.equal(validateTraceSequence(traceEvents).length, fixture.events.length + 1);
    await assert.rejects(() => recoverStrandedCheckpoint(request), /stale/i);
    const malformed = dispatchUntilTerminal({ state: result.state, outcomes: [{ change: fixture.change, action: STRANDED_RECOVERY_TARGET, role: 'MID', status: 'PASS', artifacts: [], evidence: { previous: true }, next: 'Apply 7.4 Integration' }] });
    assert.equal(malformed.status, 'HUMAN_HANDOFF');
    assert.equal(malformed.state.checkpoint.next, null);
    const fresh = dispatchUntilTerminal({ state: result.state, outcomes: [{ change: fixture.change, action: 'Apply 7.3 Feature Implementation', role: 'MID', status: 'PASS', artifacts: [], evidence: ['fresh'], next: 'Apply 7.4 Integration' }] });
    assert.equal(fresh.state.checkpoint.next, 'Apply 7.4 Integration');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});
