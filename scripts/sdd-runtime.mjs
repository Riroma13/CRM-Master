#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, open, readFile, rename, link, unlink, readdir, rmdir, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

export const CHANGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const RUNTIME_SCHEMA_VERSION = 2;
export const TRACE_SCHEMA_VERSION = 1;
export const HUMAN_REOPEN_OPERATION = 'HUMAN_REOPEN';
export const HUMAN_PROVENANCE_RESET_OPERATION = 'HUMAN_PROVENANCE_RESET';
export const LOGICAL_ROLES = new Set(['HIGH', 'MID', 'LOW', 'HUMAN']);
export const RUNTIME_STATUSES = new Set(['READY', 'RUNNING', 'BLOCKED', 'HUMAN_HANDOFF', 'COMPLETED']);
export const CANONICAL_ACTIONS = new Set([
  'Design', 'Architecture Review', 'Design Refinement', 'Tasks', 'Tasks Review',
  'Tasks Refinement', 'Workload Guard', 'Apply 7.1 Foundation', 'Apply 7.2 Core Engine',
  'Apply 7.3 Feature Implementation', 'Apply 7.4 Integration', 'Apply 7.5 Testing',
  'Apply 7.6 Apply Summary', 'Verify', 'Archive', 'Health Report', 'Repository Ready',
]);

const HUMAN_CLASSES = new Set([
  'HUMAN_ARCHITECTURE', 'HUMAN_SECURITY', 'HUMAN_SCOPE', 'HUMAN_GIT',
  'HUMAN_RISK_ACCEPTANCE', 'HUMAN_INFRASTRUCTURE', 'FATAL_INVARIANT',
]);
const AUTO_CLASSES = new Set([
  'AUTO_RETRY', 'AUTO_REFINE', 'AUTO_RECOVER', 'ENVIRONMENT_RECOVERABLE', 'PROVIDER_FALLBACK',
]);
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
const commitPattern = /^[a-f0-9]{40}$/;
const execFile = promisify(execFileCallback);
const FINGERPRINT_ARTIFACT_PATHS = Object.freeze({ workflow: 'docs/SDD-WORKFLOW.md', modelMap: '.opencode/sdd-model-map.json', config: 'openspec/config.yaml' });
const CONTINUITY_VALUES = new Set(['UNPROVEN', 'ESTABLISHED']);
const AUTHORITY_VALUES = new Set(['HUMAN / MAINTAINER', 'SYSTEM / BOOTSTRAP', 'SYSTEM / VALIDATED']);

function fingerprintReference(key) {
  if (typeof key !== 'string' || !key.trim() || key.includes('*') || key.includes('..')) fail('invalid fingerprint key');
  if (key.startsWith('artifacts.')) {
    const artifactKey = key.slice('artifacts.'.length);
    if (!artifactKey || isAbsolute(artifactKey) || artifactKey.split('/').includes('..')) fail('invalid artifact fingerprint key');
    return { key, container: 'artifacts', entry: artifactKey, artifactPath: artifactKey };
  }
  if (key === 'artifacts' || key.includes('.')) fail('invalid fingerprint key');
  return { key, container: 'root', entry: key, artifactPath: FINGERPRINT_ARTIFACT_PATHS[key] ?? null };
}

function fingerprintValue(fingerprints, reference) {
  return reference.container === 'artifacts' ? fingerprints.artifacts[reference.entry] : fingerprints[reference.entry];
}

function replaceFingerprint(fingerprints, reference, value) {
  if (reference.container === 'artifacts') return { ...fingerprints, artifacts: { ...fingerprints.artifacts, [reference.entry]: value } };
  return { ...fingerprints, [reference.entry]: value };
}

function validateProvenance(provenance, fingerprints) {
  assertObject(provenance, 'fingerprintProvenance');
  for (const [key, item] of Object.entries(provenance)) {
    const reference = fingerprintReference(key);
    assertObject(item, `fingerprintProvenance.${key}`);
    if (!own(item, new Set(['artifactPath', 'rawSha256', 'commit', 'branch', 'dirty', 'timestamp', 'continuity', 'authority']))) fail('invalid fingerprint provenance fields');
    if (typeof item.artifactPath !== 'string' || isAbsolute(item.artifactPath) || !item.artifactPath || item.artifactPath.split('/').includes('..') || item.artifactPath.includes('*')) fail('invalid provenance artifact path');
    if (reference.artifactPath !== null && item.artifactPath !== reference.artifactPath) fail('provenance key/path mismatch');
    assertHash(item.rawSha256, `fingerprintProvenance.${key}.rawSha256`);
    if (fingerprints && fingerprintValue(fingerprints, reference) !== item.rawSha256) fail('provenance hash does not match fingerprint');
    if (typeof item.commit !== 'string' || !commitPattern.test(item.commit)) fail('invalid provenance commit');
    if (typeof item.branch !== 'string' || !item.branch.trim()) fail('invalid provenance branch');
    if (typeof item.dirty !== 'boolean') fail('invalid provenance dirty state');
    if (typeof item.timestamp !== 'string' || Number.isNaN(Date.parse(item.timestamp))) fail('invalid provenance timestamp');
    if (!CONTINUITY_VALUES.has(item.continuity) || !AUTHORITY_VALUES.has(item.authority)) fail('invalid provenance continuity or authority');
  }
  return provenance;
}

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

export function buildInitialState({ root, change, fingerprints, provenance } = {}) {
  const identity = validateIdentity({ root, change });
  const legacyProvenance = fingerprints?.provenance;
  const { provenance: _legacy, ...baseFingerprints } = fingerprints ?? {};
  const completeFingerprints = { artifacts: {}, ...baseFingerprints };
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(completeFingerprints[key], `fingerprints.${key}`);
  const suppliedProvenance = provenance ?? legacyProvenance;
  if (provenance && legacyProvenance && canonicalJson(provenance) !== canonicalJson(legacyProvenance)) fail('conflicting explicit and legacy provenance');
  if (suppliedProvenance) validateProvenance(suppliedProvenance, completeFingerprints);
  return validateRuntimeState({
    schemaVersion: RUNTIME_SCHEMA_VERSION, change, canonicalPath: identity.changePath, status: 'READY', sequence: 0,
    checkpoint: { phase: null, artifact: null, verdict: null, next: 'Design' }, fingerprints: completeFingerprints,
    attempts: {}, traceCursor: { sequence: 0, eventHash: null, chainHash: null }, lastTransition: null,
    ...(suppliedProvenance ? { fingerprintProvenance: suppliedProvenance } : {}),
  });
}

export async function bootstrapChange({ root, change, fingerprints, provenance } = {}) {
  const identity = validateIdentity({ root, change });
  const initialState = buildInitialState({ root, change, fingerprints, provenance });
  let created = false;

  try {
    await stat(identity.changePath);
  } catch (error) {
    if (error.code === 'ENOENT' && initialState.fingerprintProvenance === undefined) fail('new bootstrap requires explicit provenance');
    if (error.code !== 'ENOENT') throw error;
  }

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
  if (existing.fingerprintProvenance !== undefined && initialState.fingerprintProvenance === undefined) {
    throw new TypeError('bootstrap provenance conflict: existing metadata requires explicit provenance');
  }
  if (initialState.fingerprintProvenance !== undefined
      && canonicalJson(initialState.fingerprintProvenance) !== canonicalJson(existing.fingerprintProvenance ?? null)) {
    throw new TypeError('bootstrap provenance conflict: fingerprint provenance mismatch');
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
  if (!own(packet, new Set(['change', 'action', 'role', 'status', 'artifacts', 'evidence', 'next', 'blocker']))) fail('unknown outcome field');
  validateChangeName(packet.change);
  if (!CANONICAL_ACTIONS.has(packet.action) || !LOGICAL_ROLES.has(packet.role)) fail('invalid outcome action or role');
  if (PHASE_ROLES[packet.action] !== packet.role) fail(`outcome role must match canonical role for ${packet.action}`);
  if (!['PASS', 'BLOCKED', 'FAILED'].includes(packet.status) || !Array.isArray(packet.artifacts) || !packet.artifacts.every((item) => typeof item === 'string') || !Array.isArray(packet.evidence) || !packet.evidence.every((item) => typeof item === 'string')) fail('invalid outcome shape');
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
      role: 'HUMAN', status: 'HUMAN_HANDOFF', artifacts: [], evidence: [error.message], next: null,
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
  if (!own(state, new Set(['schemaVersion', 'change', 'canonicalPath', 'status', 'sequence', 'checkpoint', 'fingerprints', 'fingerprintProvenance', 'gitReadiness', 'attempts', 'traceCursor', 'lastTransition']))) fail('unknown state field');
  if (state.schemaVersion !== RUNTIME_SCHEMA_VERSION) fail('unsupported state schema');
  validateChangeName(state.change);
  if (typeof state.canonicalPath !== 'string' || !isAbsolute(state.canonicalPath)) fail('invalid state canonicalPath');
  if (!RUNTIME_STATUSES.has(state.status) || !Number.isSafeInteger(state.sequence) || state.sequence < 0) fail('invalid state status or sequence');
  validateCheckpoint(state.checkpoint);
  assertObject(state.fingerprints, 'fingerprints');
  for (const key of ['workflow', 'modelMap', 'config']) assertHash(state.fingerprints[key], `fingerprints.${key}`);
  assertObject(state.fingerprints.artifacts, 'fingerprints.artifacts');
  for (const [key, hash] of Object.entries(state.fingerprints)) if (key !== 'artifacts') assertHash(hash, `fingerprints.${key}`);
  for (const hash of Object.values(state.fingerprints.artifacts)) assertHash(hash, 'artifact fingerprint');
  if (state.fingerprintProvenance !== undefined) validateProvenance(state.fingerprintProvenance, state.fingerprints);
  if (state.gitReadiness !== undefined && state.gitReadiness !== 'INVALIDATED') fail('invalid Git readiness');
  assertObject(state.attempts, 'attempts');
  if (Object.values(state.attempts).some((attempt) => !Number.isSafeInteger(attempt) || attempt < 0)) fail('invalid attempts');
  assertObject(state.traceCursor, 'traceCursor');
  if (state.traceCursor.sequence !== state.sequence) fail('trace cursor sequence mismatch');
  if (state.traceCursor.eventHash !== null) assertHash(state.traceCursor.eventHash, 'trace cursor eventHash');
  if (state.traceCursor.chainHash !== null) assertHash(state.traceCursor.chainHash, 'trace cursor chainHash');
  if (state.lastTransition !== null) {
    assertObject(state.lastTransition, 'lastTransition');
    for (const key of ['inputHash', 'outcomeHash', 'afterStateHash']) assertHash(state.lastTransition[key], `lastTransition.${key}`);
    if (state.lastTransition.operation !== undefined) {
      if (![HUMAN_REOPEN_OPERATION, HUMAN_PROVENANCE_RESET_OPERATION].includes(state.lastTransition.operation) || typeof state.lastTransition.action !== 'string' || !CANONICAL_ACTIONS.has(state.lastTransition.action)) fail('invalid runtime operation lastTransition');
    }
  }
  return state;
}

function materialization(state) {
  return { status: state.status, sequence: state.sequence, checkpoint: state.checkpoint, fingerprints: state.fingerprints, ...(state.fingerprintProvenance ? { fingerprintProvenance: state.fingerprintProvenance } : {}), ...(state.gitReadiness ? { gitReadiness: state.gitReadiness } : {}), attempts: state.attempts, traceCursor: state.traceCursor, lastTransition: state.lastTransition };
}

export function createTraceEvent({ change, sequence, action, role, inputHash, outcomeHash, beforeState, afterState, route = { configured: role, resolved: role, rejections: [] }, contextAudit = { bootstrapReadCount: 1, normalPhaseBootstrapReadCount: 0, references: {} }, timestamp = new Date().toISOString(), operation, previousSequence, newSequence, sourceStatus, target, reason, authorization, authorityFingerprints, gitReadiness, affectedKey, affectedPath, oldFingerprint, newFingerprint, continuity, resetAuthority, currentCommit, currentBranch, currentDirtyState, validationEvidence }) {
  validateChangeName(change);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || !CANONICAL_ACTIONS.has(action)) fail('invalid trace sequence or action');
  if (!LOGICAL_ROLES.has(role)) fail('invalid trace role');
  assertHash(inputHash, 'inputHash'); assertHash(outcomeHash, 'outcomeHash');
  validateRuntimeState(beforeState); validateRuntimeState(afterState);
  if (operation !== undefined && (![HUMAN_REOPEN_OPERATION, HUMAN_PROVENANCE_RESET_OPERATION].includes(operation) || role !== 'HUMAN' || target !== action)) fail('invalid runtime operation or role');
  if (operation === HUMAN_PROVENANCE_RESET_OPERATION && canonicalJson(authorityFingerprints) !== canonicalJson(beforeState.fingerprints)) fail('HUMAN_PROVENANCE_RESET authority fingerprints must match source state');
  const event = { schemaVersion: TRACE_SCHEMA_VERSION, sequence, idempotencyKey: sha256(`${change}${sequence}${action}${inputHash}`), previousEventHash: beforeState.traceCursor.eventHash, chainHash: '', change, action, role, inputHash, outcomeHash, route, beforeStateHash: hashObject(materialization(beforeState)), afterStateHash: hashObject(materialization(afterState)), stateMaterialization: materialization(afterState), contextAudit, timestamp };
  if (operation !== undefined) Object.assign(event, { operation, previousSequence, newSequence, sourceStatus, target, reason, authorization, authorityFingerprints, gitReadiness, ...(operation === HUMAN_PROVENANCE_RESET_OPERATION ? { affectedKey, affectedPath, oldFingerprint, newFingerprint, continuity, resetAuthority, currentCommit, currentBranch, currentDirtyState, validationEvidence } : {}) });
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
  if (event.operation !== undefined) {
    if (![HUMAN_REOPEN_OPERATION, HUMAN_PROVENANCE_RESET_OPERATION].includes(event.operation) || event.role !== 'HUMAN' || event.target !== event.action || event.previousSequence !== event.sequence - 1 || event.newSequence !== event.sequence) fail('invalid runtime trace metadata');
    if (event.sourceStatus !== 'HUMAN_HANDOFF' || typeof event.target !== 'string' || !CANONICAL_ACTIONS.has(event.target)) fail('invalid HUMAN_REOPEN source or target');
    if (typeof event.reason !== 'string' || !event.reason.trim() || event.reason.length > 2000) fail('invalid runtime operation reason');
    validateHumanAuthorization(event.authorization);
    assertObject(event.authorityFingerprints, 'authority fingerprints');
    for (const key of ['workflow', 'modelMap', 'config']) assertHash(event.authorityFingerprints[key], `authorityFingerprints.${key}`);
    if (event.gitReadiness !== 'INVALIDATED') fail('runtime operation must invalidate Git readiness');
    const after = event.stateMaterialization;
    if (event.operation === HUMAN_REOPEN_OPERATION) {
      if (after.status !== 'READY' || after.checkpoint.phase !== event.target || after.checkpoint.verdict !== 'BLOCKED' || after.checkpoint.next !== event.target) fail('invalid HUMAN_REOPEN after materialization');
    } else {
      if (after.status !== 'HUMAN_HANDOFF' || after.checkpoint.next !== null || event.continuity !== 'UNPROVEN' || event.resetAuthority !== 'HUMAN / MAINTAINER') fail('invalid HUMAN_PROVENANCE_RESET after materialization');
      const reference = fingerprintReference(event.affectedKey);
      if (reference.artifactPath !== null && event.affectedPath !== reference.artifactPath) fail('invalid provenance reset key or path');
      if (typeof event.affectedPath !== 'string' || isAbsolute(event.affectedPath) || !event.affectedPath || event.affectedPath.split('/').includes('..') || event.affectedPath.includes('*')) fail('invalid provenance reset artifact path');
      assertHash(event.oldFingerprint, 'oldFingerprint'); assertHash(event.newFingerprint, 'newFingerprint');
      if (event.oldFingerprint === event.newFingerprint || fingerprintValue(after.fingerprints, reference) !== event.newFingerprint || !commitPattern.test(event.currentCommit) || typeof event.currentBranch !== 'string' || !event.currentBranch.trim() || typeof event.currentDirtyState !== 'boolean' || !Array.isArray(event.validationEvidence) || !event.validationEvidence.length || event.validationEvidence.some((item) => typeof item !== 'string' || !item.trim())) fail('invalid provenance reset metadata');
      validateHumanAuthorization(event.authorization);
    }
  }
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
    if ([HUMAN_REOPEN_OPERATION, HUMAN_PROVENANCE_RESET_OPERATION].includes(event.operation)) {
      const source = previous?.stateMaterialization;
      if (!source || source.status !== 'HUMAN_HANDOFF' || source.checkpoint.verdict !== 'BLOCKED' || source.checkpoint.next !== null) fail('HUMAN_REOPEN source checkpoint invariant failed');
      const sourceWithCursor = { ...source, traceCursor: { sequence: previous.sequence, eventHash: previous.eventHash, chainHash: previous.chainHash } };
      if (event.beforeStateHash !== hashObject(materialization(sourceWithCursor))) fail('HUMAN_REOPEN source state mismatch');
      if (event.operation === HUMAN_REOPEN_OPERATION && canonicalJson(event.authorityFingerprints) !== canonicalJson(source.fingerprints)) fail('HUMAN_REOPEN authority fingerprint mismatch');
      if (event.operation === HUMAN_PROVENANCE_RESET_OPERATION) {
        const reference = fingerprintReference(event.affectedKey);
        if (canonicalJson(event.authorityFingerprints) !== canonicalJson(source.fingerprints)) fail('HUMAN_PROVENANCE_RESET authority fingerprint mismatch');
        if (fingerprintValue(source.fingerprints, reference) !== event.oldFingerprint) fail('provenance reset old fingerprint mismatch');
        const after = event.stateMaterialization;
        if (after.sequence !== source.sequence + 1 || after.status !== source.status || canonicalJson(after.checkpoint) !== canonicalJson(source.checkpoint) || canonicalJson(after.attempts) !== canonicalJson(source.attempts)) fail('provenance reset state transition mismatch');
        if (canonicalJson(after.fingerprints) !== canonicalJson(replaceFingerprint(source.fingerprints, reference, event.newFingerprint))) fail('provenance reset fingerprint transition mismatch');
        if (after.gitReadiness !== 'INVALIDATED' || !after.fingerprintProvenance?.[event.affectedKey]) fail('provenance reset readiness or provenance missing');
        validateProvenance(after.fingerprintProvenance, after.fingerprints);
      }
    }
    previous = event;
  }
  return ordered;
}

function validateHumanAuthorization(authorization) {
  assertObject(authorization, 'authorization');
  if (!own(authorization, new Set(['actor', 'role', 'scope']))) fail('invalid authorization metadata');
  if (authorization.actor !== 'HUMAN' || authorization.role !== 'MAINTAINER') fail('authorization must identify HUMAN MAINTAINER');
  if (typeof authorization.scope !== 'string' || !authorization.scope.trim() || authorization.scope.length > 500) fail('invalid authorization scope');
  return authorization;
}

export async function reopenHumanHandoff({ root, change, expectedSequence, expectedStatus, target, reason, authorization } = {}) {
  const input = { root, change, expectedSequence, expectedStatus, target, reason, authorization };
  if (!own(input, new Set(['root', 'change', 'expectedSequence', 'expectedStatus', 'target', 'reason', 'authorization']))) fail('invalid HUMAN_REOPEN input');
  const identity = validateIdentity({ root, change });
  if (expectedStatus !== 'HUMAN_HANDOFF') fail('expectedStatus must be HUMAN_HANDOFF');
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 0) fail('invalid expectedSequence');
  if (typeof target !== 'string' || !CANONICAL_ACTIONS.has(target)) fail('invalid reopen target');
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 2000) fail('invalid reopen reason');
  validateHumanAuthorization(authorization);

  const runtimePath = join(identity.changePath, '.sdd-runtime');
  const lockPath = join(runtimePath, 'human-reopen.lock');
  try {
    await mkdir(lockPath);
  } catch (error) {
    if (error.code === 'EEXIST') fail('HUMAN_REOPEN concurrency conflict');
    throw error;
  }
  try {
    const statePath = join(runtimePath, 'state.json');
    let state;
    try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { throw new TypeError(`HUMAN_REOPEN state read failed: ${error.message}`); }
    validateRuntimeState(state);
    if (state.change !== change || state.canonicalPath !== identity.changePath) fail('HUMAN_REOPEN identity mismatch');
    if (state.sequence !== expectedSequence) fail('HUMAN_REOPEN expectedSequence is stale');
    if (state.status !== 'HUMAN_HANDOFF' || state.checkpoint.verdict !== 'BLOCKED' || state.checkpoint.next !== null) fail('HUMAN_REOPEN requires a blocked HUMAN_HANDOFF checkpoint');
    if (!state.checkpoint.phase || !CANONICAL_ACTIONS.has(state.checkpoint.phase) || target !== state.checkpoint.phase) fail('HUMAN_REOPEN target must be the current blocked phase');

    let events;
    try {
      const files = (await readdir(join(runtimePath, 'trace'))).filter((file) => file.endsWith('.json')).sort();
      events = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(runtimePath, 'trace', file), 'utf8'))));
      validateTraceSequence(events);
    } catch (error) { throw new TypeError(`HUMAN_REOPEN trace validation failed: ${error.message}`); }
    const last = events.at(-1);
    if (!last || last.sequence !== state.sequence || last.eventHash !== state.traceCursor.eventHash || last.chainHash !== state.traceCursor.chainHash) fail('HUMAN_REOPEN trace/state concurrency conflict');

    const inputHash = hashObject(input);
    const outcomeHash = hashObject({ operation: 'HUMAN_REOPEN', target, reason, authorization });
    const after = validateRuntimeState({
      ...state, status: 'READY', sequence: state.sequence + 1,
      checkpoint: { ...state.checkpoint, next: target },
      traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null },
      lastTransition: { idempotencyKey: idempotencyKey(change, state.sequence + 1, target, inputHash), action: target, operation: HUMAN_REOPEN_OPERATION, inputHash, outcomeHash, afterStateHash: hashObject({ operation: HUMAN_REOPEN_OPERATION, sequence: state.sequence + 1, target }) },
    });
    const event = createTraceEvent({ change, sequence: after.sequence, action: target, role: 'HUMAN', inputHash, outcomeHash, beforeState: state, afterState: after, operation: HUMAN_REOPEN_OPERATION, previousSequence: state.sequence, newSequence: after.sequence, sourceStatus: state.status, target, reason, authorization, authorityFingerprints: state.fingerprints, gitReadiness: 'INVALIDATED' });
    const persisted = await persistTransition({ changePath: identity.changePath, event, state: after });
    return { state: validateRuntimeState({ ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } }), event, ...persisted };
  } finally {
    await rmdir(lockPath).catch(() => {});
  }
}

async function readGitMetadata(root, artifactPath) {
  try {
    const [commit, branch, status] = await Promise.all([
      execFile('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }),
      execFile('git', ['-C', root, 'symbolic-ref', '--quiet', '--short', 'HEAD'], { encoding: 'utf8' }),
      execFile('git', ['-C', root, 'status', '--porcelain', '--', artifactPath], { encoding: 'utf8' }),
    ]);
    return { commit: commit.stdout.trim(), branch: branch.stdout.trim(), dirty: Boolean(status.stdout.trim()) };
  } catch (error) {
    throw new TypeError(`HUMAN_PROVENANCE_RESET Git metadata read failed: ${error.message}`);
  }
}

function validateGitMetadata(metadata) {
  assertObject(metadata, 'Git metadata');
  if (!own(metadata, new Set(['commit', 'branch', 'dirty'])) || !commitPattern.test(metadata.commit) || typeof metadata.branch !== 'string' || !metadata.branch.trim() || typeof metadata.dirty !== 'boolean') fail('malformed Git metadata');
  return metadata;
}

export async function resetHumanProvenance({ root, change, expectedSequence, expectedStatus, key, artifactPath, oldFingerprint, newFingerprint, currentCommit, currentBranch, currentDirtyState, reason, continuityAcknowledgment, authorization, validationEvidence, gitResolver = readGitMetadata } = {}) {
  const input = { root, change, expectedSequence, expectedStatus, key, artifactPath, oldFingerprint, newFingerprint, currentCommit, currentBranch, currentDirtyState, reason, continuityAcknowledgment, authorization, validationEvidence, gitResolver };
  if (!own(input, new Set(['root', 'change', 'expectedSequence', 'expectedStatus', 'key', 'artifactPath', 'oldFingerprint', 'newFingerprint', 'currentCommit', 'currentBranch', 'currentDirtyState', 'reason', 'continuityAcknowledgment', 'authorization', 'validationEvidence', 'gitResolver']))) fail('invalid HUMAN_PROVENANCE_RESET input');
  const identity = validateIdentity({ root, change });
  if (expectedStatus !== 'HUMAN_HANDOFF') fail('expectedStatus must be HUMAN_HANDOFF');
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 0) fail('invalid expectedSequence');
  const reference = fingerprintReference(key);
  if (typeof artifactPath !== 'string' || isAbsolute(artifactPath) || !artifactPath || artifactPath.split('/').includes('..') || artifactPath.includes('*') || (reference.artifactPath !== null && artifactPath !== reference.artifactPath)) fail('invalid provenance artifact path');
  if (typeof currentCommit !== 'string' || !commitPattern.test(currentCommit) || typeof currentBranch !== 'string' || !currentBranch.trim() || typeof currentDirtyState !== 'boolean') fail('invalid current Git metadata');
  assertHash(oldFingerprint, 'oldFingerprint'); assertHash(newFingerprint, 'newFingerprint');
  if (oldFingerprint === newFingerprint) fail('old and new fingerprints must differ');
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 2000) fail('invalid provenance reset reason');
  if (continuityAcknowledgment !== 'UNPROVEN') fail('continuity acknowledgment must be UNPROVEN');
  validateHumanAuthorization(authorization);
  if (!Array.isArray(validationEvidence) || validationEvidence.length === 0 || validationEvidence.some((item) => typeof item !== 'string' || !item.trim())) fail('validation evidence is required');

  const runtimePath = join(identity.changePath, '.sdd-runtime');
  const lockPath = join(runtimePath, 'human-provenance-reset.lock');
  try { await mkdir(lockPath); } catch (error) { if (error.code === 'EEXIST') fail('HUMAN_PROVENANCE_RESET concurrency conflict'); throw error; }
  try {
    const statePath = join(runtimePath, 'state.json');
    let state;
    try { state = JSON.parse(await readFile(statePath, 'utf8')); } catch (error) { throw new TypeError(`HUMAN_PROVENANCE_RESET state read failed: ${error.message}`); }
    validateRuntimeState(state);
    if (state.change !== change || state.canonicalPath !== identity.changePath) fail('HUMAN_PROVENANCE_RESET identity mismatch');
    if (state.sequence !== expectedSequence) fail('HUMAN_PROVENANCE_RESET expectedSequence is stale');
    if (state.status !== 'HUMAN_HANDOFF' || state.checkpoint.next !== null) fail('HUMAN_PROVENANCE_RESET requires HUMAN_HANDOFF');
    if (fingerprintValue(state.fingerprints, reference) !== oldFingerprint) fail('HUMAN_PROVENANCE_RESET old fingerprint mismatch');
    if (state.fingerprintProvenance?.[key] && state.fingerprintProvenance[key].artifactPath !== artifactPath) fail('HUMAN_PROVENANCE_RESET persisted key/path mismatch');
    if (state.fingerprintProvenance?.[key]?.continuity === 'UNPROVEN' && state.fingerprintProvenance[key].authority === 'HUMAN / MAINTAINER') fail('HUMAN_PROVENANCE_RESET duplicate key anchor');
    const files = (await readdir(join(runtimePath, 'trace'))).filter((file) => file.endsWith('.json')).sort();
    const events = await Promise.all(files.map(async (file) => JSON.parse(await readFile(join(runtimePath, 'trace', file), 'utf8'))));
    validateTraceSequence(events);
    const last = events.at(-1);
    if (!last || last.sequence !== state.sequence || last.eventHash !== state.traceCursor.eventHash || last.chainHash !== state.traceCursor.chainHash) fail('HUMAN_PROVENANCE_RESET trace/state concurrency conflict');
    const artifact = resolve(identity.root, artifactPath);
    if (relative(identity.root, artifact).startsWith('..')) fail('provenance artifact escapes root');
    let actualHash;
    try { actualHash = sha256(await readFile(artifact)); } catch (error) { throw new TypeError(`provenance artifact read failed: ${error.message}`); }
    if (actualHash !== newFingerprint) fail('artifact bytes do not match new fingerprint');
    const metadata = validateGitMetadata(await gitResolver(identity.root, artifactPath));
    if (metadata.commit !== currentCommit || metadata.branch !== currentBranch) fail('Git metadata mismatch');
    if (metadata.dirty !== currentDirtyState) fail('dirty-state mismatch');
    const timestamp = new Date().toISOString();
    const target = state.checkpoint.phase;
    if (!target || !CANONICAL_ACTIONS.has(target)) fail('HUMAN_PROVENANCE_RESET requires a canonical checkpoint');
    const { gitResolver: _resolver, ...hashableInput } = input;
    const inputHash = hashObject(hashableInput);
    const outcomeHash = hashObject({ operation: HUMAN_PROVENANCE_RESET_OPERATION, key, artifactPath, oldFingerprint, newFingerprint, continuityAcknowledgment, authorization });
    const provenance = { ...(state.fingerprintProvenance ?? {}), [key]: { artifactPath, rawSha256: newFingerprint, commit: metadata.commit, branch: metadata.branch, dirty: metadata.dirty, timestamp, continuity: 'UNPROVEN', authority: 'HUMAN / MAINTAINER' } };
    const after = validateRuntimeState({ ...state, sequence: state.sequence + 1, fingerprints: replaceFingerprint(state.fingerprints, reference, newFingerprint), fingerprintProvenance: provenance, gitReadiness: 'INVALIDATED', traceCursor: { sequence: state.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { idempotencyKey: idempotencyKey(change, state.sequence + 1, target, inputHash), action: target, operation: HUMAN_PROVENANCE_RESET_OPERATION, inputHash, outcomeHash, afterStateHash: hashObject({ operation: HUMAN_PROVENANCE_RESET_OPERATION, sequence: state.sequence + 1, key, artifactPath, oldFingerprint, newFingerprint }) } });
    const event = createTraceEvent({ change, sequence: after.sequence, action: target, role: 'HUMAN', inputHash, outcomeHash, beforeState: state, afterState: after, operation: HUMAN_PROVENANCE_RESET_OPERATION, previousSequence: state.sequence, newSequence: after.sequence, sourceStatus: state.status, target, reason, authorization, authorityFingerprints: state.fingerprints, gitReadiness: 'INVALIDATED', affectedKey: key, affectedPath: artifactPath, oldFingerprint, newFingerprint, continuity: 'UNPROVEN', resetAuthority: 'HUMAN / MAINTAINER', currentCommit: metadata.commit, currentBranch: metadata.branch, currentDirtyState: metadata.dirty, validationEvidence, timestamp });
    const persisted = await persistTransition({ changePath: identity.changePath, event, state: after });
    return { state: validateRuntimeState({ ...after, traceCursor: { sequence: event.sequence, eventHash: event.eventHash, chainHash: event.chainHash } }), event, ...persisted };
  } finally { await rmdir(lockPath).catch(() => {}); }
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

export function evaluateWorkloadGuard({ estimatedLines, delivery, chainStrategy, exception = false } = {}) {
  if (!Number.isSafeInteger(estimatedLines) || estimatedLines < 0) fail('invalid workload forecast');
  const standing = delivery === 'force-chained' && chainStrategy === 'stacked-to-main' && !exception;
  if (estimatedLines <= 400 || standing) return { status: 'PASS', policy: estimatedLines <= 400 ? 'within-budget' : 'standing-chained-policy', human_required: false };
  return { status: 'HUMAN_HANDOFF', policy: 'true-exception', human_required: true, blocker: { class: 'HUMAN_RISK_ACCEPTANCE', human_required: true, reason: 'workload exception requires maintainer acceptance', resume_phase: 'Workload Guard' } };
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
      const inputHash = hashObject(rawOutcome);
      current = validateRuntimeState({ ...current, status: 'HUMAN_HANDOFF', sequence: current.sequence + 1, checkpoint: { ...current.checkpoint, verdict: 'BLOCKED', next: null }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { idempotencyKey: idempotencyKey(current.change, current.sequence + 1, current.checkpoint.next || 'HUMAN_HANDOFF', inputHash), action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF', blocker: outcome.blocker }) } });
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
      current = validateRuntimeState({ ...current, status: 'HUMAN_HANDOFF', sequence: current.sequence + 1, checkpoint: { phase: outcome.action, artifact: outcome.artifacts.at(-1) ?? null, verdict: outcome.status === 'PASS' ? 'PASS' : 'BLOCKED', next: null }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null }, lastTransition: { idempotencyKey: key, action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ status: 'HUMAN_HANDOFF' }) } });
      return { status: current.status, state: current, duplicate, blocker: transition.blocker };
    }
    current = recordAttempt(current, outcome.action);
    current = validateRuntimeState({ ...current, sequence: current.sequence + 1, checkpoint: { phase: outcome.action, artifact: outcome.artifacts.at(-1) ?? null, verdict: outcome.status, next: transition.action }, lastTransition: { idempotencyKey: key, action: outcome.action, inputHash, outcomeHash: hashObject(outcome), afterStateHash: hashObject({ action: transition.action }) }, traceCursor: { sequence: current.sequence + 1, eventHash: null, chainHash: null } });
  }
  fail('dispatch transition limit exceeded');
}

export async function persistTransition({ changePath, event, state } = {}) {
  validateTraceEvent(event);
  validateRuntimeState(state);
  if (state.change !== event.change) fail('transition scope mismatch');
  const tracePath = join(changePath, '.sdd-runtime', 'trace', `${String(event.sequence).padStart(20, '0')}-${event.eventHash}.json`);
  try {
    const existing = JSON.parse(await readFile(tracePath, 'utf8'));
    if (canonicalJson(existing) === canonicalJson(event)) return { duplicate: true, tracePath };
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
