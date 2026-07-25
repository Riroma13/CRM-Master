import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  classifyPaths,
  DOWNSTREAM_REPORT_PATHS,
  getAllowedDownstreamPaths,
} from './validate-phase1.mjs';
import { validateReleaseDocuments, validateReleaseScope } from './validate-release.mjs';

const execFileAsync = promisify(execFile);
const VALIDATION_ROOT = dirname(fileURLToPath(import.meta.url));
const CHANGE_ROOT = resolve(VALIDATION_ROOT, '..');
const REPOSITORY_ROOT = resolve(CHANGE_ROOT, '../../..');
const CHANGE_NAME = 'SPEC-SDD-0002-sdd-v3-stable-release';
const CHANGE_PATH_PREFIX = `openspec/changes/${CHANGE_NAME}`;
const BASELINE_COMMIT = 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce';

export const REQUIRED_CRITERIA = [
  'AR-001',
  'AR-002',
  'AR-003',
  'AR-004',
  'AR-005',
  'DC-001',
  'DC-002',
  'DC-003',
  'DC-004',
  'DC-005',
  'DC-006',
];

export const PHASE5_REQUIRED_PATHS = [
  `${CHANGE_PATH_PREFIX}/tasks.md`,
  `${CHANGE_PATH_PREFIX}/evidence/phase-5-result.md`,
  `${CHANGE_PATH_PREFIX}/validation/owned-path-scope.json`,
  `${CHANGE_PATH_PREFIX}/validation/validate-phase1.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/validate-release.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/validate-phase5.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/test/phase5-readiness.test.mjs`,
];

const PATHS = {
  architectureReview: join(CHANGE_ROOT, 'architecture-review.md'),
  evidence: join(CHANGE_ROOT, 'evidence', 'phase-5-result.md'),
  scope: join(VALIDATION_ROOT, 'owned-path-scope.json'),
  tasks: join(CHANGE_ROOT, 'tasks.md'),
  guard: resolve(REPOSITORY_ROOT, 'docs/sdd-workflow-guard.md'),
};

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function unique(values) {
  return new Set(values).size === values.length;
}

function pathSetHash(paths) {
  return createHash('sha256')
    .update([...new Set(paths)].map(normalizePath).sort().join('\n'))
    .digest('hex');
}

function textHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function extractSection(markdown, heading, nextHeading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return '';
  const end = markdown.indexOf(nextHeading, start + heading.length);
  return markdown.slice(start, end === -1 ? markdown.length : end);
}

function currentWorktreePaths() {
  return execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: REPOSITORY_ROOT,
  }).then(({ stdout }) =>
    stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => normalizePath(line.slice(3).split(' -> ').at(-1))),
  );
}

async function currentHead() {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
    cwd: REPOSITORY_ROOT,
  });
  return stdout.trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export function validateArchitectureReviewEvidence(markdown) {
  const failures = [];
  if (typeof markdown !== 'string') return ['Architecture Review must be text'];

  if (!markdown.includes('status: APPROVED_WITH_CONDITIONS')) {
    failures.push('Architecture Review approval status is missing');
  }
  if (!markdown.includes('No `BLOCKER`')) {
    failures.push('Architecture Review blocker-free decision is missing');
  }
  if (!markdown.includes('## Mandatory Downstream Acceptance Criteria')) {
    failures.push('mandatory downstream acceptance criteria section is missing');
  }

  for (const criterion of REQUIRED_CRITERIA) {
    if (!markdown.includes(criterion)) {
      failures.push(`Architecture Review evidence is missing ${criterion}`);
    }
  }

  for (const finding of ['AR-NB-001', 'AR-NB-002']) {
    if (!new RegExp(`${finding}[\\s\\S]{0,300}CLOSED`).test(markdown)) {
      failures.push(`${finding} must remain CLOSED`);
    }
  }

  return failures;
}

export function validatePhase5Evidence(markdown) {
  const failures = [];
  if (typeof markdown !== 'string') return ['Phase 5 evidence must be text'];

  const requiredStates = [
    [/release[_ ]state:\s*\*{0,2}\s*`?candidate`?/i, 'candidate release state'],
    [/stable[_ ]declaration:\s*\*{0,2}\s*`?NOT_EXECUTED`?/i, 'inactive Stable declaration'],
    [/planned[_ ]tag(?:[_ ]state)?:\s*\*{0,2}\s*`?NOT_PUBLISHED`?/i, 'unpublished planned tag'],
    [
      /freeze[_ ]state(?:[_ ]after[_ ]final[_ ]gate)?:\s*\*{0,2}\s*`?PENDING`?/i,
      'pending freeze state',
    ],
    [/final[_-]gate(?:[_ ]status)?:\s*\*{0,2}\s*`?NOT_EXECUTED`?/i, 'unexecuted final gate'],
  ];

  for (const [pattern, label] of requiredStates) {
    if (!pattern.test(markdown)) failures.push(`missing ${label}`);
  }

  if (!/Handoff[\s\S]{0,300}Apply Summary[\s\S]{0,300}Verify/i.test(markdown)) {
    failures.push('Apply Summary and Verify handoff evidence is missing');
  }

  const lines = markdown.split('\n');
  for (const criterion of REQUIRED_CRITERIA) {
    const row = lines.find((line) => new RegExp(`\\|\\s*${criterion}\\s*\\|`).test(line));
    if (!row) {
      failures.push(`Phase 5 evidence matrix is missing ${criterion}`);
    } else if (!/(evidence\/|validation\/|architecture-review\.md|docs\/)/.test(row)) {
      failures.push(`Phase 5 evidence matrix has no evidence path for ${criterion}`);
    }
  }

  for (const finding of ['AR-NB-001', 'AR-NB-002']) {
    if (!new RegExp(`${finding}[\\s\\S]{0,300}CLOSED`).test(markdown)) {
      failures.push(`${finding} closure evidence is missing from Phase 5 result`);
    }
  }

  return failures;
}

export function validatePhase5Tasks(tasksText) {
  const failures = [];
  for (const task of ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2']) {
    if (!new RegExp(`- \\[x\\] ${task}\\b`).test(tasksText)) {
      failures.push(`Apply task ${task} is not checked`);
    }
  }

  for (const report of [
    'apply-summary.md',
    'verify-report.md',
    'archive-report.md',
    'health-report.md',
  ]) {
    if (new RegExp(`- \\[x\\].*${report.replace('.', '\\.')}`).test(tasksText)) {
      failures.push(`downstream report was started early: ${report}`);
    }
  }

  return failures;
}

export function validatePhase5Scope(scope, currentPaths) {
  const failures = [];
  const phase5Owned = (scope.phase5_owned_paths ?? []).map(normalizePath);
  const phase5Added = (scope.phase5_added_paths ?? []).map(normalizePath);
  const required = PHASE5_REQUIRED_PATHS.map(normalizePath);

  if (scope.current_apply_phase !== 5) failures.push('current Apply phase must be 5');
  if (scope.release_state !== 'candidate')
    failures.push('scope release state must remain candidate');
  if (scope.stable_declaration !== 'NOT_EXECUTED') {
    failures.push('scope Stable declaration must remain NOT_EXECUTED');
  }
  if (scope.planned_tag_state !== 'NOT_PUBLISHED') {
    failures.push('scope planned tag must remain NOT_PUBLISHED');
  }
  if (scope.freeze_state_after_final_gate !== 'PENDING') {
    failures.push('scope freeze state must remain PENDING');
  }
  if (!unique(phase5Owned)) failures.push('Phase 5 owned paths contain duplicates');
  if (!unique(phase5Added)) failures.push('Phase 5 added paths contain duplicates');

  for (const path of required) {
    if (!phase5Owned.includes(path)) failures.push(`missing Phase 5 owned path: ${path}`);
  }
  for (const path of phase5Added) {
    if (!phase5Owned.includes(path)) failures.push(`Phase 5 added path is not owned: ${path}`);
    if (!currentPaths.includes(path)) failures.push(`Phase 5 added path is missing: ${path}`);
  }

  const snapshot = scope.pre_phase5_snapshot;
  if (!snapshot) {
    failures.push('pre-Phase 5 scope snapshot is missing');
  } else {
    const allowedDownstreamPaths = getAllowedDownstreamPaths(scope);
    const remainingPaths = currentPaths.filter(
      (path) => !phase5Added.includes(path) && !allowedDownstreamPaths.has(path),
    );
    if (snapshot.path_count !== remainingPaths.length) {
      failures.push('pre-Phase 5 path count changed during reconciliation');
    }
    if (snapshot.path_set_sha256 !== pathSetHash(remainingPaths)) {
      failures.push('pre-Phase 5 changed-path set was not preserved');
    }

    for (const path of snapshot.preserved_path_samples ?? []) {
      if (!currentPaths.includes(path)) {
        failures.push(`preservation sample is missing during Phase 5: ${path}`);
      }
    }
  }

  const phaseOwnedPaths = [
    ...(scope.phase_owned_paths ?? []),
    ...(scope.phase2_owned_paths ?? []),
    ...(scope.phase3_owned_paths ?? []),
    ...(scope.phase4_owned_paths ?? []),
    ...phase5Owned,
  ];
  const classification = classifyPaths(currentPaths, {
    ...scope,
    phase_owned_paths: phaseOwnedPaths,
  });
  failures.push(...classification.failures);
  if (classification.future.length > 0) {
    failures.push(`future paths remain during Phase 5: ${classification.future.join(', ')}`);
  }
  if (classification.deferred.length > 0) {
    failures.push(`deferred paths changed during Phase 5: ${classification.deferred.join(', ')}`);
  }
  if (classification.unclassified.length > 0) {
    failures.push(
      `unclassified paths remain during Phase 5: ${classification.unclassified.join(', ')}`,
    );
  }

  const allowedDownstreamPaths = getAllowedDownstreamPaths(scope);
  for (const path of DOWNSTREAM_REPORT_PATHS) {
    if (currentPaths.includes(path) && !allowedDownstreamPaths.has(path)) {
      failures.push(`downstream report started early: ${path}`);
    }
  }
  if (currentPaths.some((path) => path.startsWith('openspec/changes/SPEC-SDD-0001-'))) {
    failures.push('SPEC-SDD-0001 changed during Phase 5');
  }

  return {
    failures,
    currentPathSummary: {
      owned: classification.owned.length,
      preserved: classification.preserved.length,
      future: classification.future.length,
      transitioned: classification.transitioned.length,
      excluded: classification.excluded.length,
      deferred: classification.deferred.length,
      unclassified: classification.unclassified.length,
    },
  };
}

async function validateGuardPreservation(scope, failures) {
  const snapshot = scope.pre_phase5_snapshot;
  if (!snapshot) return;

  const guard = await readFile(PATHS.guard, 'utf8');
  const directSection = extractSection(
    guard,
    '## Direct Mode (Opt-In, Project-Local)',
    '## Compatibility and Rollback',
  );
  if (textHash(guard) !== snapshot.guard_sha256) {
    failures.push('Workflow Guard changed after the Phase 5 boundary was captured');
  }
  if (textHash(directSection) !== snapshot.direct_mode_section_sha256) {
    failures.push('existing Direct-mode section changed during Phase 5');
  }
}

export async function runPhase5Validation() {
  const scope = await readJson(PATHS.scope);
  const currentPaths = await currentWorktreePaths();
  const failures = [];

  if ((await currentHead()) !== BASELINE_COMMIT) {
    failures.push(`HEAD is not the approved baseline: ${BASELINE_COMMIT}`);
  }

  const documentResult = await validateReleaseDocuments();
  failures.push(...documentResult.failures);
  const releaseScope = await validateReleaseScope();
  failures.push(...releaseScope.failures);
  const scopeResult = validatePhase5Scope(scope, currentPaths);
  failures.push(...scopeResult.failures);
  await validateGuardPreservation(scope, failures);

  failures.push(
    ...validateArchitectureReviewEvidence(await readFile(PATHS.architectureReview, 'utf8')),
  );
  failures.push(...validatePhase5Evidence(await readFile(PATHS.evidence, 'utf8')));
  failures.push(...validatePhase5Tasks(await readFile(PATHS.tasks, 'utf8')));

  return {
    failures,
    currentPathSummary: scopeResult.currentPathSummary,
    releaseState: documentResult.contract?.manifest?.release_state,
    finalGateStatus: documentResult.contract?.manifest?.final_gate?.status,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runPhase5Validation();
  if (result.failures.length > 0) {
    console.error('SPEC-SDD-0002 Phase 5 validation: FAIL');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('SPEC-SDD-0002 Phase 5 validation: PASS');
    console.log(`- Current paths: ${JSON.stringify(result.currentPathSummary)}`);
    console.log('- Architecture Review conditions and DC criteria have evidence');
    console.log('- Candidate-only state and preservation boundary remain intact');
    console.log('- Apply Summary and Verify remain the next phases');
  }
}
