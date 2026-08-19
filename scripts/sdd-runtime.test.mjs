import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  BLOCKER_POLICIES,
  atomicWriteJson,
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
} from './sdd-runtime.mjs';

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
  assert.throws(() => dispatchUntilTerminal({ state: first.state, outcomes: [{ ...outcome, next: 'Tasks' }] }), /duplicate|idempotency|legal/i);
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
    const repeat = await persistTransition({ changePath: join(directory, 'openspec', 'changes', 'demo-change'), event, state: persistedState });
    assert.equal(repeat.duplicate, true);
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

test('workload policy proceeds only for the approved standing chain and stops on exceptions', () => {
  assert.equal(evaluateWorkloadGuard({ estimatedLines: 900, delivery: 'force-chained', chainStrategy: 'stacked-to-main', exception: false }).status, 'PASS');
  const exception = evaluateWorkloadGuard({ estimatedLines: 900, delivery: 'size-exception', chainStrategy: 'stacked-to-main', exception: true });
  assert.equal(exception.status, 'HUMAN_HANDOFF');
  assert.equal(exception.blocker.class, 'HUMAN_RISK_ACCEPTANCE');
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
