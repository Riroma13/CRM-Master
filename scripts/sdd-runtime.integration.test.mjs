import assert from 'node:assert/strict';
import { lstat, mkdir, readFile, readdir, rm, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  bootstrapChange,
  archiveDestinationPath,
  buildInitialState,
  canonicalCheckpointArtifact,
  createContextPacket,
  createTraceEvent,
  dispatchUntilTerminal,
  gitMutationBarrier,
  persistTransition,
  reconcileTraceState,
  resolveRoute,
  resolveConfiguredRoute,
  recoverStrandedCheckpoint,
  recoverDispatchMaterialization,
  hashObject,
  persistExecutorOutcome,
  STRANDED_RECOVERY_TARGET,
  validateOutcomePacket,
} from './sdd-runtime.mjs';

const hashes = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
const outcomeFor = (change, action, overrides = {}) => {
  const checkpointArtifact = canonicalCheckpointArtifact(action);
  return {
    change,
    action,
    role: ['Design', 'Architecture Review', 'Design Refinement', 'Verify'].includes(action) ? 'HIGH' : ['Archive', 'Health Report', 'Repository Ready'].includes(action) ? 'LOW' : 'MID',
    status: 'PASS',
    checkpointArtifact,
    artifacts: [checkpointArtifact],
    evidence: [],
    next: { Design: 'Architecture Review', 'Architecture Review': 'Tasks', 'Apply 7.3 Feature Implementation': 'Apply 7.4 Integration', 'Apply 7.5 Testing': 'Apply 7.6 Apply Summary' }[action] ?? 'HUMAN_HANDOFF',
    ...overrides,
  };
};

const verifyStateFor = (change = 'verify-gate-semantics') => ({
  ...buildInitialState({ root: '/repo', change, fingerprints: hashes }),
  sequence: 16,
  checkpoint: { phase: 'Apply 7.6 Apply Summary', artifact: 'apply-7.6-apply-summary.md', verdict: 'PASS', next: 'Verify' },
  traceCursor: { sequence: 16, eventHash: 'd'.repeat(64), chainHash: 'e'.repeat(64) },
  lastTransition: { inputHash: 'f'.repeat(64), outcomeHash: 'a'.repeat(64), afterStateHash: 'b'.repeat(64) },
});

test('PASS after two environment retries persists the next Apply action without changing history or attempts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-pass-after-retries-'));
  const change = 'pass-after-retries';
  const changePath = join(root, 'openspec', 'changes', change);
  const action = 'Apply 7.3 Feature Implementation';
  const before = {
    ...buildInitialState({ root, change, fingerprints: hashes }),
    checkpoint: { phase: action, artifact: 'apply-7.3-feature-implementation.md', verdict: 'BLOCKED', next: action },
    attempts: { [action]: 2 },
  };
  const pass = outcomeFor(change, action, { evidence: ['accepted fresh PASS'] });

  try {
    const result = dispatchUntilTerminal({ state: before, outcomes: [pass] });
    const after = result.state;
    assert.equal(result.status, 'READY');
    assert.equal(after.checkpoint.next, 'Apply 7.4 Integration');
    assert.equal(after.checkpoint.verdict, 'PASS');
    assert.deepEqual(after.attempts, before.attempts);

    const event = createTraceEvent({
      change,
      sequence: after.sequence,
      action,
      role: 'MID',
      inputHash: after.lastTransition.inputHash,
      outcomeHash: after.lastTransition.outcomeHash,
      beforeState: before,
      afterState: after,
      route: { configured: 'MID', resolved: 'sdd-direct-apply', rejections: [] },
      contextAudit: { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' } },
    });
    const persisted = await persistTransition({ changePath, event, state: after });
    const stored = JSON.parse(await readFile(persisted.tracePath, 'utf8'));
    const traceDirectory = join(changePath, '.sdd-runtime', 'trace');
    const reconciled = reconcileTraceState(before, [stored]);

    assert.equal(persisted.duplicate, false);
    assert.equal(stored.operation, undefined);
    assert.equal(stored.previousEventHash, null);
    assert.equal(stored.sequence, 1);
    assert.equal(reconciled.state.checkpoint.next, 'Apply 7.4 Integration');
    assert.deepEqual(reconciled.state.attempts, before.attempts);
    assert.deepEqual(await readdir(traceDirectory), [`${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'crm-stranded-integration-')); const change = 'integration-stranded';
  const changePath = join(root, 'openspec', 'changes', change); const refs = { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' };
  await Promise.all([mkdir(join(root, 'docs'), { recursive: true }), mkdir(join(root, '.opencode'), { recursive: true }), mkdir(join(root, 'openspec'), { recursive: true })]);
  for (const [key, file] of Object.entries(refs)) await writeFile(join(root, file), key);
  const fingerprints = { workflow: hashObject(await readFile(join(root, refs.workflow))), modelMap: hashObject(await readFile(join(root, refs.modelMap))), config: hashObject(await readFile(join(root, refs.config))), artifacts: {} };
  let state = buildInitialState({ root, change, fingerprints });
  const actions = ['Design', 'Architecture Review', 'Tasks', 'Tasks Review', 'Workload Guard', 'Apply 7.1 Foundation', 'Apply 7.2 Core Engine'];
  for (const action of actions) {
    const after = { ...state, sequence: state.sequence + 1, checkpoint: { phase: action, artifact: null, verdict: 'PASS', next: action === actions.at(-1) ? 'Apply 7.3 Feature Implementation' : ({ Design: 'Architecture Review', 'Architecture Review': 'Tasks', Tasks: 'Tasks Review', 'Tasks Review': 'Workload Guard', 'Workload Guard': 'Apply 7.1 Foundation', 'Apply 7.1 Foundation': 'Apply 7.2 Core Engine' }[action]) }, traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), afterStateHash: hashObject({ action }) } };
    const event = createTraceEvent({ change, sequence: after.sequence, action, role: action === 'Design' || action === 'Architecture Review' ? 'HIGH' : 'MID', inputHash: 'd'.repeat(64), outcomeHash: 'e'.repeat(64), beforeState: state, afterState: after });
    await persistTransition({ changePath, event, state: after }); state = { ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } };
  }
  const after = { ...state, status: 'HUMAN_HANDOFF', sequence: state.sequence + 1, checkpoint: { phase: 'Apply 7.3 Feature Implementation', artifact: null, verdict: 'BLOCKED', next: null }, traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { inputHash: 'f'.repeat(64), outcomeHash: 'a'.repeat(64), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } };
  const event = createTraceEvent({ change, sequence: after.sequence, action: 'Apply 7.3 Feature Implementation', role: 'MID', inputHash: after.lastTransition.inputHash, outcomeHash: after.lastTransition.outcomeHash, beforeState: state, afterState: after });
  await persistTransition({ changePath, event, state: after }); return { root, change, changePath, state: { ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } }, fingerprints, refs };
}

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

test('Design executor outcomes are materialized event-first before the next dispatch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-design-materialization-'));
  const change = 'design-materialization';
  const fingerprints = { ...hashes, artifacts: {} };
  try {
    const bootstrapped = await bootstrapChange({ root, change, fingerprints });
    const designPath = join(bootstrapped.changePath, 'design.md');
    await writeFile(designPath, '# Design\n');
    const outcome = {
      change,
      action: 'Design',
      role: 'HIGH',
      status: 'PASS',
      checkpointArtifact: 'design.md',
      artifacts: ['design.md', 'auxiliary Working Set evidence'],
      evidence: ['design pre-gate passed'],
      next: 'Architecture Review',
    };

    const result = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: bootstrapped.state,
      outcome,
      route: { configured: 'HIGH', resolved: 'sdd-direct-design', rejections: [] },
      contextAudit: {
        bootstrapReadCount: 1,
        normalPhaseBootstrapReadCount: 0,
        references: { workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' },
      },
    });

    assert.equal(result.persisted, true);
    assert.equal(result.event.action, 'Design');
    assert.equal(result.event.sequence, 1);
    assert.equal(result.state.checkpoint.artifact, 'design.md');
    assert.equal(result.state.checkpoint.next, 'Architecture Review');
    assert.equal(result.state.traceCursor.eventHash, result.event.eventHash);
    assert.deepEqual(JSON.parse(await readFile(join(bootstrapped.changePath, '.sdd-runtime', 'state.json'))), result.state);
    assert.deepEqual(await readdir(join(bootstrapped.changePath, '.sdd-runtime', 'trace')), [
      `${String(result.event.sequence).padStart(20, '0')}-${result.event.eventHash}.json`,
    ]);

    const duplicate = await persistExecutorOutcome({ changePath: bootstrapped.changePath, state: result.state, outcome });
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.persisted, false);
    assert.equal(duplicate.event, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the forwarding command leaves one owner to materialize an Apply 7.1 outcome exactly once', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-apply-single-owner-'));
  const change = 'apply-single-owner';
  try {
    const command = await readFile(new URL('../.opencode/commands/sdd-direct.md', import.meta.url), 'utf8');
    const orchestrator = await readFile(new URL('../.opencode/agents/sdd-direct-orchestrator.md', import.meta.url), 'utf8');
    const archiveAgent = await readFile(new URL('../.opencode/agents/sdd-direct-archive.md', import.meta.url), 'utf8');
    assert.match(command, /entry adapter only[\s\S]*never dispatches an executor, materializes an\s+executor outcome, or writes change-local runtime state itself/i);
    assert.doesNotMatch(command, /persistExecutorOutcome/);
    assert.match(orchestrator, /orchestrator is the sole persistence owner/i);
    assert.match(orchestrator, /Once it accepts an outcome, discard that outcome[\s\S]*never re-submit it or its action from a stale\s+checkpoint/i);
    assert.match(archiveAgent, /active change directory is the canonical source[\s\S]*do not move, rename, copy, or delete the directory/i);
    assert.match(archiveAgent, /do not move, rename, copy, or delete the directory/i);
    assert.match(orchestrator, /runtime's\s+`persistExecutorOutcome` persists the Archive event\/state first/i);

    const bootstrapped = await bootstrapChange({ root, change, fingerprints: { ...hashes, artifacts: {} } });
    const checkpoint = 'apply-7.1-foundation.md';
    await writeFile(join(bootstrapped.changePath, checkpoint), '# Apply 7.1 Foundation\n');
    const before = {
      ...bootstrapped.state,
      checkpoint: { phase: 'Workload Guard', artifact: 'workload-guard.md', verdict: 'PASS', next: 'Apply 7.1 Foundation' },
    };
    const result = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: before,
      outcome: outcomeFor(change, 'Apply 7.1 Foundation', { next: 'Apply 7.2 Core Engine' }),
      route: { configured: 'MID', resolved: 'sdd-direct-apply', rejections: [] },
    });

    assert.equal(result.persisted, true);
    assert.equal(result.state.sequence, 1);
    assert.equal(result.state.checkpoint.next, 'Apply 7.2 Core Engine');

    const nextCheckpoint = 'apply-7.2-core-engine.md';
    await writeFile(join(bootstrapped.changePath, nextCheckpoint), '# Apply 7.2 Core Engine\n');
    const next = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: result.state,
      outcome: outcomeFor(change, 'Apply 7.2 Core Engine', {
        next: 'Apply 7.3 Feature Implementation',
        checkpointArtifact: nextCheckpoint,
        artifacts: [nextCheckpoint],
      }),
      route: { configured: 'MID', resolved: 'sdd-direct-apply', rejections: [] },
    });

    assert.equal(next.persisted, true);
    assert.equal(next.event.action, 'Apply 7.2 Core Engine');
    assert.equal(next.state.sequence, 2);
    assert.deepEqual(await readdir(join(bootstrapped.changePath, '.sdd-runtime', 'trace')), [
      `${String(1).padStart(20, '0')}-${result.event.eventHash}.json`,
      `${String(2).padStart(20, '0')}-${next.event.eventHash}.json`,
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Design evidence blockers use canonical retry or HUMAN handoff policies and reject unknown classes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-design-needs-evidence-'));
  const change = 'design-needs-evidence';
  try {
    const designAgent = await readFile(new URL('../.opencode/agents/sdd-direct-design.md', import.meta.url), 'utf8');
    assert.match(designAgent, /`NEEDS_EVIDENCE` is a workflow result\/evidence condition, never a\s+`blocker\.class`/);
    assert.match(designAgent, /exhaust the approved Working Set,\s+Read Order, current repository, or one canonical bounded evidence request/i);
    assert.match(designAgent, /class: AUTO_RETRY[\s\S]*human_required: false[\s\S]*resume_phase: Design[\s\S]*next: Design/);
    assert.match(designAgent, /class: HUMAN_SCOPE/);

    const bootstrapped = await bootstrapChange({ root, change, fingerprints: hashes });
    await writeFile(join(bootstrapped.changePath, 'design.md'), '# Design\n');
    const retry = outcomeFor(change, 'Design', {
      status: 'BLOCKED',
      evidence: ['NEEDS_EVIDENCE: bounded Design input is available through the approved Read Order'],
      next: 'Design',
      blocker: { class: 'AUTO_RETRY', human_required: false, reason: 'Read the deterministic bounded Design input', resume_phase: 'Design' },
    });

    await assert.rejects(
      () => persistExecutorOutcome({ changePath: bootstrapped.changePath, state: bootstrapped.state, outcome: { ...retry, blocker: { ...retry.blocker, class: 'NEEDS_EVIDENCE' } } }),
      /unknown blocker class/i,
    );

    const retried = await persistExecutorOutcome({ changePath: bootstrapped.changePath, state: bootstrapped.state, outcome: retry });
    assert.equal(retried.status, 'READY');
    assert.equal(retried.state.checkpoint.verdict, 'BLOCKED');
    assert.equal(retried.state.checkpoint.next, 'Design');
    assert.equal(retried.state.status, 'READY');

    const humanChange = 'design-human-owned-evidence';
    const humanBootstrapped = await bootstrapChange({ root, change: humanChange, fingerprints: hashes });
    await writeFile(join(humanBootstrapped.changePath, 'design.md'), '# Design\n');
    const humanOwned = outcomeFor(humanChange, 'Design', {
      status: 'BLOCKED',
      evidence: ['NEEDS_EVIDENCE: maintainer-owned scope decision remains unavailable after the bounded request'],
      next: 'Design',
      blocker: { class: 'HUMAN_SCOPE', human_required: true, reason: 'Maintainer must decide the requested material scope expansion', resume_phase: null },
    });
    const handedOff = await persistExecutorOutcome({ changePath: humanBootstrapped.changePath, state: humanBootstrapped.state, outcome: humanOwned });
    assert.equal(handedOff.status, 'HUMAN_HANDOFF');
    assert.equal(handedOff.blocker.class, 'HUMAN_SCOPE');

    await assert.rejects(
      () => persistExecutorOutcome({ changePath: bootstrapped.changePath, state: bootstrapped.state, outcome: { ...retry, blocker: { ...retry.blocker, class: 'UNRELATED_UNKNOWN' } } }),
      /unknown blocker class/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Verify required-gate semantics fail closed without converting deterministic classification into a HUMAN prompt', async () => {
  const verifyAgent = await readFile(new URL('../.opencode/agents/sdd-direct-verify.md', import.meta.url), 'utf8');
  const applyAgent = await readFile(new URL('../.opencode/agents/sdd-direct-apply.md', import.meta.url), 'utf8');
  const workflow = await readFile(new URL('../docs/SDD-WORKFLOW.md', import.meta.url), 'utf8');

  assert.match(verifyAgent, /Required-Gate Ledger/i);
  assert.match(verifyAgent, /Verify may return/i);
  assert.match(verifyAgent, /PASS.*only when every required gate/i);
  assert.match(verifyAgent, /actually executed/i);
  assert.match(verifyAgent, /credible passing evidence/i);
  assert.match(verifyAgent, /FAIL[\s\S]*CANCELLED[\s\S]*SKIPPED[\s\S]*NOT_EXECUTED[\s\S]*BLOCKED/i);
  assert.match(verifyAgent, /gate failure must not be relabeled.*BASELINE_DEBT/i);
  assert.match(verifyAgent, /gate failure must not be relabeled.*CONDITION/i);
  assert.match(verifyAgent, /CONDITION[\s\S]*outside repository[\s\S]*not required/i);
  assert.match(verifyAgent, /class: AUTO_RETRY[\s\S]*human_required: false[\s\S]*resume_phase: Verify[\s\S]*next: Verify/i);
  assert.match(applyAgent, /required gate[\s\S]*must not be relabeled[\s\S]*BASELINE_DEBT[\s\S]*CONDITION/i);
  assert.match(workflow, /Verify required-gate semantics[\s\S]*required gate[\s\S]*PASS/i);

  const change = 'verify-gate-semantics';
  const requiredPass = outcomeFor(change, 'Verify', {
    evidence: ['REQUIRED_GATE production images | execution=PASS | evidence=api-and-tenant-build-logs'],
    next: 'Archive',
  });
  const passResult = dispatchUntilTerminal({ state: verifyStateFor(change), outcomes: [requiredPass] });
  assert.equal(passResult.status, 'READY');
  assert.equal(passResult.state.checkpoint.verdict, 'PASS');
  assert.equal(passResult.state.checkpoint.next, 'Archive');
  validateOutcomePacket(requiredPass);

  const requiredFailures = [
    ['production image build failure labelled BASELINE_DEBT', 'REQUIRED_GATE tenant-web production image | execution=FAIL | classification=BASELINE_DEBT'],
    ['cancelled required gate', 'REQUIRED_GATE api production image | execution=CANCELLED'],
    ['not executed required gate', 'REQUIRED_GATE docker compose production config | execution=NOT_EXECUTED'],
    ['required gate failure labelled CONDITION', 'REQUIRED_GATE tenant isolation | execution=FAIL | classification=CONDITION'],
    ['required security gate failure', 'REQUIRED_GATE tenant isolation security test | execution=FAIL'],
  ];
  for (const [name, evidence] of requiredFailures) {
    const blocked = outcomeFor(change, 'Verify', {
      status: 'BLOCKED',
      evidence: [evidence],
      next: 'Verify',
      blocker: { class: 'AUTO_RETRY', human_required: false, reason: `${name} must be corrected before Verify can pass`, resume_phase: 'Verify' },
    });
    const result = dispatchUntilTerminal({ state: verifyStateFor(change), outcomes: [blocked] });
    assert.equal(result.status, 'READY', name);
    assert.equal(result.state.status, 'READY', name);
    assert.equal(result.state.checkpoint.verdict, 'BLOCKED', name);
    assert.equal(result.state.checkpoint.next, 'Verify', name);
    assert.notEqual(result.status, 'HUMAN_HANDOFF', name);
  }

  const unrelatedBaseline = outcomeFor(change, 'Verify', {
    evidence: ['BASELINE_DEBT unrelated pre-existing lint warning outside the Working Set'],
    next: 'Archive',
  });
  assert.equal(dispatchUntilTerminal({ state: verifyStateFor(change), outcomes: [unrelatedBaseline] }).state.checkpoint.next, 'Archive');

  const allowedExternalCondition = outcomeFor(change, 'Verify', {
    evidence: ['CONDITION external wildcard DNS provisioning is explicitly outside repository scope and not an acceptance gate'],
    next: 'Archive',
  });
  assert.equal(dispatchUntilTerminal({ state: verifyStateFor(change), outcomes: [allowedExternalCondition] }).state.checkpoint.next, 'Archive');

  const malformedCheckpoint = outcomeFor(change, 'Verify', {
    checkpointArtifact: 'apply-7.6-apply-summary.md',
    artifacts: ['apply-7.6-apply-summary.md'],
    next: 'Archive',
  });
  assert.throws(() => validateOutcomePacket(malformedCheckpoint), /invalid checkpoint artifact or outcome shape/i);
});

test('Apply 7.1 producers use the canonical checkpoint basename and reject path-qualified entries', async () => {
  const applyAgent = await readFile(new URL('../.opencode/agents/sdd-direct-apply.md', import.meta.url), 'utf8');
  assert.match(applyAgent, /exact canonical checkpoint basename for both `checkpointArtifact` and its\s+matching `artifacts` entry/i);
  assert.match(applyAgent, /never emit a full\/path-qualified checkpoint reference/i);

  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-apply-checkpoint-contract-'));
  const change = 'apply-checkpoint-contract';
  try {
    const bootstrapped = await bootstrapChange({ root, change, fingerprints: hashes });
    const checkpoint = 'apply-7.1-foundation.md';
    await writeFile(join(bootstrapped.changePath, checkpoint), '# Apply 7.1 Foundation\n');
    const foundationState = {
      ...bootstrapped.state,
      sequence: 1,
      checkpoint: { phase: 'Workload Guard', artifact: 'workload-guard.md', verdict: 'PASS', next: 'Apply 7.1 Foundation' },
      traceCursor: { sequence: 1, eventHash: 'a'.repeat(64), chainHash: 'b'.repeat(64) },
      lastTransition: { inputHash: 'c'.repeat(64), outcomeHash: 'd'.repeat(64), afterStateHash: 'e'.repeat(64) },
    };
    const canonical = outcomeFor(change, 'Apply 7.1 Foundation', {
      checkpointArtifact: checkpoint,
      artifacts: [checkpoint],
      evidence: ['canonical checkpoint basename'],
      next: 'Apply 7.2 Core Engine',
    });
    const pathQualified = {
      ...canonical,
      artifacts: [join(bootstrapped.changePath, checkpoint)],
    };

    await assert.rejects(
      () => persistExecutorOutcome({ changePath: bootstrapped.changePath, state: foundationState, outcome: pathQualified }),
      /invalid checkpoint artifact or outcome shape/i,
    );

    const persisted = await persistExecutorOutcome({
      changePath: bootstrapped.changePath,
      state: foundationState,
      outcome: canonical,
    });
    assert.equal(persisted.persisted, true);
    assert.equal(persisted.state.sequence, 2);
    assert.equal(persisted.state.checkpoint.artifact, checkpoint);
    assert.equal(persisted.state.checkpoint.next, 'Apply 7.2 Core Engine');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('executor persistence rejects missing or non-file canonical checkpoint artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-checkpoint-provenance-'));
  const change = 'checkpoint-provenance';
  try {
    const bootstrapped = await bootstrapChange({ root, change, fingerprints: hashes });
    const outcome = outcomeFor(change, 'Design');
    await assert.rejects(
      () => persistExecutorOutcome({ changePath: bootstrapped.changePath, state: bootstrapped.state, outcome }),
      /missing canonical checkpoint artifact/i,
    );
    await mkdir(join(bootstrapped.changePath, 'design.md'));
    await assert.rejects(
      () => persistExecutorOutcome({ changePath: bootstrapped.changePath, state: bootstrapped.state, outcome }),
      /invalid canonical checkpoint artifact/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('failed Archive persistence leaves the Verify checkpoint active and unarchived', async () => {
  const root = await mkdtemp(join(tmpdir(), 'crm-runtime-archive-failure-'));
  const change = 'archive-failure';
  const changePath = join(root, 'openspec', 'changes', change);
  try {
    const bootstrapped = await bootstrapChange({ root, change, fingerprints: { ...hashes, artifacts: {} } });
    const before = {
      ...bootstrapped.state,
      sequence: 16,
      checkpoint: { phase: 'Verify', artifact: 'verify-report.md', verdict: 'PASS', next: 'Archive' },
      traceCursor: { sequence: 16, eventHash: 'd'.repeat(64), chainHash: 'e'.repeat(64) },
      lastTransition: { inputHash: 'f'.repeat(64), outcomeHash: 'a'.repeat(64), afterStateHash: 'b'.repeat(64) },
    };
    await writeFile(join(changePath, 'verify-report.md'), '# Verify\nPASS\n');
    await writeFile(join(changePath, '.sdd-runtime', 'state.json'), `${JSON.stringify(before)}\n`);

    const outcome = outcomeFor(change, 'Archive', { next: 'Health Report', evidence: ['Archive report was not available at the active checkpoint'] });
    await assert.rejects(
      () => persistExecutorOutcome({ changePath, state: before, outcome }),
      /missing canonical checkpoint artifact archive-report\.md/i,
    );

    const archivePath = archiveDestinationPath({ root, change });
    await assert.rejects(() => lstat(archivePath), { code: 'ENOENT' });
    assert.equal((await lstat(changePath)).isDirectory(), true);
    assert.deepEqual(JSON.parse(await readFile(join(changePath, '.sdd-runtime', 'state.json'))), before);
    await assert.rejects(() => lstat(join(changePath, '.sdd-runtime', 'trace')), { code: 'ENOENT' });

    await writeFile(join(changePath, 'archive-report.md'), '# Archive\nPASS\n');
    await writeFile(join(changePath, '.sdd-runtime', 'trace'), 'not a directory');
    await assert.rejects(
      () => persistExecutorOutcome({ changePath, state: before, outcome }),
      /ENOTDIR|not a directory/i,
    );
    await assert.rejects(() => lstat(archivePath), { code: 'ENOENT' });
    assert.deepEqual(JSON.parse(await readFile(join(changePath, '.sdd-runtime', 'state.json'))), before);
  } finally {
    await rm(root, { recursive: true, force: true });
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

test('configured LOW routing has one Luna candidate and fails closed without crossing roles', async () => {
  const modelMapPath = join(process.cwd(), '.opencode', 'sdd-model-map.json');
  const configured = JSON.parse(await readFile(modelMapPath, 'utf8'));
  assert.equal(configured.roles.LOW.model, 'openai/gpt-5.6-luna');
  assert.deepEqual(configured.runtime_routing.fallbacks.LOW, []);
  assert.deepEqual(configured.runtime_routing.candidates.LOW.map(({ model }) => model), ['openai/gpt-5.6-luna']);

  const unavailablePrimary = structuredClone(configured);
  unavailablePrimary.runtime_routing.candidates.LOW[0].available = false;
  await assert.rejects(() => resolveConfiguredRoute({ modelMap: unavailablePrimary, role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8 }), /no compatible route/);

  const crossRole = structuredClone(unavailablePrimary);
  crossRole.runtime_routing.candidates.LOW.push({ id: 'mid-cross-role', model: 'openai/gpt-5.6-luna', local_executor: 'sdd-direct-apply', role: 'MID', capabilities: ['evidence'], quality: 0.95, cost: 1, available: true });
  await assert.rejects(() => resolveConfiguredRoute({ modelMap: crossRole, role: 'LOW', requiredCapability: 'evidence', minimumQuality: 0.8 }), /no compatible route/);
});

test('canonical runtime command enumerates every runtime suite exactly once', async () => {
  const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
  const command = packageJson.scripts['test:sdd-runtime'];
  const expected = [
    'scripts/sdd-runtime.test.mjs',
    'scripts/sdd-runtime.integration.test.mjs',
    'scripts/sdd-runtime.e2e.test.mjs',
    'scripts/sdd-resume.test.mjs',
  ];
  const namedSuites = command.match(/scripts\/[^\s]+\.mjs/g) ?? [];
  assert.deepEqual(namedSuites, expected);
  assert.equal(new Set(namedSuites).size, expected.length);
});

test('every local Direct command and agent references the canonical outcome contract', async () => {
  const { readdir } = await import('node:fs/promises');
  const root = process.cwd();
  assert.match(await readFile(join(root, 'docs/architecture/sdd-direct.md'), 'utf8'), /executor-outcome-contract:start/);
  const files = [join(root, '.opencode', 'commands', 'sdd-direct.md')];
  const agents = await readdir(join(root, '.opencode', 'agents'));
  files.push(...agents.filter((name) => /^sdd-direct-.*\.md$/.test(name)).map((name) => join(root, '.opencode', 'agents', name)));
  for (const file of files) {
    assert.match(await readFile(file, 'utf8'), /canonical Executor Outcome Contract[\s\S]*docs\/architecture\/sdd-direct\.md/);
  }
});

test('integration dispatch converts exhausted Architecture refinement to FATAL/HUMAN', async () => {
  const { dispatchUntilTerminal } = await import('./sdd-runtime.mjs');
  const state = {
    ...buildInitialState({ root: '/repo', change: 'integration-change', fingerprints: hashes }),
    status: 'READY',
    checkpoint: { phase: 'Architecture Review', artifact: 'architecture-review.md', verdict: 'BLOCKED', next: 'Architecture Review' },
    attempts: { 'Design Refinement': 1 },
  };
  const outcome = {
    ...outcomeFor('integration-change', 'Architecture Review', { status: 'BLOCKED', evidence: ['budget'], next: 'Design Refinement' }),
    blocker: { class: 'AUTO_REFINE', human_required: false, reason: 'budget', resume_phase: 'Architecture Review' },
  };
  const result = dispatchUntilTerminal({ state, outcomes: [outcome] });
  assert.equal(result.status, 'HUMAN_HANDOFF');
  assert.equal(result.blocker.class, 'FATAL_INVARIANT');
  assert.equal(result.blocker.human_required, true);
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

test('stranded recovery rejects stale, duplicate, foreign, corrupt, ambiguous, and fingerprint-mismatched requests', async () => {
  const f = await fixture();
  const request = (overrides = {}) => recoverStrandedCheckpoint({ root: f.root, change: f.change, canonicalPath: f.changePath, expectedSequence: f.state.sequence, target: STRANDED_RECOVERY_TARGET, authorityRefs: f.refs, fingerprints: f.fingerprints, authorization: { actor: 'HUMAN / MAINTAINER', approval: 'approval' }, ...overrides });
  try {
    await assert.rejects(() => request({ expectedSequence: f.state.sequence - 1 }), /stale/i);
    await assert.rejects(() => request({ fingerprints: { ...f.fingerprints, workflow: '0'.repeat(64) } }), /fingerprint/i);
    await assert.rejects(() => request({ authorityRefs: { ...f.refs, extra: 'x' } }), /ambiguous/i);
    await assert.rejects(() => request({ authorization: { actor: 'not-a-maintainer', approval: 'approval' } }), /authorization/i);
    await assert.rejects(() => request({ unexpected: true }), /unknown|recovery request/i);
    await assert.rejects(() => request({ target: 'Apply 7.4 Integration' }), /target/i);
    const first = await request();
    await assert.rejects(() => request(), /stale/i);
    await assert.rejects(() => request({ change: 'foreign' }), /identity|canonical|ENOENT|trace/i);
    const corrupt = await fixture();
    await writeFile(join(corrupt.changePath, '.sdd-runtime', 'trace', 'bad.json'), '{}');
    await assert.rejects(() => recoverStrandedCheckpoint({ root: corrupt.root, change: corrupt.change, canonicalPath: corrupt.changePath, expectedSequence: corrupt.state.sequence, target: STRANDED_RECOVERY_TARGET, authorityRefs: corrupt.refs, fingerprints: corrupt.fingerprints, authorization: { actor: 'HUMAN / MAINTAINER', approval: 'approval' } }), /ambiguous|trace/i);
    await rm(corrupt.root, { recursive: true, force: true });
    assert.equal(first.state.status, 'READY');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('authorized dispatch-materialization recovery is append-only, preserves budgets, and requires a fresh Apply 7.5 result', async () => {
  const f = await fixture();
  try {
    let state = f.state;
    for (let sequence = 9; sequence < 20; sequence += 1) {
      const after = { ...state, status: 'READY', sequence, checkpoint: { phase: 'Apply 7.3 Feature Implementation', artifact: 'apply-7.3-feature-implementation.md', verdict: 'PASS', next: 'Apply 7.4 Integration' }, traceCursor: { sequence, eventHash: null, chainHash: null } };
      const event = createTraceEvent({ change: f.change, sequence, action: 'Apply 7.3 Feature Implementation', role: 'MID', inputHash: String(sequence).repeat(64).slice(0, 64), outcomeHash: String(sequence + 1).repeat(64).slice(0, 64), beforeState: state, afterState: after });
      await persistTransition({ changePath: f.changePath, event, state: after });
      state = { ...after, traceCursor: { sequence, eventHash: event.eventHash, chainHash: event.chainHash } };
    }
    const predecessor = { ...state, sequence: 20, checkpoint: { phase: 'Apply 7.4 Integration', artifact: 'apply-7.4-integration.md', verdict: 'PASS', next: 'Apply 7.5 Testing' }, traceCursor: { sequence: 20, eventHash: null, chainHash: null } };
    const event20 = createTraceEvent({ change: f.change, sequence: 20, action: 'Apply 7.4 Integration', role: 'MID', inputHash: '1'.repeat(64), outcomeHash: '2'.repeat(64), beforeState: { ...state, sequence: 19, traceCursor: state.traceCursor }, afterState: predecessor });
    await persistTransition({ changePath: f.changePath, event: event20, state: predecessor });
    state = { ...predecessor, traceCursor: { sequence: 20, eventHash: event20.eventHash, chainHash: event20.chainHash } };
    const blockedOutcome = { ...outcomeFor(f.change, 'Apply 7.5 Testing', { status: 'BLOCKED', artifacts: ['apply-7.5-testing.md', 'recoverable regression evidence'], evidence: ['recoverable regression evidence'], next: 'Apply 7.5 Testing' }), blocker: { class: 'HUMAN_SCOPE', human_required: true, reason: 'bounded regression decision', resume_phase: 'Apply 7.5 Testing' } };
    const normalizedBlockedOutcome = { ...blockedOutcome, status: 'HUMAN_HANDOFF', next: null };
    const handoffState = { ...state, status: 'HUMAN_HANDOFF', sequence: 21, checkpoint: { phase: 'Apply 7.4 Integration', artifact: 'apply-7.5-testing.md', verdict: 'BLOCKED', next: null }, traceCursor: { sequence: 21, eventHash: null, chainHash: null }, lastTransition: { action: 'Apply 7.5 Testing', inputHash: hashObject(blockedOutcome), outcomeHash: hashObject(normalizedBlockedOutcome), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } };
    const event21 = createTraceEvent({ change: f.change, sequence: 21, action: 'Apply 7.5 Testing', role: 'MID', inputHash: hashObject(blockedOutcome), outcomeHash: hashObject(normalizedBlockedOutcome), beforeState: state, afterState: handoffState });
    await persistTransition({ changePath: f.changePath, event: event21, state: handoffState });
    state = { ...handoffState, traceCursor: { sequence: 21, eventHash: event21.eventHash, chainHash: event21.chainHash } };
    const request = { root: f.root, change: f.change, canonicalPath: f.changePath, expectedSequence: 21, target: 'Apply 7.5 Testing', authorityRefs: f.refs, fingerprints: f.fingerprints, authorization: { actor: 'HUMAN / MAINTAINER', approval: 'explicit hotfix authorization' }, blockedOutcome };
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, target: 'Apply 7.4 Integration' }), /target/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, blockedOutcome: { ...blockedOutcome, next: 'Apply 7.6 Apply Summary' } }), /recoverable|evidence/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, blockedOutcome: { ...blockedOutcome, blocker: { ...blockedOutcome.blocker, class: 'HUMAN_SECURITY' } } }), /recoverable|evidence/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, blockedOutcome: { ...blockedOutcome, evidence: ['altered evidence'] } }), /originating|provenance/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, blockedOutcome: { ...blockedOutcome, artifacts: ['other.md'] } }), /artifact|provenance/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, authorization: { actor: 'not-human', approval: 'approval' } }), /authorization/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, expectedSequence: 20 }), /sequence/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, fingerprints: { ...f.fingerprints, workflow: '0'.repeat(64) } }), /fingerprint/i);
    await assert.rejects(() => recoverDispatchMaterialization({ ...request, authorityRefs: { ...f.refs, extra: 'foreign' } }), /ambiguous/i);
    const statePath = join(f.changePath, '.sdd-runtime', 'state.json');
    const originalStateText = await readFile(statePath, 'utf8');
    await writeFile(statePath, JSON.stringify({ ...state, checkpoint: { ...state.checkpoint, phase: 'Apply 7.3 Feature Implementation' } }));
    await assert.rejects(() => recoverDispatchMaterialization(request), /checkpoint|mismatch/i);
    await writeFile(statePath, originalStateText);
    const corruptTracePath = join(f.changePath, '.sdd-runtime', 'trace', 'bad.json');
    await writeFile(corruptTracePath, '{}');
    await assert.rejects(() => recoverDispatchMaterialization(request), /ambiguous|trace/i);
    await rm(corruptTracePath);
    await writeFile(join(f.changePath, '.sdd-runtime', 'dispatch-materialization-recovery.lock'), 'locked');
    await assert.rejects(() => recoverDispatchMaterialization(request), /concurrent/i);
    await rm(join(f.changePath, '.sdd-runtime', 'dispatch-materialization-recovery.lock'));
    const traceDirectory = join(f.changePath, '.sdd-runtime', 'trace');
    const beforeTraceNames = (await readdir(traceDirectory)).sort();
    const beforeTraceBytes = new Map(await Promise.all(beforeTraceNames.map(async (name) => [name, await readFile(join(traceDirectory, name), 'utf8')])));
    const beforeState = JSON.stringify(JSON.parse(await readFile(join(f.changePath, '.sdd-runtime', 'state.json'))));
    const result = await recoverDispatchMaterialization(request);
    assert.equal(result.state.status, 'READY');
    assert.deepEqual(result.state.checkpoint, { phase: 'Apply 7.5 Testing', artifact: 'apply-7.5-testing.md', verdict: 'BLOCKED', next: 'Apply 7.5 Testing' });
    assert.deepEqual(result.state.attempts, state.attempts);
    assert.deepEqual(result.state.fingerprints, state.fingerprints);
    assert.equal(result.event.operation, 'RECOVER_DISPATCH_MATERIALIZATION');
    assert.equal(result.event.sequence, 22);
    assert.equal(JSON.stringify(JSON.parse(await readFile(join(f.changePath, '.sdd-runtime', 'state.json')))) === beforeState, false);
    const trace = await readFile(result.tracePath, 'utf8');
    assert.equal(JSON.parse(trace).previousEventHash, event21.eventHash);
    const afterTraceNames = (await readdir(traceDirectory)).sort();
    assert.equal(afterTraceNames.length, beforeTraceNames.length + 1);
    for (const [name, bytes] of beforeTraceBytes) assert.equal(await readFile(join(traceDirectory, name), 'utf8'), bytes);
    const replay = dispatchUntilTerminal({ state: result.state, outcomes: [blockedOutcome] });
    assert.equal(replay.status, 'READY');
    assert.equal(replay.duplicate, true);
    assert.equal(replay.state.checkpoint.next, 'Apply 7.5 Testing');
    const { blocker: _blocked, ...freshBase } = blockedOutcome;
    const fresh = { ...freshBase, status: 'PASS', checkpointArtifact: 'apply-7.5-testing.md', artifacts: ['apply-7.5-testing.md'], evidence: ['fresh executor result'], next: 'Apply 7.6 Apply Summary' };
    assert.equal(dispatchUntilTerminal({ state: result.state, outcomes: [fresh] }).state.checkpoint.next, 'Apply 7.6 Apply Summary');
    await assert.rejects(() => recoverDispatchMaterialization(request), /stale/i);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
