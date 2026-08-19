#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRuntimeState } from './sdd-runtime.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CHANGE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
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

export function branchChangeName(branch) {
  if (typeof branch !== 'string') return null;

  const normalized = branch.trim().replace(/^refs\/heads\//, '');
  const segments = normalized.split('/').filter(Boolean);
  const name = segments.at(-1) || null;
  return isValidChangeName(name) ? name : null;
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

      if (filePaths.length === 0) return null;

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

function readyResult({ branch, candidate, source }) {
  if (candidate.runtimeStateInvalid) {
    return stopResult(branch, 'corrupt-runtime-state', [candidate]);
  }
  const checkpoint = recoverCheckpoint(candidate);
  return {
    status: 'READY',
    branch: branch?.trim() || '(detached HEAD)',
    change: candidate.name,
    source: candidate.runtimeState ? 'runtime-state' : source,
    checkpoint,
    delegation: `/sdd-direct ${candidate.name}`,
    next: checkpoint.next || 'first incomplete canonical action',
  };
}

function stopResult(branch, reason, candidates = []) {
  return {
    status: 'STOP',
    branch: branch?.trim() || '(detached HEAD)',
    reason,
    candidates: candidates.map((candidate) => candidate.name),
  };
}

/**
 * Resolve one change using the bounded /sdd-resume priority order.
 *
 * `persistedState` is intentionally injected by the command/orchestrator so
 * this resolver never invents or owns a second persistence store.
 */
export function resolveResume({ branch = '', activeChanges = [], persistedState = null } = {}) {
  const candidates = uniqueActiveCandidates(activeChanges);
  const branchName = branchChangeName(branch);
  const branchMatch = candidates.find((candidate) => candidate.name === branchName);

  if (branchMatch) {
    return readyResult({ branch, candidate: branchMatch, source: 'branch' });
  }

  if (candidates.length === 1) {
    return readyResult({ branch, candidate: candidates[0], source: 'single-active' });
  }

  if (candidates.length > 1) {
    return stopResult(branch, 'multiple-active-changes', candidates);
  }

  const persisted = uniqueActiveCandidates(persistedCandidates(persistedState));
  if (persisted.length === 1) {
    return readyResult({ branch, candidate: persisted[0], source: 'persisted-state' });
  }

  if (persisted.length > 1) {
    return stopResult(branch, 'multiple-persisted-changes', persisted);
  }

  return stopResult(branch, 'no-active-change');
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

export function resolveRepositoryResume({ cwd = ROOT, persistedState = null } = {}) {
  const branch = currentBranch(cwd);
  const activeChanges = discoverActiveChanges(join(cwd, 'openspec', 'changes'));
  return resolveResume({ branch, activeChanges, persistedState });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const result = resolveRepositoryResume();
  process.stdout.write(`${formatResumeResult(result)}\n`);
}
