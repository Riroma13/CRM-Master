#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, link, unlink, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const CHANGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const RUNTIME_SCHEMA_VERSION = 2;
export const TRACE_SCHEMA_VERSION = 1;
export const LOGICAL_ROLES = new Set(['HIGH', 'MID', 'LOW', 'HUMAN']);
export const RUNTIME_STATUSES = new Set(['READY', 'RUNNING', 'BLOCKED', 'HUMAN_HANDOFF', 'COMPLETED']);
export const CANONICAL_ACTIONS = new Set([
  'Design', 'Architecture Review', 'Design Refinement', 'Tasks', 'Tasks Review',
  'Tasks Refinement', 'Workload Guard', 'Apply 7.1 Foundation', 'Apply 7.2 Core Engine',
  'Apply 7.3 Feature Implementation', 'Apply 7.4 Integration', 'Apply 7.5 Testing',
  'Apply 7.6 Apply Summary', 'Verify', 'Archive', 'Health Report', 'Repository Ready',
]);
export const STRANDED_RECOVERY_OPERATION = 'RECOVER_STRANDED_CHECKPOINT';
export const STRANDED_RECOVERY_TARGET = 'Apply 7.3 Feature Implementation';
export const DISPATCH_MATERIALIZATION_RECOVERY_OPERATION = 'RECOVER_DISPATCH_MATERIALIZATION';
export const STRANDED_RECOVERY_AUTHORITY_REFERENCES = Object.freeze({
  workflow: 'docs/SDD-WORKFLOW.md',
  modelMap: '.opencode/sdd-model-map.json',
  config: 'openspec/config.yaml',
});

const HUMAN_CLASSES = new Set([
  'HUMAN_ARCHITECTURE', 'HUMAN_SECURITY', 'HUMAN_SCOPE', 'HUMAN_GIT',
  'HUMAN_RISK_ACCEPTANCE', 'HUMAN_INFRASTRUCTURE', 'FATAL_INVARIANT',
]);
const AUTO_CLASSES = new Set([
  'AUTO_RETRY', 'AUTO_REFINE', 'AUTO_RECOVER', 'ENVIRONMENT_RECOVERABLE', 'PROVIDER_FALLBACK',
]);
const RECOVERABLE_HANDOFF_CLASS = 'HUMAN_SCOPE';
export const BLOCKER_POLICIES = Object.freeze({
  AUTO_RETRY: { human_required: false, policy: 'RETRY_CURRENT_ACTION' },
  AUTO_REFINE: { human_required: false, policy: 'CANONICAL_REFINEMENT' },
  AUTO_RECOVER: { human_required: false, policy: 'CANONICAL_RECOVERY' },
  ENVIRONMENT_RECOVERABLE: { human_required: false, policy: 'ENVIRONMENT_RECOVERY' },
  PROVIDER_FALLBACK: { human_required: false, policy: 'SAME_ROLE_FALLBACK' },
  HUMAN_ARCHITECTURE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_SECURITY: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_SCOPE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_GIT: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_RISK_ACCEPTANCE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  HUMAN_INFRASTRUCTURE: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
  FATAL_INVARIANT: { human_required: true, policy: 'STOP/HUMAN_HANDOFF' },
});

const PHASE_ROLES = Object.freeze({
  Design: 'HIGH', 'Architecture Review': 'HIGH', 'Design Refinement': 'HIGH', Tasks: 'MID',
  'Tasks Review': 'MID', 'Tasks Refinement': 'MID', 'Workload Guard': 'MID',
  'Apply 7.1 Foundation': 'MID', 'Apply 7.2 Core Engine': 'MID',
  'Apply 7.3 Feature Implementation': 'MID', 'Apply 7.4 Integration': 'MID',
  'Apply 7.5 Testing': 'MID', 'Apply 7.6 Apply Summary': 'MID', Verify: 'HIGH',
  Archive: 'LOW', 'Health Report': 'LOW', 'Repository Ready': 'LOW',
});
const PHASE_EDGES = Object.freeze({
  Design: 'Architecture Review', 'Architecture Review': 'Tasks', 'Design Refinement': 'Architecture Review',
  Tasks: 'Tasks Review', 'Tasks Review': 'Workload Guard', 'Tasks Refinement': 'Tasks Review', 'Workload Guard': 'Apply 7.1 Foundation',
  'Apply 7.1 Foundation': 'Apply 7.2 Core Engine', 'Apply 7.2 Core Engine': 'Apply 7.3 Feature Implementation',
  'Apply 7.3 Feature Implementation': 'Apply 7.4 Integration', 'Apply 7.4 Integration': 'Apply 7.5 Testing',
  'Apply 7.5 Testing': 'Apply 7.6 Apply Summary', 'Apply 7.6 Apply Summary': 'Verify',
  Verify: 'Archive', Archive: 'Health Report', 'Health Report': 'Repository Ready',
});
export const CANONICAL_CHECKPOINT_ARTIFACTS = Object.freeze({
  Design: 'design.md',
  'Architecture Review': 'architecture-review.md',
  'Design Refinement': 'design.md',
  Tasks: 'tasks.md',
  'Tasks Review': 'tasks-review.md',
  'Tasks Refinement': 'tasks.md',
  'Workload Guard': 'workload-guard.md',
  'Apply 7.1 Foundation': 'apply-7.1-foundation.md',
  'Apply 7.2 Core Engine': 'apply-7.2-core-engine.md',
  'Apply 7.3 Feature Implementation': 'apply-7.3-feature-implementation.md',
  'Apply 7.4 Integration': 'apply-7.4-integration.md',
  'Apply 7.5 Testing': 'apply-7.5-testing.md',
  'Apply 7.6 Apply Summary': 'apply-7.6-apply-summary.md',
  Verify: 'verify-report.md',
  Archive: 'archive-report.md',
  'Health Report': 'health-report.md',
  'Repository Ready': 'repository-ready.md',
});
const REFINEMENT_BY_BLOCKED_REVIEW = Object.freeze({
  'Architecture Review': 'Design Refinement',
  'Tasks Review': 'Tasks Refinement',
});
const fatalInvariantHandoff = (reason) => ({
  action: 'HUMAN_HANDOFF',
  role: 'HUMAN',
  kind: 'human',
  blocker: {
    class: 'FATAL_INVARIANT',
    human_required: true,
    reason,
    resume_phase: null,
  },
});

const hex = /^[a-f0-9]{64}$/;
const own = (value, allowed) => Object.keys(value).every((key) => allowed.has(key));
const fail = (message) => { throw new TypeError(message); };
const assertObject = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
};
const assertHash = (value, name) => { if (typeof value !== 'string' || !hex.test(value)) fail(`${name} must be a sha256 hash`); };

export function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== 'object') fail('canonical JSON only accepts JSON values');
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : canonicalJson(value)).digest('hex');
}

export function hashObject(value) { return sha256(value); }

export function validateChangeName(change) {
  if (typeof change !== 'string' || !CHANGE_NAME_PATTERN.test(change)) fail('invalid change name');
  return change;
}

export function validateIdentity({ root, change, canonicalPath } = {}) {
  if (typeof root !== 'string' || !isAbsolute(root)) fail('canonical root must be absolute');
  validateChangeName(change);
  const expected = join(resolve(root), 'openspec', 'changes', change);
  if (canonicalPath !== undefined && resolve(canonicalPath) !== expected) fail('canonical path mismatch');
  if (relative(resolve(root), expected).startsWith('..')) fail('change path escapes canonical root');
  return { root: resolve(root), change, changePath: expected };
}

export function validateScope(scope = {}) {
  const identity = validateIdentity(scope);
  if (scope.branch !== undefined && (typeof scope.branch !== 'string' || !scope.branch.trim())) fail('invalid branch');
  if (scope.workingSet !== undefined && (!Array.isArray(scope.workingSet) || scope.workingSet.some((item) => typeof item !== 'string' || isAbsolute(item) || item.includes('..')))) fail('invalid Working Set');
  return { ...identity, branch: scope.branch ?? null, workingSet: scope.workingSet ?? [] };
}

export async function fingerprintFiles(files) {
  const result = {};
  for (const file of [...files].sort()) result[file] = sha256(await readFile(file));
  return result;
}

export async function atomicWriteJson(target, value) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
  const directory = await open(dirname(target), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
  return target;
}

async function writeExclusiveJson(target, value) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, target);
  } finally {
    await unlink(temporary).catch(() => {});
  }
  const directory = await open(dirname(target), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}

export function projectCanonicalWorkflow() {
  return { phases: [...CANONICAL_ACTIONS], roles: { ...PHASE_ROLES }, edges: { ...PHASE_EDGES } };
}

export function buildInitialState({ root, change, fingerprints } = {}) {
  const identity = validateIdentity({ root, change });
  const completeFingerprints = { artifacts: {}, ...fingerprints };
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(completeFingerprints[key], `fingerprints.${key}`);
  return validateRuntimeState({
    schemaVersion: RUNTIME_SCHEMA_VERSION, change, canonicalPath: identity.changePath, status: 'READY', sequence: 0,
    checkpoint: { phase: null, artifact: null, verdict: null, next: 'Design' }, fingerprints: completeFingerprints,
    attempts: {}, traceCursor: { sequence: 0, eventHash: null, chainHash: null }, lastTransition: null,
  });
}

export async function bootstrapChange({ root, change, fingerprints } = {}) {
  const identity = validateIdentity({ root, change });
  const initialState = buildInitialState({ root, change, fingerprints });
  let created = false;

  await mkdir(dirname(identity.changePath), { recursive: true });
  try {
    await mkdir(identity.changePath);
    created = true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  const statePath = join(identity.changePath, '.sdd-runtime', 'state.json');
  if (created) {
    await writeExclusiveJson(statePath, initialState);
    return { changePath: identity.changePath, state: initialState, disposition: 'CREATED' };
  }

  let existing;
  try {
    existing = JSON.parse(await readFile(statePath, 'utf8'));
    validateRuntimeState(existing);
  } catch (error) {
    throw new TypeError(`bootstrap provenance conflict: ${error.message}`);
  }
  if (existing.change !== change || existing.canonicalPath !== identity.changePath
      || canonicalJson(existing.fingerprints) !== canonicalJson(initialState.fingerprints)) {
    throw new TypeError('bootstrap provenance conflict: existing state does not match identity');
  }
  return { changePath: identity.changePath, state: existing, disposition: 'REUSED' };
}

export function selectNextTransition(state, outcome, projection = projectCanonicalWorkflow()) {
  validateRuntimeState(state);
  validateOutcomePacket(outcome);
  if (outcome.change !== state.change) fail('scope mismatch');
  if (state.checkpoint.next !== null && state.checkpoint.next !== outcome.action) {
    return fatalInvariantHandoff(`outcome ${outcome.action} is not the legal current action ${state.checkpoint.next}`);
  }
  if (outcome.status !== 'PASS') {
    const policy = validateBlocker(outcome.blocker);
    if (policy.human_required) return { action: 'HUMAN_HANDOFF', role: 'HUMAN', kind: 'human', blocker: outcome.blocker };
    if (policy.policy === 'CANONICAL_REFINEMENT') {
      const refinement = REFINEMENT_BY_BLOCKED_REVIEW[outcome.action];
      if (!refinement) return fatalInvariantHandoff(`AUTO_REFINE is not legal for ${outcome.action}`);
      if (state.attempts[refinement] >= 1) {
        return fatalInvariantHandoff(`${refinement} refinement budget exhausted`);
      }
      return { action: refinement, role: PHASE_ROLES[refinement], kind: 'refinement' };
    }
    if (state.attempts[outcome.action] >= 2) {
      return fatalInvariantHandoff(`${outcome.action} retry budget exhausted`);
    }
    return { action: outcome.action, role: PHASE_ROLES[outcome.action], kind: 'retry' };
  }
  if (state.checkpoint.next !== outcome.action && state.checkpoint.next !== null) fail('outcome is not the legal current action');
  const next = projection.edges[outcome.action];
  if (!next) return { action: 'HUMAN_HANDOFF', role: 'HUMAN', kind: 'terminal' };
  if (!CANONICAL_ACTIONS.has(next)) fail('illegal transition');
  if (outcome.next !== next) fail('outcome next does not match legal transition');
  return { action: next, role: projection.roles[next], kind: 'canonical' };
}

export function canonicalCheckpointArtifact(action) {
  if (!CANONICAL_ACTIONS.has(action) || typeof CANONICAL_CHECKPOINT_ARTIFACTS[action] !== 'string') fail(`no canonical checkpoint artifact for ${action}`);
  return CANONICAL_CHECKPOINT_ARTIFACTS[action];
}

export function recordAttempt(state, action) {
  validateRuntimeState(state);
  if (!CANONICAL_ACTIONS.has(action)) fail('invalid attempt action');
  const count = state.attempts[action] || 0;
  if (count >= 2) fail('retry budget exhausted');
  return validateRuntimeState({ ...state, attempts: { ...state.attempts, [action]: count + 1 } });
}

export function idempotencyKey(change, sequence, action, inputHash) {
  validateChangeName(change); assertHash(inputHash, 'inputHash');
  return sha256(`${change}${sequence}${action}${inputHash}`);
}

export function reconstructState({ root, change, fingerprints = { workflow: '0'.repeat(64), modelMap: '0'.repeat(64), config: '0'.repeat(64) }, artifacts = [] } = {}) {
  const state = buildInitialState({ root, change, fingerprints });
  if (!artifacts.length) return state;
  const candidates = artifacts.filter((artifact) => artifact && CANONICAL_ACTIONS.has(artifact.phase));
  if (candidates.length > 1 && candidates.some((artifact) => !artifact.status && !artifact.next)) fail('ambiguous checkpoint artifacts');
  const checkpoint = candidates.at(-1);
  if (!checkpoint) return state;
  const next = checkpoint.next ?? PHASE_EDGES[checkpoint.phase] ?? null;
  return validateRuntimeState({ ...state, status: checkpoint.status === 'BLOCKED' ? 'BLOCKED' : 'READY', checkpoint: { phase: checkpoint.phase, artifact: checkpoint.name ?? null, verdict: checkpoint.status === 'PASS' ? 'PASS' : checkpoint.status === 'BLOCKED' ? 'BLOCKED' : null, next } });
}

export async function recoverLegacyChange({ changePath, root, change, fingerprints } = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('legacy change path must be absolute');
  const order = ['repository-ready.md', 'health-report.md', 'archive-report.md', 'verify-report.md', 'verify.md', 'apply-summary.md', 'workload-guard.md', 'tasks-review.md', 'tasks.md', 'architecture-review.md', 'design.md'];
  const artifacts = [];
  for (const name of order) {
    try {
      const text = await readFile(join(changePath, name), 'utf8');
      const phase = text.match(/^\s*phase:\s*(.+)$/im)?.[1]?.trim() || PHASE_ROLES[name] || null;
      const status = text.match(/^\s*(?:status|state):\s*(PASS|BLOCKED|COMPLETED|ARCHIVED)\s*$/im)?.[1] || null;
      const next = text.match(/^\s*next:\s*(.+)$/im)?.[1]?.trim() || null;
      const phaseName = { 'repository-ready.md': 'Repository Ready', 'health-report.md': 'Health Report', 'archive-report.md': 'Archive', 'verify-report.md': 'Verify', 'verify.md': 'Verify', 'apply-summary.md': 'Apply 7.6 Apply Summary', 'workload-guard.md': 'Workload Guard', 'tasks-review.md': 'Tasks Review', 'tasks.md': 'Tasks', 'architecture-review.md': 'Architecture Review', 'design.md': 'Design' }[name];
      artifacts.push({ name, phase: phase || phaseName, status, next });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return reconstructState({ root, change, fingerprints, artifacts });
}

export function validateBlocker(blocker) {
  assertObject(blocker, 'blocker');
  if (!own(blocker, new Set(['class', 'human_required', 'reason', 'resume_phase']))) fail('unknown blocker field');
  const policy = BLOCKER_POLICIES[blocker.class];
  if (!policy) fail('unknown blocker class');
  if (typeof blocker.human_required !== 'boolean' || blocker.human_required !== policy.human_required) fail('human_required mismatch');
  if (typeof blocker.reason !== 'string' || !blocker.reason.trim()) fail('invalid blocker reason');
  if (blocker.resume_phase !== null && (typeof blocker.resume_phase !== 'string' || !CANONICAL_ACTIONS.has(blocker.resume_phase))) fail('invalid resume_phase');
  return { ...blocker, policy: policy.policy };
}

export function validateOutcomePacket(packet) {
  assertObject(packet, 'outcome');
  if (!own(packet, new Set(['change', 'action', 'role', 'status', 'checkpointArtifact', 'artifacts', 'evidence', 'next', 'blocker']))) fail('unknown outcome field');
  validateChangeName(packet.change);
  if (!CANONICAL_ACTIONS.has(packet.action) || !LOGICAL_ROLES.has(packet.role)) fail('invalid outcome action or role');
  if (PHASE_ROLES[packet.action] !== packet.role) fail(`outcome role must match canonical role for ${packet.action}`);
  if (typeof packet.checkpointArtifact !== 'string' || packet.checkpointArtifact !== canonicalCheckpointArtifact(packet.action) || !Array.isArray(packet.artifacts) || !packet.artifacts.every((item) => typeof item === 'string') || !packet.artifacts.includes(packet.checkpointArtifact) || !Array.isArray(packet.evidence) || !packet.evidence.every((item) => typeof item === 'string')) fail('invalid checkpoint artifact or outcome shape');
  if (!['PASS', 'BLOCKED', 'FAILED'].includes(packet.status)) fail('invalid outcome status');
  if (typeof packet.next !== 'string') fail('invalid outcome next');
  if (packet.status === 'PASS' && packet.blocker !== undefined) fail('PASS outcome cannot contain blocker');
  if (packet.status !== 'PASS' && packet.blocker === undefined) fail('blocked outcome requires blocker');
  if (packet.blocker !== undefined) validateBlocker(packet.blocker);
  return packet;
}

export function safeValidateOutcome(packet) {
  try {
    const validated = validateOutcomePacket(packet);
    if (validated.status !== 'PASS' && validated.blocker.human_required) return { ...validated, status: 'HUMAN_HANDOFF', next: null };
    return validated;
  } catch (error) {
    return {
      change: typeof packet?.change === 'string' ? packet.change : 'unknown', action: typeof packet?.action === 'string' ? packet.action : 'Repository Ready',
      role: 'HUMAN', status: 'HUMAN_HANDOFF', checkpointArtifact: canonicalCheckpointArtifact(CANONICAL_ACTIONS.has(packet?.action) ? packet.action : 'Repository Ready'), artifacts: [], evidence: [error.message], next: null,
      blocker: { class: 'FATAL_INVARIANT', human_required: true, reason: error.message, resume_phase: null },
    };
  }
}

function validateCheckpoint(checkpoint) {
  assertObject(checkpoint, 'checkpoint');
  if (!own(checkpoint, new Set(['phase', 'artifact', 'verdict', 'next']))) fail('unknown checkpoint field');
  if (checkpoint.phase !== null && typeof checkpoint.phase !== 'string') fail('invalid checkpoint phase');
  if (checkpoint.artifact !== null && typeof checkpoint.artifact !== 'string') fail('invalid checkpoint artifact');
  if (!['PASS', 'BLOCKED', null].includes(checkpoint.verdict)) fail('invalid checkpoint verdict');
  if (checkpoint.next !== null && (typeof checkpoint.next !== 'string' || !CANONICAL_ACTIONS.has(checkpoint.next))) fail('invalid checkpoint next');
}

export function validateRuntimeState(state) {
  assertObject(state, 'state');
  if (!own(state, new Set(['schemaVersion', 'change', 'canonicalPath', 'status', 'sequence', 'checkpoint', 'fingerprints', 'attempts', 'traceCursor', 'lastTransition']))) fail('unknown state field');
  if (state.schemaVersion !== RUNTIME_SCHEMA_VERSION) fail('unsupported state schema');
  validateChangeName(state.change);
  if (typeof state.canonicalPath !== 'string' || !isAbsolute(state.canonicalPath)) fail('invalid state canonicalPath');
  if (!RUNTIME_STATUSES.has(state.status) || !Number.isSafeInteger(state.sequence) || state.sequence < 0) fail('invalid state status or sequence');
  validateCheckpoint(state.checkpoint);
  assertObject(state.fingerprints, 'fingerprints');
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(state.fingerprints[key], `fingerprints.${key}`);
  assertObject(state.fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(state.fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  assertObject(state.attempts, 'attempts');
  if (Object.values(state.attempts).some((attempt) => !Number.isSafeInteger(attempt) || attempt < 0)) fail('invalid attempts');
  assertObject(state.traceCursor, 'traceCursor');
  if (state.traceCursor.sequence !== state.sequence) fail('trace cursor sequence mismatch');
  if (state.traceCursor.eventHash !== null) assertHash(state.traceCursor.eventHash, 'trace cursor eventHash');
  if (state.traceCursor.chainHash !== null) assertHash(state.traceCursor.chainHash, 'trace cursor chainHash');
  if (state.lastTransition !== null) {
    assertObject(state.lastTransition, 'lastTransition');
    for (const key of ['inputHash', 'outcomeHash', 'afterStateHash']) assertHash(state.lastTransition[key], `lastTransition.${key}`);
  }
  return state;
}

function materialization(state) {
  return { status: state.status, sequence: state.sequence, checkpoint: state.checkpoint, fingerprints: state.fingerprints, attempts: state.attempts, traceCursor: state.traceCursor, lastTransition: state.lastTransition };
}

export function createTraceEvent({ change, sequence, action, role, inputHash, outcomeHash, beforeState, afterState, route = { configured: role, resolved: role, rejections: [] }, contextAudit = { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: {} }, timestamp = new Date().toISOString(), operation = undefined, previousSequence = undefined, newSequence = undefined, sourceStatus = undefined, target = undefined, authorization = undefined, authorityFingerprints = undefined }) {
  validateChangeName(change);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || !CANONICAL_ACTIONS.has(action)) fail('invalid trace sequence or action');
  if (!LOGICAL_ROLES.has(role)) fail('invalid trace role');
  assertHash(inputHash, 'inputHash'); assertHash(outcomeHash, 'outcomeHash');
  validateRuntimeState(beforeState); validateRuntimeState(afterState);
  const event = { schemaVersion: TRACE_SCHEMA_VERSION, sequence, idempotencyKey: sha256(`${change}${sequence}${action}${inputHash}`), previousEventHash: beforeState.traceCursor.eventHash, chainHash: '', change, action, role, inputHash, outcomeHash, route, beforeStateHash: hashObject(materialization(beforeState)), afterStateHash: hashObject(materialization(afterState)), stateMaterialization: materialization(afterState), contextAudit, timestamp };
  if (operation !== undefined) {
    if (![STRANDED_RECOVERY_OPERATION, DISPATCH_MATERIALIZATION_RECOVERY_OPERATION].includes(operation)
      || role !== 'HUMAN' || action !== target
      || (operation === STRANDED_RECOVERY_OPERATION && target !== STRANDED_RECOVERY_TARGET)
      || (operation === DISPATCH_MATERIALIZATION_RECOVERY_OPERATION && target !== 'Apply 7.5 Testing')) fail('invalid recovery trace operation');
    if (previousSequence !== sequence - 1 || newSequence !== sequence || sourceStatus !== 'HUMAN_HANDOFF') fail('invalid recovery trace sequence');
    validateRecoveryAuthorization(authorization);
    assertObject(authorityFingerprints, 'authorityFingerprints');
    for (const key of ['workflow', 'modelMap', 'config']) assertHash(authorityFingerprints[key], `authorityFingerprints.${key}`);
    assertObject(authorityFingerprints.artifacts, 'authorityFingerprints.artifacts');
    for (const hash of Object.values(authorityFingerprints.artifacts)) assertHash(hash, 'authority artifact fingerprint');
    Object.assign(event, { operation, previousSequence, newSequence, sourceStatus, target, authorization, authorityFingerprints });
  }
  event.eventHash = sha256(Object.fromEntries(Object.entries(event).filter(([key]) => !['eventHash', 'chainHash'].includes(key))));
  event.chainHash = sha256(`${beforeState.traceCursor.chainHash || 'genesis'}${event.eventHash}`);
  return event;
}

export function validateTraceEvent(event) {
  assertObject(event, 'trace event');
  if (event.schemaVersion !== TRACE_SCHEMA_VERSION) fail('unsupported trace schema');
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || !CANONICAL_ACTIONS.has(event.action) || !LOGICAL_ROLES.has(event.role)) fail('invalid trace event identity');
  validateChangeName(event.change); assertHash(event.inputHash, 'inputHash'); assertHash(event.outcomeHash, 'outcomeHash'); assertHash(event.eventHash, 'eventHash'); assertHash(event.chainHash, 'chainHash');
  if (event.previousEventHash !== null) assertHash(event.previousEventHash, 'previousEventHash');
  validateRuntimeState({ ...event.stateMaterialization, schemaVersion: 2, change: event.change, canonicalPath: '/validated', });
  if (event.afterStateHash !== hashObject(event.stateMaterialization)) fail('trace after-state hash mismatch');
  if (event.operation !== undefined) validateRecoveryTraceMetadata(event);
  const expected = sha256(Object.fromEntries(Object.entries(event).filter(([key]) => !['eventHash', 'chainHash'].includes(key))));
  if (expected !== event.eventHash) fail('trace event hash mismatch');
  return event;
}

export function validateTraceSequence(events) {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const keys = new Set();
  let previous = null;
  for (let index = 0; index < ordered.length; index += 1) {
    const event = validateTraceEvent(ordered[index]);
    if (event.sequence !== index + 1) fail('trace sequence gap or duplicate');
    if (keys.has(event.idempotencyKey)) fail('duplicate trace idempotency key');
    keys.add(event.idempotencyKey);
    if (event.previousEventHash !== (previous?.eventHash ?? null)) fail('trace hash chain mismatch');
    if (event.chainHash !== sha256(`${previous?.chainHash || 'genesis'}${event.eventHash}`)) fail('trace chain hash mismatch');
    if (previous) {
      const previousState = { ...previous.stateMaterialization, schemaVersion: 2, change: previous.change, canonicalPath: '/validated', traceCursor: { sequence: previous.sequence, eventHash: previous.eventHash, chainHash: previous.chainHash } };
      if (event.beforeStateHash !== hashObject(materialization(previousState))) fail('trace state continuity mismatch');
    }
    if (event.operation !== undefined) validateRecoveryTraceMetadata(event, previous);
    previous = event;
  }
  return ordered;
}

export function reconcileTraceState(state, events) {
  validateRuntimeState(state);
  const ordered = validateTraceSequence(events);
  const cursor = ordered.at(-1);
  if (!cursor) return { state, events: ordered, reconciled: false };
  if (state.sequence > cursor.sequence) fail('state is ahead of trace');
  if (state.sequence === cursor.sequence && state.traceCursor.eventHash !== cursor.eventHash) fail('state cursor conflicts with trace');
  if (state.sequence < cursor.sequence - 1) fail('more than one unmatched trace event');
  if (state.sequence === cursor.sequence - 1) {
    const materialized = { ...cursor.stateMaterialization, schemaVersion: 2, change: state.change, canonicalPath: state.canonicalPath, traceCursor: { sequence: cursor.sequence, eventHash: cursor.eventHash, chainHash: cursor.chainHash } };
    return { state: validateRuntimeState(materialized), events: ordered, reconciled: true };
  }
  return { state, events: ordered, reconciled: false };
}

export function createContextPacket({ authorityRefs = {}, fingerprints = {}, workingSet = [] } = {}) {
  const references = { ...authorityRefs };
  const packet = {
    authorityRefs: references, fingerprints: { ...fingerprints }, workingSet: [...workingSet],
    audit: { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references },
  };
  return Object.freeze({ ...packet, forPhase(phase) {
    if (typeof phase !== 'string' || !CANONICAL_ACTIONS.has(phase)) fail('invalid context phase');
    return Object.freeze({ ...packet, phase, audit: { ...packet.audit, references: { ...references } } });
  } });
}

export function evaluateWorkloadGuard({ estimatedLines, semanticException = null, withinApprovedDesign = true, withinApprovedTasks = true, withinApprovedWorkingSet = true } = {}) {
  if (!Number.isSafeInteger(estimatedLines) || estimatedLines < 0) fail('invalid workload forecast');
  if ([withinApprovedDesign, withinApprovedTasks, withinApprovedWorkingSet].some((value) => typeof value !== 'boolean')) fail('invalid approved scope status');

  const forecast = { estimatedLines, treatment: 'informational-only' };

  let blockerInput = semanticException;
  if ((!withinApprovedDesign || !withinApprovedTasks || !withinApprovedWorkingSet) && blockerInput === null) {
    blockerInput = {
      class: 'HUMAN_SCOPE',
      reason: 'material Design/Tasks/Working Set expansion requires the Design/Review path',
      resume_phase: 'Design Refinement',
    };
  }
  if (blockerInput !== null) {
    assertObject(blockerInput, 'semantic workload exception');
    if (!own(blockerInput, new Set(['class', 'reason', 'resume_phase']))) fail('unknown semantic workload exception field');
    const blocker = validateBlocker({ ...blockerInput, human_required: true, resume_phase: blockerInput.resume_phase ?? null });
    if (!blocker.policy.startsWith('STOP/')) fail('semantic workload exception must be HUMAN-owned');
    return { status: 'HUMAN_HANDOFF', policy: 'semantic-exception', human_required: true, forecast, blocker: { ...blockerInput, human_required: true, resume_phase: blockerInput.resume_phase ?? null } };
  }

  return { status: 'PASS', policy: 'size-neutral', human_required: false, forecast };
}

export function gitMutationBarrier({ operation, target = '' } = {}) {
  const blockedOperations = new Set(['commit', 'push', 'merge', 'rebase', 'release', 'deploy', 'tag']);
  if (blockedOperations.has(operation) || target === 'main' || target === 'refs/heads/main') fail('HUMAN_GIT: Git mutation/direct-to-main request rejected');
  return { allowed: true, operation, target };
}

export function dispatchUntilTerminal({ state, outcomes = [], execute = null, projection = projectCanonicalWorkflow(), maxTransitions = 25 } = {}) {
  let current = validateRuntimeState(state);
  let duplicate = false;
  for (let index = 0; index < maxTransitions; index += 1) {
    if (current.status === 'HUMAN_HANDOFF' || current.status === 'COMPLETED') return { status: current.status, state: current, duplicate };
    const rawOutcome = outcomes[index] ?? (execute ? execute(current) : null);
    if (!rawOutcome) return { status: current.status, state: current, duplicate };
    const outcome = safeValidateOutcome(rawOutcome);
    if (outcome.status === 'HUMAN_HANDOFF') {
      const rawInputHash = hashObject(rawOutcome);
      if (current.lastTransition?.action === outcome.action && current.lastTransition.inputHash === rawInputHash) {
        duplicate = true;
        continue;
      }
      let validatedRawOutcome = null;
      try { validatedRawOutcome = validateOutcomePacket(rawOutcome); } catch {}
      const actualBlockedOutcome = validatedRawOutcome?.status === 'BLOCKED'
        && validatedRawOutcome.blocker.human_required;
      const phase = actualBlockedOutcome ? validatedRawOutcome.action : current.checkpoint.phase;
      const artifact = actualBlockedOutcome ? validatedRawOutcome.checkpointArtifact : current.checkpoint.artifact;
      const inputHash = rawInputHash;
      current = validateRuntimeState({ ...current, status: 'HUMAN_HANDOFF', sequence: current.sequence + 1, checkpoint: { phase, artifact, verdict: 'BLOCKED', next: null }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { idempotencyKey: idempotencyKey(current.change, current.sequence + 1, current.checkpoint.next || 'HUMAN_HANDOFF', inputHash), action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF', blocker: outcome.blocker }) } });
      return { status: current.status, state: current, duplicate, blocker: outcome.blocker };
    }
    const inputHash = hashObject(outcome);
    const key = idempotencyKey(current.change, current.sequence + 1, outcome.action, inputHash);
    if (current.lastTransition?.action === outcome.action && current.lastTransition.inputHash === inputHash) {
      duplicate = true;
      continue;
    }
    const transition = selectNextTransition(current, outcome, projection);
    if (transition.kind === 'human' || transition.kind === 'terminal') {
      current = validateRuntimeState({ ...current, status: 'HUMAN_HANDOFF', sequence: current.sequence + 1, checkpoint: { phase: outcome.action, artifact: outcome.checkpointArtifact, verdict: outcome.status === 'PASS' ? 'PASS' : 'BLOCKED', next: null }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { idempotencyKey: key, action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } });
      return { status: current.status, state: current, duplicate, blocker: transition.blocker };
    }
    if (outcome.status !== 'PASS' || (current.attempts[outcome.action] || 0) < 2) {
      current = recordAttempt(current, outcome.action);
    }
    current = validateRuntimeState({ ...current, sequence: current.sequence + 1, checkpoint: { phase: outcome.action, artifact: outcome.checkpointArtifact, verdict: outcome.status, next: transition.action }, lastTransition: { idempotencyKey: key, action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ action: transition.action }) }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null } });
  }
  fail('dispatch transition limit exceeded');
}

/**
 * Materialize exactly one executor result before another result can be dispatched.
 * `dispatchUntilTerminal` is intentionally a pure state projection; this is the
 * canonical adapter boundary that turns that projection into an event-first
 * repository transition.
 */
export async function persistExecutorOutcome({ changePath, state, outcome, route = undefined, contextAudit = undefined, projection = projectCanonicalWorkflow() } = {}) {
  if (typeof changePath !== 'string' || !isAbsolute(changePath)) fail('change path must be absolute');
  validateRuntimeState(state);
  if (resolve(changePath) !== resolve(state.canonicalPath)) fail('change path mismatch');
  const validatedOutcome = validateOutcomePacket(outcome);
  const checkpointPath = join(changePath, validatedOutcome.checkpointArtifact);
  let checkpointStats;
  try { checkpointStats = await lstat(checkpointPath); } catch (error) { if (error.code === 'ENOENT') fail(`missing canonical checkpoint artifact ${validatedOutcome.checkpointArtifact}`); throw error; }
  if (!checkpointStats.isFile() || checkpointStats.isSymbolicLink()) fail(`invalid canonical checkpoint artifact ${validatedOutcome.checkpointArtifact}`);

  const result = dispatchUntilTerminal({ state, outcomes: [validatedOutcome], projection });
  if (result.state.sequence === state.sequence) {
    if (result.duplicate && state.traceCursor.eventHash !== null) {
      return { ...result, persisted: false, event: null, tracePath: null };
    }
    fail('executor outcome did not produce one transition');
  }
  if (result.state.sequence !== state.sequence + 1) fail('executor outcome produced more than one transition');

  const normalizedOutcome = safeValidateOutcome(outcome);
  const afterState = result.state;
  const eventAction = CANONICAL_ACTIONS.has(afterState.lastTransition.action)
    ? afterState.lastTransition.action
    : 'Repository Ready';
  const eventRole = LOGICAL_ROLES.has(normalizedOutcome.role) ? normalizedOutcome.role : 'HUMAN';
  const eventRoute = route ?? { configured: eventRole, resolved: eventRole, rejections: [] };
  const eventContextAudit = contextAudit ?? { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: {} };
  validateRoute(eventRoute);
  assertObject(eventContextAudit, 'contextAudit');

  const event = createTraceEvent({
    change: state.change,
    sequence: afterState.sequence,
    action: eventAction,
    role: eventRole,
    inputHash: afterState.lastTransition.inputHash,
    outcomeHash: afterState.lastTransition.outcomeHash,
    beforeState: state,
    afterState,
    route: eventRoute,
    contextAudit: eventContextAudit,
  });
  const persisted = await persistTransition({ changePath, event, state: afterState });
  const materializedState = validateRuntimeState({
    ...afterState,
    traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash },
  });
  return { ...result, ...persisted, persisted: !persisted.duplicate, state: materializedState, event };
}

export async function persistTransition({ changePath, event, state } = {}) {
  validateTraceEvent(event);
  validateRuntimeState(state);
  if (state.change !== event.change) fail('transition scope mismatch');
  if (resolve(changePath) !== resolve(state.canonicalPath)) fail('transition path mismatch');
  const tracePath = join(changePath, '.sdd-runtime', 'trace', `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`);
  try {
    const existing = JSON.parse(await readFile(tracePath, 'utf8'));
    if (canonicalJson(existing) === canonicalJson(event)) {
      const eventState = validateRuntimeState({
        ...event.stateMaterialization,
        schemaVersion: RUNTIME_SCHEMA_VERSION,
        change: event.change,
        canonicalPath: resolve(changePath),
      });
      const suppliedState = validateRuntimeState({ ...state, traceCursor: eventState.traceCursor });
      if (canonicalJson(materialization(suppliedState)) !== canonicalJson(event.stateMaterialization)) fail('duplicate trace state mismatch');
      const expectedMaterialized = validateRuntimeState({
        ...eventState,
        traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash },
      });
      const statePath = join(changePath, '.sdd-runtime', 'state.json');
      let persistedState;
      try {
        persistedState = validateRuntimeState(JSON.parse(await readFile(statePath, 'utf8')));
      } catch (stateError) {
        if (stateError.code === 'ENOENT') fail('duplicate trace state is missing');
        throw stateError;
      }
      if (canonicalJson(persistedState) === canonicalJson(expectedMaterialized)) return { duplicate: true, tracePath };
      const isPreviousCheckpoint = event.sequence === persistedState.sequence + 1
        && event.previousEventHash === persistedState.traceCursor.eventHash
        && event.beforeStateHash === hashObject(materialization(persistedState));
      if (!isPreviousCheckpoint) {
        if (persistedState.sequence > event.sequence) fail('state is ahead of duplicate trace event');
        fail('duplicate trace state conflict');
      }
      await atomicWriteJson(statePath, expectedMaterialized);
      return { duplicate: true, tracePath };
    }
    fail('conflicting duplicate trace event');
  } catch (error) {
    if (error instanceof TypeError) throw error;
    if (error.code !== 'ENOENT') throw error;
  }
  const materialized = validateRuntimeState({ ...state, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } });
  await writeExclusiveJson(tracePath, event);
  await atomicWriteJson(join(changePath, '.sdd-runtime', 'state.json'), materialized);
  return { duplicate: false, tracePath };
}

const recoveryAuthorityKeys = new Set(Object.keys(STRANDED_RECOVERY_AUTHORITY_REFERENCES));

function validateRecoveryAuthorization(authorization) {
  assertObject(authorization, 'authorization');
  if (!own(authorization, new Set(['actor', 'approval']))) fail('ambiguous recovery authorization');
  if (authorization.actor !== 'HUMAN / MAINTAINER') fail('invalid HUMAN authorization actor');
  if (typeof authorization.approval !== 'string' || !authorization.approval.trim() || authorization.approval.length > 2000) fail('invalid HUMAN authorization approval');
}

function validateRecoveryAuthorities(authorityRefs) {
  assertObject(authorityRefs, 'authorityRefs');
  if (canonicalJson(authorityRefs) !== canonicalJson(STRANDED_RECOVERY_AUTHORITY_REFERENCES)) fail('ambiguous authority references');
}

function validateRecoveryTraceMetadata(event, previous = null) {
  const stranded = event.operation === STRANDED_RECOVERY_OPERATION;
  const materialization = event.operation === DISPATCH_MATERIALIZATION_RECOVERY_OPERATION;
  if ((!stranded && !materialization) || event.role !== 'HUMAN' || event.action !== event.target || event.sourceStatus !== 'HUMAN_HANDOFF'
    || event.previousSequence !== event.sequence - 1 || event.newSequence !== event.sequence) fail('invalid recovery trace metadata');
  if ((stranded && event.target !== STRANDED_RECOVERY_TARGET) || (materialization && event.target !== 'Apply 7.5 Testing')) fail('invalid recovery trace target');
  validateRecoveryAuthorization(event.authorization);
  assertObject(event.authorityFingerprints, 'authorityFingerprints');
  if (canonicalJson(Object.keys(event.authorityFingerprints).sort()) !== canonicalJson(['artifacts', ...recoveryAuthorityKeys].sort())) fail('ambiguous recovery authority fingerprints');
  for (const key of recoveryAuthorityKeys) assertHash(event.authorityFingerprints[key], `authorityFingerprints.${key}`);
  assertObject(event.authorityFingerprints.artifacts, 'authorityFingerprints.artifacts');
  for (const hash of Object.values(event.authorityFingerprints.artifacts)) assertHash(hash, 'authority artifact fingerprint');
  if (canonicalJson(event.authorityFingerprints) !== canonicalJson(event.stateMaterialization.fingerprints)) fail('recovery authority fingerprint mismatch');
  if (!event.contextAudit || event.contextAudit.operation !== event.operation
    || canonicalJson(event.contextAudit.references) !== canonicalJson(STRANDED_RECOVERY_AUTHORITY_REFERENCES)) fail('recovery context provenance mismatch');
  if (event.stateMaterialization.status !== 'READY' || event.stateMaterialization.checkpoint?.phase !== event.target
    || event.stateMaterialization.checkpoint?.verdict !== 'BLOCKED' || event.stateMaterialization.checkpoint?.next !== event.target) fail('invalid recovery after state');
  if (previous) {
    if (previous.change !== event.change || previous.sequence !== event.previousSequence
      || previous.stateMaterialization.status !== 'HUMAN_HANDOFF'
       || previous.stateMaterialization.checkpoint?.phase !== (stranded ? STRANDED_RECOVERY_TARGET : 'Apply 7.4 Integration')
      || previous.stateMaterialization.checkpoint?.verdict !== 'BLOCKED'
      || previous.stateMaterialization.checkpoint?.next !== null
      || previous.stateMaterialization.checkpoint?.artifact !== event.stateMaterialization.checkpoint?.artifact
      || canonicalJson(previous.stateMaterialization.attempts) !== canonicalJson(event.stateMaterialization.attempts)
      || canonicalJson(previous.stateMaterialization.fingerprints) !== canonicalJson(event.authorityFingerprints)) fail('invalid recovery source provenance');
  }
}

function validateDispatchMaterializationRequest(input) {
  assertObject(input, 'materialization recovery request');
  const allowed = new Set(['root', 'change', 'canonicalPath', 'expectedSequence', 'target', 'authorityRefs', 'fingerprints', 'authorization', 'blockedOutcome']);
  if (!own(input, allowed)) fail('unknown materialization recovery request field');
  if (input.target !== 'Apply 7.5 Testing') fail('invalid materialization recovery target');
  validateRecoveryAuthorization(input.authorization);
  validateRecoveryAuthorities(input.authorityRefs);
  validateOutcomePacket(input.blockedOutcome);
  if (input.blockedOutcome.status !== 'BLOCKED' || input.blockedOutcome.action !== input.target
    || input.blockedOutcome.role !== 'MID' || input.blockedOutcome.blocker.class !== RECOVERABLE_HANDOFF_CLASS
    || input.blockedOutcome.blocker.resume_phase !== input.target || input.blockedOutcome.next !== input.target) fail('non-recoverable blocked evidence');
  if (!input.blockedOutcome.artifacts.length || !input.blockedOutcome.evidence.length) fail('blocked evidence must identify an artifact and evidence');
  if (input.expectedSequence !== 21) fail('materialization recovery is limited to sequence 21');
  const identity = validateIdentity({ root: input.root, change: input.change, canonicalPath: input.canonicalPath });
  assertObject(input.fingerprints, 'fingerprints');
  if (canonicalJson(Object.keys(input.fingerprints).sort()) !== canonicalJson(['artifacts', ...recoveryAuthorityKeys].sort())) fail('ambiguous recovery fingerprints');
  for (const key of recoveryAuthorityKeys) assertHash(input.fingerprints[key], `fingerprints.${key}`);
  assertObject(input.fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(input.fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  return identity;
}

/** Recover only the demonstrated sequence-21 dispatch materialization defect. */
export async function recoverDispatchMaterialization(input = {}) {
  const identity = validateDispatchMaterializationRequest(input);
  const { change, expectedSequence, authorityRefs, fingerprints, authorization, blockedOutcome } = input;
  const runtimePath = join(identity.changePath, '.sdd-runtime');
  const lockPath = join(runtimePath, 'dispatch-materialization-recovery.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); } catch (error) { if (error.code === 'EEXIST') fail('concurrent recovery request'); throw error; }
  try {
    const state = JSON.parse(await readFile(join(runtimePath, 'state.json'), 'utf8'));
    validateRuntimeState(state);
    if (state.change !== change || state.canonicalPath !== identity.changePath || state.sequence !== expectedSequence || state.status !== 'HUMAN_HANDOFF') fail('stale materialization recovery checkpoint');
    if (state.checkpoint.phase !== 'Apply 7.4 Integration' || state.checkpoint.verdict !== 'BLOCKED' || state.checkpoint.next !== null) fail('materialization checkpoint mismatch');
    if (canonicalJson(state.fingerprints) !== canonicalJson(fingerprints)) fail('recovery fingerprint mismatch');
    const actual = await fingerprintFiles(Object.values(authorityRefs).map((path) => join(identity.root, path)));
    const actualByKey = Object.fromEntries(Object.entries(authorityRefs).map(([key, path]) => [key, actual[join(identity.root, path)]]));
    if (canonicalJson(actualByKey) !== canonicalJson(Object.fromEntries([...recoveryAuthorityKeys].map((key) => [key, fingerprints[key]])))) fail('authority fingerprint mismatch');
    const events = await readTrace(identity.changePath);
    if (events.length !== expectedSequence || events.at(-1)?.sequence !== expectedSequence) fail('recovery trace sequence mismatch');
    if (events.some((event) => event.change !== change)) fail('foreign recovery trace event');
    const predecessor = events.at(-2); const handoff = events.at(-1);
    if (!predecessor || predecessor.action !== 'Apply 7.4 Integration' || predecessor.role !== 'MID'
      || predecessor.stateMaterialization.status !== 'READY' || predecessor.stateMaterialization.checkpoint?.verdict !== 'PASS'
      || predecessor.stateMaterialization.checkpoint?.next !== 'Apply 7.5 Testing') fail('dispatch predecessor evidence mismatch');
    if (handoff.action !== 'Apply 7.5 Testing' || handoff.role !== 'MID'
      || handoff.stateMaterialization.status !== 'HUMAN_HANDOFF'
      || handoff.stateMaterialization.checkpoint?.phase !== 'Apply 7.4 Integration'
      || handoff.stateMaterialization.checkpoint?.verdict !== 'BLOCKED'
      || handoff.stateMaterialization.checkpoint?.next !== null
      || handoff.stateMaterialization.lastTransition?.action !== handoff.action
      || handoff.stateMaterialization.lastTransition?.inputHash !== handoff.inputHash
      || handoff.stateMaterialization.lastTransition?.outcomeHash !== handoff.outcomeHash
      || canonicalJson(materialization({ ...handoff.stateMaterialization, schemaVersion: 2, change, canonicalPath: identity.changePath, traceCursor: { sequence: handoff.sequence, eventHash: handoff.eventHash, chainHash: handoff.chainHash } })) !== canonicalJson(materialization(state))) fail('dispatch handoff evidence mismatch');
    if (state.traceCursor.eventHash !== handoff.eventHash || state.traceCursor.chainHash !== handoff.chainHash) fail('state and handoff cursor mismatch');
    const normalizedBlockedOutcome = safeValidateOutcome(blockedOutcome);
    if (hashObject(blockedOutcome) !== handoff.inputHash) fail('blocked evidence input provenance mismatch');
    if (hashObject(normalizedBlockedOutcome) !== handoff.outcomeHash) fail('blocked evidence does not match originating outcome');
    if (blockedOutcome.checkpointArtifact !== handoff.stateMaterialization.checkpoint?.artifact) fail('blocked evidence artifact mismatch');
    const after = validateRuntimeState({ ...state, status: 'READY', sequence: expectedSequence + 1,
      checkpoint: { phase: blockedOutcome.action, artifact: blockedOutcome.checkpointArtifact, verdict: 'BLOCKED', next: blockedOutcome.action },
      traceCursor: { sequence: expectedSequence + 1, eventHash: null, chainHash: null },
      lastTransition: { action: blockedOutcome.action, inputHash: handoff.inputHash, outcomeHash: handoff.outcomeHash, afterStateHash: hashObject({ operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION, sourceEventHash: handoff.eventHash, target: blockedOutcome.action }) } });
    const event = createTraceEvent({ change, sequence: after.sequence, action: blockedOutcome.action, role: 'HUMAN', inputHash: after.lastTransition.inputHash, outcomeHash: after.lastTransition.outcomeHash, beforeState: state, afterState: after, operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION, previousSequence: expectedSequence, newSequence: after.sequence, sourceStatus: 'HUMAN_HANDOFF', target: blockedOutcome.action, authorization, authorityFingerprints: state.fingerprints, contextAudit: { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: authorityRefs, operation: DISPATCH_MATERIALIZATION_RECOVERY_OPERATION, actor: authorization.actor, approval: authorization.approval } });
    validateTraceSequence([...events, event]);
    return { ...(await persistTransition({ changePath: identity.changePath, event, state: after })), state: validateRuntimeState({ ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } }), event };
  } finally { await lock.close(); await unlink(lockPath).catch(() => {}); }
}

async function readTrace(changePath) {
  const tracePath = join(changePath, '.sdd-runtime', 'trace');
  let names;
  try { names = await readdir(tracePath); } catch (error) { if (error.code === 'ENOENT') fail('missing recovery trace'); throw error; }
  const events = [];
  for (const name of names) {
    if (!/^\d{20}-[a-f0-9]{64}\.json$/.test(name)) fail('ambiguous recovery trace');
    const event = JSON.parse(await readFile(join(tracePath, name), 'utf8'));
    validateTraceEvent(event);
    if (name !== `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`) fail('trace filename provenance mismatch');
    events.push(event);
  }
  return validateTraceSequence(events);
}

/**
 * Reopen exactly one proven stranded Apply 7.3 handoff. This is deliberately
 * HUMAN-only, append-only, and does not inspect executor payloads.
 */
export async function recoverStrandedCheckpoint(input = {}) {
  assertObject(input, 'recovery request');
  const allowed = new Set(['root', 'change', 'canonicalPath', 'expectedSequence', 'target', 'authorityRefs', 'fingerprints', 'authorization']);
  if (!own(input, allowed)) fail('unknown recovery request field');
  const { root, change, canonicalPath, expectedSequence, target, authorityRefs, fingerprints, authorization } = input;
  if (typeof canonicalPath !== 'string' || !canonicalPath.trim()) fail('invalid recovery canonical path');
  const identity = validateIdentity({ root, change, canonicalPath });
  if (target !== STRANDED_RECOVERY_TARGET) fail('invalid recovery target');
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 1) fail('invalid expected sequence');
  validateRecoveryAuthorization(authorization);
  validateRecoveryAuthorities(authorityRefs);
  assertObject(fingerprints, 'fingerprints');
  if (canonicalJson(Object.keys(fingerprints).sort()) !== canonicalJson(['artifacts', ...recoveryAuthorityKeys].sort())) fail('ambiguous recovery fingerprints');
  for (const key of recoveryAuthorityKeys) assertHash(fingerprints[key], `fingerprints.${key}`);
  assertObject(fingerprints.artifacts, 'fingerprints.artifacts');
  for (const hash of Object.values(fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');

  const runtimePath = join(identity.changePath, '.sdd-runtime');
  const lockPath = join(runtimePath, 'stranded-recovery.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); } catch (error) { if (error.code === 'EEXIST') fail('concurrent recovery request'); throw error; }
  try {
    let state;
    try { state = JSON.parse(await readFile(join(runtimePath, 'state.json'), 'utf8')); } catch (error) { throw new TypeError(`recovery state read failed: ${error.message}`); }
    validateRuntimeState(state);
    if (state.change !== change || state.canonicalPath !== identity.changePath) fail('recovery identity mismatch');
    if (state.sequence !== expectedSequence || state.status !== 'HUMAN_HANDOFF') fail('stale recovery checkpoint');
    if (state.checkpoint.phase !== STRANDED_RECOVERY_TARGET || state.checkpoint.verdict !== 'BLOCKED' || state.checkpoint.next !== null) fail('recovery checkpoint is not a blocked handoff');
    if (canonicalJson(state.fingerprints) !== canonicalJson(fingerprints)) fail('recovery fingerprint mismatch');
    const recomputed = await fingerprintFiles(Object.values(authorityRefs).map((path) => join(identity.root, path)));
    const recomputedByKey = Object.fromEntries(Object.entries(authorityRefs).map(([key, path]) => [key, recomputed[join(identity.root, path)]]));
    if (canonicalJson(recomputedByKey) !== canonicalJson(Object.fromEntries([...recoveryAuthorityKeys].map((key) => [key, fingerprints[key]])))) fail('authority fingerprint mismatch');

    const events = await readTrace(identity.changePath);
    if (events.length !== expectedSequence || events.at(-1)?.sequence !== expectedSequence) fail('recovery trace sequence mismatch');
    if (events.some((event) => event.change !== change)) fail('foreign recovery trace event');
    const predecessor = events.at(-2);
    const handoff = events.at(-1);
    if (!predecessor || predecessor.sequence !== expectedSequence - 1 || predecessor.action !== 'Apply 7.2 Core Engine'
      || predecessor.role !== 'MID' || predecessor.stateMaterialization.status !== 'READY'
      || predecessor.stateMaterialization.checkpoint?.verdict !== 'PASS'
      || predecessor.stateMaterialization.checkpoint?.next !== STRANDED_RECOVERY_TARGET) fail('missing accepted Apply 7.2 predecessor evidence');
    if (handoff.change !== change || handoff.action !== STRANDED_RECOVERY_TARGET || handoff.role !== 'MID' || handoff.stateMaterialization.status !== 'HUMAN_HANDOFF'
      || handoff.stateMaterialization.checkpoint?.phase !== STRANDED_RECOVERY_TARGET || handoff.stateMaterialization.checkpoint?.artifact !== state.checkpoint.artifact
      || handoff.stateMaterialization.checkpoint?.verdict !== 'BLOCKED' || handoff.stateMaterialization.checkpoint?.next !== null) fail('current handoff evidence mismatch');
    const traceState = validateRuntimeState({ ...handoff.stateMaterialization, schemaVersion: RUNTIME_SCHEMA_VERSION, change, canonicalPath: identity.changePath, traceCursor: { sequence: handoff.sequence, eventHash: handoff.eventHash, chainHash: handoff.chainHash } });
    if (canonicalJson(materialization(traceState)) !== canonicalJson(materialization(state))) fail('state and handoff materialization mismatch');
    if (state.traceCursor.eventHash !== handoff.eventHash || state.traceCursor.chainHash !== handoff.chainHash) fail('state and handoff cursor mismatch');

    const inputHash = hashObject({ operation: STRANDED_RECOVERY_OPERATION, root: identity.root, change, canonicalPath: identity.changePath, expectedSequence, target, authorityRefs, fingerprints, authorization });
    const outcomeHash = hashObject({ operation: STRANDED_RECOVERY_OPERATION, sourceSequence: expectedSequence, sourceEventHash: handoff.eventHash, target, authorization });
    const after = validateRuntimeState({ ...state, status: 'READY', sequence: expectedSequence + 1,
      checkpoint: { phase: STRANDED_RECOVERY_TARGET, artifact: state.checkpoint.artifact, verdict: 'BLOCKED', next: STRANDED_RECOVERY_TARGET },
      traceCursor: { sequence: expectedSequence + 1, eventHash: null, chainHash: null },
      lastTransition: { inputHash, outcomeHash, afterStateHash: hashObject({ operation: STRANDED_RECOVERY_OPERATION, sequence: expectedSequence + 1, target }) },
    });
    const event = createTraceEvent({ change, sequence: expectedSequence + 1, action: STRANDED_RECOVERY_TARGET, role: 'HUMAN',
      inputHash, outcomeHash, beforeState: state, afterState: after, operation: STRANDED_RECOVERY_OPERATION,
      previousSequence: expectedSequence, newSequence: expectedSequence + 1, sourceStatus: 'HUMAN_HANDOFF', target, authorization,
      authorityFingerprints: state.fingerprints,
      contextAudit: { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: authorityRefs, operation: STRANDED_RECOVERY_OPERATION, actor: authorization.actor, approval: authorization.approval } });
    return { ...(await persistTransition({ changePath: identity.changePath, event, state: after })), state: validateRuntimeState({ ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } }), event };
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

export function resolveRoute({ role, requiredCapability, minimumQuality = 0, candidates = [] } = {}) {
  if (!LOGICAL_ROLES.has(role) || role === 'HUMAN') fail('invalid routable role');
  const rejected = [];
  const compatible = candidates.filter((candidate) => {
    if (candidate.role !== role) { rejected.push({ id: candidate.id, reason: 'role-mismatch' }); return false; }
    if (!Array.isArray(candidate.capabilities) || !candidate.capabilities.includes(requiredCapability)) { rejected.push({ id: candidate.id, reason: 'capability-mismatch' }); return false; }
    if (candidate.available === false) { rejected.push({ id: candidate.id, reason: 'provider-unavailable' }); return false; }
    if ((candidate.quality ?? 1) < minimumQuality) { rejected.push({ id: candidate.id, reason: 'quality-below-minimum' }); return false; }
    if (!Number.isFinite(candidate.cost)) { rejected.push({ id: candidate.id, reason: 'invalid-cost' }); return false; }
    return true;
  }).sort((a, b) => a.cost - b.cost);
  if (!compatible[0]) fail('no compatible route');
  return { configured: role, resolved: compatible[0].id, rejections: rejected, considered: candidates.map((candidate) => candidate.id), candidates: compatible.map((candidate) => candidate.id) };
}

export async function resolveConfiguredRoute({ modelMapPath, modelMap, role, requiredCapability, minimumQuality = 0 } = {}) {
  if (!modelMap && typeof modelMapPath === 'string') modelMap = JSON.parse(await readFile(modelMapPath, 'utf8'));
  assertObject(modelMap, 'modelMap');
  const routing = modelMap.runtime_routing;
  assertObject(routing, 'modelMap.runtime_routing');
  const primaryId = routing.primary?.[role];
  const fallbackIds = routing.fallbacks?.[role];
  const records = routing.candidates?.[role];
  if (typeof primaryId !== 'string' || !Array.isArray(fallbackIds) || !Array.isArray(records)) fail('configured route metadata missing');
  const byId = new Map(records.map((candidate) => [candidate.id, candidate]));
  const ids = [primaryId, ...fallbackIds];
  const candidates = ids.map((id) => byId.get(id)).filter(Boolean);
  if (candidates.length !== ids.length) fail('configured route candidate missing');
  return resolveRoute({ role, requiredCapability, minimumQuality, candidates });
}

export function validateRoute(route) {
  assertObject(route, 'route');
  if (typeof route.configured !== 'string' || typeof route.resolved !== 'string' || !Array.isArray(route.rejections)) fail('invalid route');
  return route;
}

export { HUMAN_CLASSES, AUTO_CLASSES };
