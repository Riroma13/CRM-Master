#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHANGE_NAME_PATTERN, validateChangeName, validateRuntimeState } from './sdd-runtime.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CHECKPOINT_ARTIFACTS = [
  ['repository-ready.md', 'Repository Ready'],
  ['health-report.md', 'Health Report'],
  ['archive-report.md', 'Archive'],
  ['verify-report.md', 'Verify'],
  ['verify.md', 'Verify'],
  ['apply-summary.md', 'Apply'],
  ['workload-guard.md', 'Workload Guard'],
  ['tasks-review.md', 'Tasks Review'],
  ['tasks.md', 'Tasks'],
  ['architecture-review.md', 'Architecture Review'],
  ['design.md', 'Design'],
];

const COMPLETED_MARKER =
  /^\s*(?:status|state|lifecycle|change_status):\s*(?:COMPLETED|ARCHIVED)\s*$/im;
const COMPLETED_BOOLEAN_MARKER = /^\s*(?:completed|archived):\s*true\s*$/im;
const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'development', 'trunk']);

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function isValidChangeName(name) {
  return typeof name === 'string' && CHANGE_NAME_PATTERN.test(name);
}

function lastField(text, field) {
  const matches = [...text.matchAll(new RegExp(`^\\s*${field}:\\s*(.+?)\\s*$`, 'gim'))];
  return matches.at(-1)?.[1]?.trim() || null;
}

function normalizeCheckpoint(checkpoint, fallbackArtifact = null, fallbackPhase = null) {
  if (!checkpoint || typeof checkpoint !== 'object') {
    return {
      artifact: fallbackArtifact,
      phase: fallbackPhase,
      status: null,
      next: null,
    };
  }

  return {
    artifact: checkpoint.artifact ?? fallbackArtifact,
    phase: checkpoint.phase ?? fallbackPhase,
    status: checkpoint.status ?? null,
    next: checkpoint.next ?? null,
  };
}

function normalizedBranch(branch) {
  if (typeof branch !== 'string') return null;
  const value = branch.trim().replace(/^refs\/heads\//i, '');
  return value || null;
}

function branchSuffix(branch) {
  const normalized = normalizedBranch(branch);
  return normalized?.split('/').filter(Boolean).at(-1) || null;
}

/**
 * Convert a full feature branch name into the only branch-derived change name
 * accepted by the resolver. This is intentionally mechanical; it never asks a
 * model to invent a semantic name.
 */
export function canonicalBranchChangeName(branch) {
  const normalized = normalizedBranch(branch);
  if (!normalized || PROTECTED_BRANCHES.has(normalized.toLowerCase())) return null;

  const name = normalized
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return isValidChangeName(name) ? name : null;
}

// Keep the existing resolver export while making its naming algorithm
// canonical for both /sdd-resume and the direct command's omitted argument.
export const branchChangeName = canonicalBranchChangeName;

function branchAssociationNames(branch) {
  const names = new Set();
  const derived = canonicalBranchChangeName(branch);
  const suffix = branchSuffix(branch);
  if (derived) names.add(derived);
  if (isValidChangeName(suffix)) names.add(suffix);
  return names;
}

function hasArchivePath(filePath) {
  return filePath.split(/[\\/]/).includes('archive');
}

function normalizeCandidate(candidate) {
  const value = typeof candidate === 'string' ? { name: candidate } : candidate;
  if (!value || typeof value !== 'object') return null;

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!isValidChangeName(name)) return null;

  return {
    ...value,
    name,
    archived: value.archived === true || hasArchivePath(value.path || ''),
    completed: value.completed === true,
  };
}

function isActiveCandidate(candidate) {
  return candidate && !candidate.archived && !candidate.completed && candidate.active !== false;
}

export function recoverCheckpoint(candidate) {
  if (candidate?.runtimeState) {
    const checkpoint = candidate.runtimeState.checkpoint;
    return normalizeCheckpoint({
      artifact: checkpoint.artifact,
      phase: checkpoint.phase,
      status: checkpoint.verdict,
      next: checkpoint.next,
    });
  }
  if (candidate?.checkpoint) {
    return normalizeCheckpoint(candidate.checkpoint);
  }

  if (!candidate?.path) {
    return normalizeCheckpoint(null, null, null);
  }

  for (const [artifact, fallbackPhase] of CHECKPOINT_ARTIFACTS) {
    const text = readText(join(candidate.path, artifact));
    if (text === null) continue;

    return normalizeCheckpoint(
      {
        artifact,
        phase: lastField(text, 'phase') || fallbackPhase,
        status: lastField(text, 'status'),
        next: lastField(text, 'next'),
      },
      artifact,
      fallbackPhase,
    );
  }

  return normalizeCheckpoint(null, null, null);
}

function readRuntimeState(changePath) {
  const stateFile = join(changePath, '.sdd-runtime', 'state.json');
  const text = readText(stateFile);
  if (text === null) return { state: null, invalid: false };
  try {
    const state = JSON.parse(text);
    return { state: validateRuntimeState(state), invalid: false };
  } catch (error) {
    return { state: null, invalid: true, error: error.message };
  }
}

function hasCompletionMarker(files) {
  return files.some((file) => {
    const text = readText(file);
    return text !== null && (COMPLETED_MARKER.test(text) || COMPLETED_BOOLEAN_MARKER.test(text));
  });
}

function archivedChangeNames(changesRoot) {
  const archiveRoot = join(changesRoot, 'archive');
  if (!existsSync(archiveRoot)) return new Set();

  let entries;
  try {
    entries = readdirSync(archiveRoot, { withFileTypes: true });
  } catch {
    return new Set();
  }

  return new Set(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.replace(/^\d{4}-\d{2}-\d{2}-/, '')),
  );
}

/**
 * Discover change directories without mutating the repository.
 *
 * The archive directory, archived source mirrors, and explicit
 * completed/archived markers are excluded.
 * A phase-level Archive artifact is not treated as a completed lifecycle: the
 * canonical workflow still has Health Report and Repository Ready afterwards.
 */
export function discoverActiveChanges(changesRoot = join(ROOT, 'openspec', 'changes')) {
  if (!existsSync(changesRoot)) return [];

  let entries;
  try {
    entries = readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const archivedNames = archivedChangeNames(changesRoot);

  return entries
    .filter(
      (entry) => entry.isDirectory() && entry.name !== 'archive' && !archivedNames.has(entry.name),
    )
    .map((entry) => {
      const path = join(changesRoot, entry.name);
      const runtime = readRuntimeState(path);
      let files;
      try {
        files = readdirSync(path, { withFileTypes: true });
      } catch {
        return null;
      }

      const filePaths = files.filter((file) => file.isFile()).map((file) => join(path, file.name));

      // A freshly bootstrapped change legitimately contains only its runtime
      // checkpoint until the first executor writes a phase artifact.
      if (filePaths.length === 0 && !runtime.state) return null;

      return {
        name: entry.name,
        path,
        completed: hasCompletionMarker(filePaths),
        runtimeState: runtime.state,
        runtimeStateInvalid: runtime.invalid,
        runtimeStateError: runtime.error || null,
        checkpoint: recoverCheckpoint({ name: entry.name, path, runtimeState: runtime.state }),
      };
    })
    .filter(isActiveCandidate)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function uniqueActiveCandidates(candidates) {
  const byName = new Map();
  for (const candidate of candidates || []) {
    const normalized = normalizeCandidate(candidate);
    if (isActiveCandidate(normalized) && !byName.has(normalized.name)) {
      byName.set(normalized.name, normalized);
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function persistedCandidates(state) {
  if (!state) return [];

  if (Array.isArray(state)) return state;
  if (typeof state === 'string') return [{ name: state, active: true }];
  if (typeof state !== 'object') return [];

  if (Array.isArray(state.candidates)) return state.candidates;

  const current = state.current || state.currentChange || state.sdd || state;
  if (typeof current === 'string') return [{ name: current, active: true }];
  if (current && typeof current === 'object') {
    const name = current.name || current.change || current.changeName;
    return name ? [{ ...current, name }] : [];
  }

  return [];
}

function readyResult({ branch, candidate = null, source, change = null }) {
  if (candidate?.runtimeStateInvalid) {
    return stopResult(branch, 'corrupt-runtime-state', [candidate]);
  }
  const resolvedChange = candidate?.name || change;
  const checkpoint = candidate ? recoverCheckpoint(candidate) : normalizeCheckpoint();
  return {
    status: 'READY',
    human_required: false,
    branch: branch?.trim() || '(detached HEAD)',
    change: resolvedChange,
    source: candidate?.runtimeState ? 'runtime-state' : source,
    checkpoint,
    delegation: `/sdd-direct ${resolvedChange}`,
    next: checkpoint.next || 'first incomplete canonical action',
  };
}

function stopResult(branch, reason, candidates = []) {
  return {
    status: 'STOP',
    human_required: true,
    branch: branch?.trim() || '(detached HEAD)',
    reason,
    candidates: candidates.map((candidate) => candidate.name),
  };
}

function explicitChangeProvided(explicitChange) {
  return explicitChange !== undefined
    && explicitChange !== null
    && !(typeof explicitChange === 'string' && explicitChange.trim() === '');
}

function resolveExplicitChange({ branch, explicitChange }) {
  if (!explicitChangeProvided(explicitChange)) return null;
  if (typeof explicitChange !== 'string') return stopResult(branch, 'invalid-explicit-change');

  const change = explicitChange.trim();
  try {
    validateChangeName(change);
  } catch {
    return stopResult(branch, 'invalid-explicit-change');
  }
  return readyResult({ branch, change, source: 'explicit' });
}

function candidateMatchesBranch(candidate, branch) {
  if (candidate?.associated === true || candidate?.current === true) return true;

  const names = branchAssociationNames(branch);
  if (names.has(candidate?.name)) return true;

  const normalized = normalizedBranch(branch);
  const candidateBranches = [
    candidate?.branch,
    candidate?.branchName,
    candidate?.session?.branch,
    candidate?.session?.branchName,
    candidate?.runtimeState?.branch,
    candidate?.runtimeState?.branchName,
    candidate?.state?.branch,
    candidate?.state?.branchName,
  ];
  return candidateBranches.some((value) => {
    const candidateBranch = normalizedBranch(value);
    if (!normalized || !candidateBranch) return false;
    return candidateBranch === normalized || names.has(canonicalBranchChangeName(candidateBranch));
  });
}

function existingChangeNames(values) {
  const names = new Set();
  for (const value of values || []) {
    const name = typeof value === 'string' ? value.trim() : value?.name?.trim();
    if (isValidChangeName(name)) names.add(name);
  }
  return names;
}

/**
 * Resolve a change identity without creating directories or touching runtime
 * state. Branch/session/state association is mechanical; repository resolution
 * may additionally scope out unrelated legacy candidates before this function
 * is called.
 */
export function resolveChangeName({
  branch = '',
  explicitChange = undefined,
  activeChanges = [],
  persistedState = null,
  existingChanges = [],
} = {}) {
  const explicit = resolveExplicitChange({ branch, explicitChange });
  if (explicit) return explicit;

  const allActive = uniqueActiveCandidates(activeChanges);
  const associated = allActive.filter((candidate) => candidateMatchesBranch(candidate, branch));
  const active = associated.length > 0 ? associated : allActive;
  if (active.length === 1) return readyResult({ branch, candidate: active[0], source: 'active' });
  if (active.length > 1) return stopResult(branch, 'multiple-active-changes', active);

  const persisted = uniqueActiveCandidates(persistedCandidates(persistedState));
  if (persisted.length === 1) return readyResult({ branch, candidate: persisted[0], source: 'persisted-state' });
  if (persisted.length > 1) return stopResult(branch, 'multiple-persisted-changes', persisted);

  const normalized = normalizedBranch(branch);
  if (!normalized || PROTECTED_BRANCHES.has(normalized.toLowerCase())) {
    return stopResult(branch, 'protected-or-unavailable-branch');
  }

  const derived = canonicalBranchChangeName(normalized);
  if (!derived) return stopResult(branch, 'unusable-branch-name');
  if (existingChangeNames(existingChanges).has(derived)) {
    return stopResult(branch, 'branch-derived-name-conflict', [{ name: derived }]);
  }

  return readyResult({ branch, change: derived, source: 'branch' });
}

/**
 * Resolve one change using the bounded /sdd-resume priority order.
 *
 * `persistedState` is intentionally injected by the command/orchestrator so
 * this resolver never invents or owns a second persistence store.
 */
export function resolveResume({ branch = '', activeChanges = [], persistedState = null } = {}) {
  const candidates = uniqueActiveCandidates(activeChanges);
  const associated = candidates.filter((candidate) => candidateMatchesBranch(candidate, branch));
  const scopedCandidates = associated.length > 0 ? associated : candidates;
  const result = resolveChangeName({ branch, activeChanges: scopedCandidates, persistedState });

  if (result.source === 'branch' && scopedCandidates.length === 0) {
    return stopResult(branch, 'no-active-change');
  }

  if (result.source === 'active' && associated.length === 1) {
    return { ...result, source: 'branch' };
  }
  if (result.source === 'active' && candidates.length === 1 && associated.length === 0) {
    return { ...result, source: 'single-active' };
  }

  // Preserve /sdd-resume's historical reason for an empty protected-branch
  // result while the direct resolver exposes the more precise stop reason.
  if (result.reason === 'protected-or-unavailable-branch' && scopedCandidates.length === 0) {
    return { ...result, reason: 'no-active-change' };
  }
  return result;
}

export function formatResumeResult(result) {
  if (result.status === 'READY') {
    const checkpoint = result.checkpoint;
    const checkpointText =
      [checkpoint.phase, checkpoint.artifact, checkpoint.status].filter(Boolean).join(' / ') ||
      'not recorded';

    return [
      `resolved change: ${result.change}`,
      `current branch: ${result.branch}`,
      `recovered lifecycle checkpoint: ${checkpointText}`,
      `next canonical action: ${result.next}`,
      `delegation: ${result.delegation}`,
    ].join('\n');
  }

  if (
    result.reason === 'multiple-active-changes' ||
    result.reason === 'multiple-persisted-changes'
  ) {
    return ['STOP', ...result.candidates].join('\n');
  }

  return 'STOP: no valid active SDD change was resolved; use /sdd-direct <change-name>.';
}

export function currentBranch(cwd = ROOT) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function discoverExistingChangeNames(changesRoot = join(ROOT, 'openspec', 'changes')) {
  if (!existsSync(changesRoot)) return [];

  let entries;
  try {
    entries = readdirSync(changesRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const names = new Set(
    entries
      .filter((entry) => entry.isDirectory() && entry.name !== 'archive' && isValidChangeName(entry.name))
      .map((entry) => entry.name),
  );
  for (const name of archivedChangeNames(changesRoot)) {
    if (isValidChangeName(name)) names.add(name);
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

/**
 * Resolve the direct command's omitted identity from repository state. The
 * resolver never creates a change directory; bootstrap remains the sole owner
 * of creation after this result is accepted.
 */
export function resolveRepositoryChangeName({
  cwd = ROOT,
  branch = undefined,
  explicitChange = undefined,
  persistedState = null,
  changesRoot = undefined,
} = {}) {
  const repositoryRoot = resolve(cwd);
  const activeRoot = changesRoot || join(repositoryRoot, 'openspec', 'changes');
  const current = branch === undefined ? currentBranch(repositoryRoot) : branch;
  const allActive = discoverActiveChanges(activeRoot);
  const associated = allActive.filter((candidate) => candidateMatchesBranch(candidate, current));
  const canDeriveBranch = canonicalBranchChangeName(current) !== null;
  const activeChanges = associated.length > 0 || allActive.length === 1 || !canDeriveBranch
    ? (associated.length > 0 ? associated : allActive)
    : [];

  return resolveChangeName({
    branch: current,
    explicitChange,
    activeChanges,
    persistedState,
    existingChanges: discoverExistingChangeNames(activeRoot),
  });
}

export function resolveRepositoryResume(options = {}) {
  const { cwd = ROOT, persistedState = null } = options;
  const branch = currentBranch(cwd);
  const activeChanges = discoverActiveChanges(join(resolve(cwd), 'openspec', 'changes'));
  return resolveResume({ branch, activeChanges, persistedState });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const direct = process.argv.includes('--resolve-direct');
  const result = direct ? resolveRepositoryChangeName() : resolveRepositoryResume();
  if (direct) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.status !== 'READY') process.exitCode = 2;
  } else {
    process.stdout.write(`${formatResumeResult(result)}\n`);
  }
}
