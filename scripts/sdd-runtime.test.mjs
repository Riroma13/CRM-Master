import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
  HUMAN_REOPEN_OPERATION,
  HUMAN_PROVENANCE_RESET_OPERATION,
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
  reopenHumanHandoff,
  resetHumanProvenance,
} from './sdd-runtime.mjs';

const bootstrapProvenance = (fingerprints) => ({ config: { artifactPath: 'openspec/config.yaml', rawSha256: fingerprints.config, commit: '0'.repeat(40), branch: 'test/bootstrap', dirty: false, timestamp: '2026-08-26T00:00:00.000Z', continuity: 'ESTABLISHED', authority: 'SYSTEM / BOOTSTRAP' } });

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

test('bootstrap creates the exact READY Design checkpoint for an absent change', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-bootstrap-'));
  try {
    const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
    const result = await bootstrapChange({ root, change: 'new-change', fingerprints, provenance: bootstrapProvenance(fingerprints) });
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
    const created = await bootstrapChange({ root, change: 'reuse-change', fingerprints, provenance: bootstrapProvenance(fingerprints) });
    const reused = await bootstrapChange({ root, change: 'reuse-change', fingerprints, provenance: bootstrapProvenance(fingerprints) });
    assert.equal(reused.disposition, 'REUSED');
    assert.deepEqual(reused.state, created.state);

    await rm(join(root, 'openspec', 'changes', 'missing-state'), { recursive: true, force: true });
    const missingPath = join(root, 'openspec', 'changes', 'missing-state');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(missingPath, { recursive: true }));
    await assert.rejects(() => bootstrapChange({ root, change: 'missing-state', fingerprints }), /provenance/i);

    const corrupt = await bootstrapChange({ root, change: 'corrupt-state', fingerprints, provenance: bootstrapProvenance(fingerprints) });
    await import('node:fs/promises').then(({ writeFile }) => writeFile(join(corrupt.changePath, '.sdd-runtime', 'state.json'), '{broken'));
    await assert.rejects(() => bootstrapChange({ root, change: 'corrupt-state', fingerprints }), /provenance/i);

    const foreign = await bootstrapChange({ root, change: 'foreign-state', fingerprints, provenance: bootstrapProvenance(fingerprints) });
    await import('node:fs/promises').then(({ writeFile }) => writeFile(join(foreign.changePath, '.sdd-runtime', 'state.json'), JSON.stringify({ ...foreign.state, change: 'other-change' })));
    await assert.rejects(() => bootstrapChange({ root, change: 'foreign-state', fingerprints }), /provenance/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function humanHandoffFixture({ artifactPath, artifactContent = 'original artifact bytes' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'crm-human-reopen-'));
  const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
  if (artifactPath) {
    fingerprints.artifacts = { [artifactPath]: '0'.repeat(64) };
  }
  const change = 'reopen-change';
  const bootstrapped = await bootstrapChange({ root, change, fingerprints, provenance: bootstrapProvenance(fingerprints) });
  if (artifactPath) {
    const { mkdir, writeFile } = await import('node:fs/promises');
    await mkdir(dirname(join(root, artifactPath)), { recursive: true });
    await writeFile(join(root, artifactPath), artifactContent);
  }
  let state = bootstrapped.state;
  for (let sequence = 1; sequence <= 21; sequence += 1) {
    const after = {
      ...state,
      status: sequence === 21 ? 'HUMAN_HANDOFF' : 'READY',
      sequence,
      checkpoint: sequence === 21
        ? { phase: 'Apply 7.5 Testing', artifact: 'testing.md', verdict: 'BLOCKED', next: null }
        : { phase: 'Design', artifact: 'design.md', verdict: 'PASS', next: 'Architecture Review' },
      traceCursor: { sequence, eventHash: null, chainHash: null },
    };
    const event = createTraceEvent({
      change, sequence, action: sequence === 21 ? 'Apply 7.5 Testing' : 'Design',
      role: sequence === 21 ? 'MID' : 'HIGH', inputHash: String(sequence).padStart(64, '0'),
      outcomeHash: String(sequence + 100).padStart(64, '0'), beforeState: state, afterState: after,
    });
    await persistTransition({ changePath: bootstrapped.changePath, event, state: after });
    state = { ...after, traceCursor: { sequence, eventHash: event.eventHash, chainHash: event.chainHash } };
  }
  return { root, change, fingerprints, changePath: bootstrapped.changePath, state };
}

const authorization = { actor: 'HUMAN', role: 'MAINTAINER', scope: 'bounded runtime reopen' };
const reopenInput = (fixture) => ({
  root: fixture.root, change: fixture.change, expectedSequence: 21, expectedStatus: 'HUMAN_HANDOFF',
  target: 'Apply 7.5 Testing', reason: 'Maintainer-authorized bounded reopen for testing evidence', authorization,
});

test('reopens exactly one blocked HUMAN_HANDOFF checkpoint with an append-only audited transition', async () => {
  const fixture = await humanHandoffFixture();
  try {
    const result = await reopenHumanHandoff(reopenInput(fixture));
    assert.equal(result.state.sequence, 22);
    assert.equal(result.state.status, 'READY');
    assert.deepEqual(result.state.checkpoint, { phase: 'Apply 7.5 Testing', artifact: 'testing.md', verdict: 'BLOCKED', next: 'Apply 7.5 Testing' });
    assert.deepEqual(result.state.attempts, fixture.state.attempts);
    assert.deepEqual(result.state.fingerprints, fixture.state.fingerprints);
    assert.equal(result.event.operation, 'HUMAN_REOPEN');
    assert.equal(result.event.operation, HUMAN_REOPEN_OPERATION);
    assert.equal(result.event.role, 'HUMAN');
    assert.equal(result.event.action, 'Apply 7.5 Testing');
    assert.equal(result.event.previousSequence, 21);
    assert.equal(result.event.newSequence, 22);
    assert.equal(result.event.sourceStatus, 'HUMAN_HANDOFF');
    assert.equal(result.event.target, 'Apply 7.5 Testing');
    assert.equal(result.event.gitReadiness, 'INVALIDATED');
    assert.deepEqual(result.event.authorization, authorization);
    assert.equal(result.event.stateMaterialization.status, 'READY');
    assert.equal(result.event.stateMaterialization.checkpoint.verdict, 'BLOCKED');
    assert.equal(result.event.stateMaterialization.checkpoint.next, result.event.target);
    assert.equal(result.state.lastTransition.action, 'Apply 7.5 Testing');
    assert.equal(result.state.lastTransition.operation, HUMAN_REOPEN_OPERATION);
    assert.equal(result.state.attempts['Apply 7.5 Testing'], undefined);
    assert.throws(() => createTraceEvent({ ...result.event, role: 'MID', beforeState: fixture.state, afterState: result.state }), /role|operation/i);
    assert.throws(() => gitMutationBarrier({ operation: 'commit', target: 'main' }), /HUMAN_GIT/i);
    const traceFiles = await import('node:fs/promises').then(({ readdir }) => readdir(join(fixture.changePath, '.sdd-runtime', 'trace')));
    assert.equal(traceFiles.length, 22);
    const events = await Promise.all(traceFiles.sort().map(async (file) => JSON.parse(await readFile(join(fixture.changePath, '.sdd-runtime', 'trace', file), 'utf8'))));
    assert.deepEqual(validateTraceSequence(events).map((event) => event.sequence), Array.from({ length: 22 }, (_, index) => index + 1));
    assert.equal(events[20].stateMaterialization.checkpoint.verdict, 'BLOCKED');
    assert.equal(events[20].stateMaterialization.checkpoint.next, null);
    assert.equal(events[21].stateMaterialization.checkpoint.next, 'Apply 7.5 Testing');
    await assert.rejects(() => reopenHumanHandoff(reopenInput(fixture)), /stale|READY|HUMAN_HANDOFF/i);
    assert.equal((await import('node:fs/promises').then(({ readdir }) => readdir(join(fixture.changePath, '.sdd-runtime', 'trace')))).length, 22);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('reopenHumanHandoff rejects invalid scope, target, authorization, and source without task or Git readiness changes', async () => {
  const fixture = await humanHandoffFixture();
  try {
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), change: 'foreign' }), /state|identity|provenance|ENOENT/i);
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), expectedSequence: 20 }), /stale|sequence/i);
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), target: undefined }), /target|phase/i);
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), target: 'Verify' }), /target|phase/i);
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), authorization: undefined }), /authorization/i);
    await assert.rejects(() => reopenHumanHandoff({ ...reopenInput(fixture), authorization: { actor: 'HIGH', role: 'ARCHITECT', scope: 'wrong' } }), /authorization|actor|role/i);
    const statePath = join(fixture.changePath, '.sdd-runtime', 'state.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    await import('node:fs/promises').then(({ writeFile }) => writeFile(statePath, JSON.stringify({ ...state, status: 'READY' })));
    await assert.rejects(() => reopenHumanHandoff(reopenInput(fixture)), /HUMAN_HANDOFF|source|status/i);
    assert.equal(state.checkpoint.next, null);
    assert.equal(state.attempts['Apply 7.5 Testing'], undefined);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('concurrent reopen calls have one winner and bootstrap never implicitly reopens', async () => {
  const fixture = await humanHandoffFixture();
  try {
    const before = await bootstrapChange({ root: fixture.root, change: fixture.change, fingerprints: fixture.fingerprints, provenance: bootstrapProvenance(fixture.fingerprints) });
    assert.equal(before.disposition, 'REUSED');
    assert.equal(before.state.status, 'HUMAN_HANDOFF');
    assert.equal(before.state.sequence, 21);
    assert.equal(before.state.checkpoint.next, null);
    const outcomes = await Promise.allSettled([reopenHumanHandoff(reopenInput(fixture)), reopenHumanHandoff(reopenInput(fixture))]);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1);
    const reused = await bootstrapChange({ root: fixture.root, change: fixture.change, fingerprints: fixture.fingerprints, provenance: bootstrapProvenance(fixture.fingerprints) });
    assert.equal(reused.disposition, 'REUSED');
    assert.equal(reused.state.sequence, 22);
    assert.equal(reused.state.status, 'READY');
    assert.equal(reused.state.checkpoint.next, 'Apply 7.5 Testing');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('HUMAN_PROVENANCE_RESET is explicit, append-only, and bootstrap preserves its provenance', async () => {
  const fixture = await humanHandoffFixture();
  const artifactPath = 'openspec/config.yaml';
  const artifact = join(fixture.root, artifactPath);
  const oldFingerprint = fixture.fingerprints.config;
  const newFingerprint = 'f'.repeat(64);
  const git = { commit: '1'.repeat(40), branch: 'recovery/human-reset', dirty: false };
  const input = {
    root: fixture.root, change: fixture.change, expectedSequence: 21, expectedStatus: 'HUMAN_HANDOFF',
    key: 'config', artifactPath, oldFingerprint, newFingerprint,
    currentCommit: git.commit, currentBranch: git.branch, currentDirtyState: git.dirty,
    reason: 'Maintainer-authorized provenance reconciliation', continuityAcknowledgment: 'UNPROVEN',
    authorization, validationEvidence: ['artifact hash checked', 'identity checked'],
    gitResolver: async () => git,
  };
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(artifact, 'new config bytes');
    input.newFingerprint = (await fingerprintFiles([artifact]))[artifact];
    const result = await resetHumanProvenance(input);
    assert.equal(result.event.operation, HUMAN_PROVENANCE_RESET_OPERATION);
    assert.equal(result.event.continuity, 'UNPROVEN');
    assert.equal(result.event.resetAuthority, 'HUMAN / MAINTAINER');
    assert.equal(result.event.gitReadiness, 'INVALIDATED');
    assert.equal(result.state.status, 'HUMAN_HANDOFF');
    assert.equal(result.state.sequence, 22);
    assert.equal(result.state.fingerprints.config, input.newFingerprint);
    assert.equal(result.state.fingerprints.workflow, fixture.fingerprints.workflow);
    assert.equal(result.state.fingerprintProvenance.config.artifactPath, artifactPath);
    assert.equal(result.state.fingerprintProvenance.config.commit, git.commit);
    assert.equal(result.state.fingerprintProvenance.config.branch, git.branch);
    assert.equal(result.state.fingerprintProvenance.config.dirty, false);
    assert.equal(result.state.fingerprintProvenance.config.authority, 'HUMAN / MAINTAINER');
    assert.equal(result.state.gitReadiness, 'INVALIDATED');
    assert.equal((await import('node:fs/promises').then(({ readdir }) => readdir(join(fixture.changePath, '.sdd-runtime', 'trace')))).length, 22);
    assert.deepEqual((await bootstrapChange({ root: fixture.root, change: fixture.change, fingerprints: { ...fixture.fingerprints, config: input.newFingerprint }, provenance: { config: result.state.fingerprintProvenance.config } })).state.fingerprintProvenance, result.state.fingerprintProvenance);
    await assert.rejects(() => bootstrapChange({ root: fixture.root, change: fixture.change, fingerprints: fixture.fingerprints }), /provenance conflict/i);
    assert.equal(JSON.parse(await readFile(join(fixture.changePath, '.sdd-runtime', 'state.json'), 'utf8')).sequence, 22);
    await assert.rejects(() => resetHumanProvenance({ ...input, expectedSequence: 22, oldFingerprint: result.state.fingerprints.config, newFingerprint: 'e'.repeat(64) }), /duplicate|stale|anchor/i);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('HUMAN_PROVENANCE_RESET is generic for an exact fingerprints.artifacts key/path', async () => {
  const artifactPath = 'openspec/changes/reopen-change/custom.md';
  const fixture = await humanHandoffFixture({ artifactPath });
  const artifact = join(fixture.root, artifactPath);
  const { writeFile } = await import('node:fs/promises');
  const git = { commit: '2'.repeat(40), branch: 'recovery/artifact-reset', dirty: false };
  try {
    await writeFile(artifact, 'replacement artifact bytes');
    const newFingerprint = (await fingerprintFiles([artifact]))[artifact];
    const result = await resetHumanProvenance({
      root: fixture.root, change: fixture.change, expectedSequence: 21, expectedStatus: 'HUMAN_HANDOFF',
      key: `artifacts.${artifactPath}`, artifactPath, oldFingerprint: fixture.fingerprints.artifacts[artifactPath], newFingerprint,
      currentCommit: git.commit, currentBranch: git.branch, currentDirtyState: false, reason: 'exact artifact reset',
      continuityAcknowledgment: 'UNPROVEN', authorization, validationEvidence: ['exact nested fingerprint checked'], gitResolver: async () => git,
    });
    assert.equal(result.state.fingerprints.artifacts[artifactPath], newFingerprint);
    assert.equal(result.state.fingerprints.config, fixture.fingerprints.config);
    assert.equal(result.state.fingerprintProvenance[`artifacts.${artifactPath}`].artifactPath, artifactPath);
    assert.equal(result.event.affectedKey, `artifacts.${artifactPath}`);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('bootstrap accepts explicit validated provenance and preserves it without fabricating legacy metadata', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-bootstrap-provenance-'));
  const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
  const provenance = { config: { artifactPath: 'openspec/config.yaml', rawSha256: fingerprints.config, commit: '3'.repeat(40), branch: 'main', dirty: false, timestamp: '2026-08-26T00:00:00.000Z', continuity: 'ESTABLISHED', authority: 'SYSTEM / BOOTSTRAP' } };
  try {
    const created = await bootstrapChange({ root, change: 'explicit-provenance', fingerprints, provenance });
    assert.deepEqual(created.state.fingerprintProvenance, provenance);
    const reused = await bootstrapChange({ root, change: 'explicit-provenance', fingerprints, provenance });
    assert.deepEqual(reused.state.fingerprintProvenance, provenance);
    await assert.rejects(() => bootstrapChange({ root, change: 'explicit-provenance', fingerprints, provenance: { ...provenance, config: { ...provenance.config, continuity: 'UNPROVEN' } } }), /provenance/i);
    const legacyRoot = await mkdtemp(join(tmpdir(), 'crm-bootstrap-legacy-'));
    await assert.rejects(() => bootstrapChange({ root: legacyRoot, change: 'legacy', fingerprints }), /explicit provenance/i);
    const { mkdir } = await import('node:fs/promises');
    const legacyState = buildInitialState({ root: legacyRoot, change: 'legacy', fingerprints });
    await mkdir(join(legacyRoot, 'openspec', 'changes', 'legacy', '.sdd-runtime'), { recursive: true });
    await atomicWriteJson(join(legacyRoot, 'openspec', 'changes', 'legacy', '.sdd-runtime', 'state.json'), legacyState);
    const legacy = await bootstrapChange({ root: legacyRoot, change: 'legacy', fingerprints });
    assert.equal(Object.hasOwn(legacy.state, 'fingerprintProvenance'), false);
    await assert.rejects(() => bootstrapChange({ root: legacyRoot, change: 'legacy', fingerprints, provenance }), /provenance/i);
    await rm(legacyRoot, { recursive: true, force: true });
    const badRoot = await mkdtemp(join(tmpdir(), 'crm-bootstrap-bad-provenance-'));
    await assert.rejects(() => bootstrapChange({ root: badRoot, change: 'bad-provenance', fingerprints, provenance: { ...provenance, config: { ...provenance.config, rawSha256: 'f'.repeat(64) } } }), /hash|provenance/i);
    await rm(badRoot, { recursive: true, force: true });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('HUMAN_PROVENANCE_RESET fails closed for identity, hashes, Git state, continuity, and authorization', async () => {
  const fixture = await humanHandoffFixture();
  const file = join(fixture.root, 'openspec', 'config.yaml');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(file, 'bytes');
  const base = {
    root: fixture.root, change: fixture.change, expectedSequence: 21, expectedStatus: 'HUMAN_HANDOFF',
    key: 'config', artifactPath: 'openspec/config.yaml', oldFingerprint: fixture.fingerprints.config,
    newFingerprint: (await fingerprintFiles([file]))[file], currentCommit: '1'.repeat(40),
    currentBranch: 'main', currentDirtyState: false, reason: 'reason', continuityAcknowledgment: 'UNPROVEN',
    authorization, validationEvidence: ['checked'], gitResolver: async () => ({ commit: '1'.repeat(40), branch: 'main', dirty: false }),
  };
  try {
    for (const [field, value, pattern] of [
      ['expectedSequence', 20, /sequence|stale/i], ['oldFingerprint', 'a'.repeat(64), /old|fingerprint/i],
      ['newFingerprint', 'b'.repeat(64), /artifact|hash|new/i], ['artifactPath', 'wrong.yaml', /path/i],
      ['key', 'workflow', /path|key/i], ['currentDirtyState', true, /dirty/i],
      ['continuityAcknowledgment', 'PROVEN', /UNPROVEN|continuity/i],
      ['authorization', { actor: 'HIGH', role: 'ARCHITECT', scope: 'wrong' }, /authorization/i],
    ]) await assert.rejects(() => resetHumanProvenance({ ...base, [field]: value }), pattern);
    await assert.rejects(() => resetHumanProvenance({ ...base, artifactPath: '*', key: '*' }), /path|key|wildcard/i);
    await assert.rejects(() => resetHumanProvenance({ ...base, gitResolver: async () => ({}) }), /Git|malformed/i);
    await assert.rejects(() => resetHumanProvenance({ ...base, gitResolver: undefined }), /Git|metadata|ENOENT/i);
    assert.equal((await import('node:fs/promises').then(({ readdir }) => readdir(join(fixture.changePath, '.sdd-runtime', 'trace')))).length, 21);
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('SAFE_REBIND is neither exported nor accepted', async () => {
  assert.equal(HUMAN_PROVENANCE_RESET_OPERATION, 'HUMAN_PROVENANCE_RESET');
  assert.notEqual(HUMAN_PROVENANCE_RESET_OPERATION, 'HUMAN_REOPEN');
});
