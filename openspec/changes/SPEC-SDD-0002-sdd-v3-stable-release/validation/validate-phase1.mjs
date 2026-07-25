import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const VALIDATION_ROOT = dirname(fileURLToPath(import.meta.url));
const CHANGE_ROOT = resolve(VALIDATION_ROOT, '..');
const REPOSITORY_ROOT = resolve(CHANGE_ROOT, '../../..');
const CHANGE_NAME = 'SPEC-SDD-0002-sdd-v3-stable-release';
const CHANGE_PATH_PREFIX = `openspec/changes/${CHANGE_NAME}`;
const BASELINE_COMMIT = 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce';

export const DIRECT_PHASES = [
  'Apply',
  'Apply Summary',
  'Verify',
  'Archive',
  'Health Report',
  'Repository Ready',
];

export const DOWNSTREAM_REPORT_PATHS = [
  `${CHANGE_PATH_PREFIX}/apply-summary.md`,
  `${CHANGE_PATH_PREFIX}/verify-report.md`,
  `${CHANGE_PATH_PREFIX}/archive-report.md`,
  `${CHANGE_PATH_PREFIX}/health-report.md`,
  `${CHANGE_PATH_PREFIX}/repository-ready.md`,
];

const DOWNSTREAM_REPORTS = DOWNSTREAM_REPORT_PATHS.map((path, index) => ({
  path,
  phase: DIRECT_PHASES[index + 1],
  requires: DOWNSTREAM_REPORT_PATHS.slice(0, index),
}));

const paths = {
  scope: join(VALIDATION_ROOT, 'owned-path-scope.json'),
  inventory: join(CHANGE_ROOT, 'evidence', 'authority-inventory.json'),
  classification: join(CHANGE_ROOT, 'evidence', 'stable-document-classification.json'),
  tasks: join(CHANGE_ROOT, 'tasks.md'),
};

const expectedResponsibilities = new Set([
  'transition-semantics',
  'design-artifact-shape',
  'design-generation',
  'platform-baseline',
  'platform-policy',
  'release-compatibility',
  'release-policy',
  'release-history',
]);

const expectedClassifications = new Map([
  ['docs/sdd-workflow-guard.md', 'authoritative'],
  ['docs/templates/design-enterprise-template.md', 'authoritative'],
  ['docs/templates/design-master-prompt.md', 'authoritative'],
  ['docs/architecture/platform-baseline.md', 'authoritative'],
  ['docs/architecture/sdd-infrastructure.md', 'authoritative'],
  ['docs/architecture/CHANGELOG.md', 'authoritative'],
  ['docs/architecture/sdd-v3.0-release-notes.md', 'authoritative'],
  ['docs/architecture/adr/0021-sdd-v3-stable-release.md', 'authoritative'],
  ['docs/SDD-WORKFLOW.md', 'historical-compatible'],
  ['docs/templates/design-prompt.md', 'deprecated'],
  ['docs/architecture/sdd-v3-roadmap.md', 'superseded'],
  ['docs/roadmaps/**', 'historical-reference'],
  ['docs/history/**', 'historical-reference'],
  ['openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**', 'historical-reference'],
  ['product/runtime/**', 'not-in-release'],
  ['.opencode/**', 'not-in-release'],
]);

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function unique(values) {
  return new Set(values).size === values.length;
}

function matchesRule(path, rule) {
  const normalizedPath = normalizePath(path);
  if (typeof rule === 'string') {
    const normalizedRule = normalizePath(rule);
    return normalizedRule.endsWith('/')
      ? normalizedPath.startsWith(normalizedRule)
      : normalizedPath === normalizedRule;
  }

  if (rule.path) return normalizedPath === normalizePath(rule.path);
  if (rule.prefix) return normalizedPath.startsWith(normalizePath(rule.prefix));
  return false;
}

function matchesAnyRule(path, rules = []) {
  return rules.find((rule) => matchesRule(path, rule));
}

function phaseOwned(scope) {
  return new Set(scope.phase_owned_paths.map(normalizePath));
}

export function getCurrentDirectPhase(scope) {
  return scope.current_direct_phase ?? 'Apply';
}

export function getAllowedDownstreamPaths(scope) {
  const currentPhaseIndex = DIRECT_PHASES.indexOf(getCurrentDirectPhase(scope));
  if (currentPhaseIndex < 1) return new Set();

  return new Set(
    DOWNSTREAM_REPORTS.slice(0, currentPhaseIndex).map(({ path }) => normalizePath(path)),
  );
}

function validateDownstreamOrdering(changedPaths) {
  const present = new Set(changedPaths.map(normalizePath));
  const failures = [];

  for (const report of DOWNSTREAM_REPORTS) {
    if (!present.has(report.path)) continue;
    for (const requiredPath of report.requires) {
      if (!present.has(requiredPath)) {
        failures.push(`downstream report is out of order: ${report.path} requires ${requiredPath}`);
      }
    }
  }

  return failures;
}

export function classifyPaths(changedPaths, scope) {
  const result = {
    owned: [],
    preserved: [],
    future: [],
    transitioned: [],
    deferred: [],
    excluded: [],
    unclassified: [],
    failures: [],
  };
  const owned = phaseOwned(scope);
  const preserved = new Set(scope.preserved_paths.map(normalizePath));
  const future = new Set(
    [
      ...(scope.phase2_owned_paths ?? []),
      ...(scope.phase3_owned_paths ?? []),
      ...(scope.phase4_owned_paths ?? []),
      ...(scope.phase5_owned_paths ?? []),
    ].map(normalizePath),
  );
  const deferred = new Set(scope.deferred_paths.map(normalizePath));
  const transitioned = getAllowedDownstreamPaths(scope);

  for (const rawPath of changedPaths) {
    const path = normalizePath(rawPath);
    if (owned.has(path)) {
      result.owned.push(path);
    } else if (preserved.has(path) || matchesAnyRule(path, scope.preserved_path_rules)) {
      result.preserved.push(path);
    } else if (future.has(path)) {
      result.future.push(path);
    } else if (transitioned.has(path)) {
      result.transitioned.push(path);
    } else if (deferred.has(path)) {
      result.deferred.push(path);
      result.failures.push(`deferred path is not allowed in Phase 1: ${path}`);
    } else if (matchesAnyRule(path, scope.excluded_path_rules)) {
      result.excluded.push(path);
    } else {
      result.unclassified.push(path);
      result.failures.push(`unclassified path: ${path}`);
    }
  }

  if (!DIRECT_PHASES.includes(getCurrentDirectPhase(scope))) {
    result.failures.push(`unknown current Direct phase: ${getCurrentDirectPhase(scope)}`);
  }
  result.failures.push(...validateDownstreamOrdering(changedPaths));

  return result;
}

export function validateRequestedPaths(requestedPaths, scope) {
  const owned = phaseOwned(scope);
  const failures = [];

  for (const rawPath of requestedPaths) {
    const path = normalizePath(rawPath);
    if (!owned.has(path)) {
      failures.push(`Phase 1 does not own path: ${path}`);
    }
  }

  return { failures };
}

function validateScope(scope, currentPaths) {
  const failures = [];
  const requiredOwnedPaths = [
    `${CHANGE_PATH_PREFIX}/tasks.md`,
    `${CHANGE_PATH_PREFIX}/evidence/authority-inventory.json`,
    `${CHANGE_PATH_PREFIX}/evidence/stable-document-classification.json`,
    `${CHANGE_PATH_PREFIX}/evidence/phase-1-result.md`,
    `${CHANGE_PATH_PREFIX}/validation/owned-path-scope.json`,
    `${CHANGE_PATH_PREFIX}/validation/validate-phase1.mjs`,
    `${CHANGE_PATH_PREFIX}/validation/test/phase1-scope.test.mjs`,
    `${CHANGE_PATH_PREFIX}/validation/test/release-contract.test.mjs`,
  ];

  if (scope.schema !== 'sdd-direct-apply-scope/v1') {
    failures.push('invalid Phase 1 scope schema');
  }
  if (scope.change !== CHANGE_NAME) failures.push('scope change does not match SPEC-SDD-0002');
  if (scope.phase !== 1) failures.push('scope phase must be 1');
  if (scope.baseline_commit !== BASELINE_COMMIT)
    failures.push('scope baseline commit is not the approved baseline');
  if (scope.release_state !== 'candidate')
    failures.push('Phase 1 release state must remain candidate');
  if (!DIRECT_PHASES.includes(getCurrentDirectPhase(scope))) {
    failures.push(`unknown current Direct phase: ${getCurrentDirectPhase(scope)}`);
  }
  if (scope.stable_declaration !== 'NOT_EXECUTED')
    failures.push('Stable declaration must remain NOT_EXECUTED');
  if (scope.freeze_state !== 'UNCHANGED') failures.push('freeze state must remain UNCHANGED');
  if (scope.planned_tag_state !== 'NOT_PUBLISHED')
    failures.push('planned tag must remain unpublished');

  for (const field of [
    'phase_owned_paths',
    'phase2_owned_paths',
    'phase3_owned_paths',
    'phase4_owned_paths',
    'preserved_paths',
    'preserved_path_rules',
    'deferred_paths',
    'excluded_path_rules',
  ]) {
    if (!Array.isArray(scope[field])) failures.push(`scope field must be an array: ${field}`);
  }

  const owned = scope.phase_owned_paths.map(normalizePath);
  if (!unique(owned)) failures.push('Phase 1 owned paths contain duplicates');
  for (const path of requiredOwnedPaths) {
    if (!owned.includes(path)) failures.push(`missing Phase 1 owned path: ${path}`);
  }
  for (const path of owned) {
    if (matchesAnyRule(path, scope.forbidden_path_rules)) {
      failures.push(`forbidden path is listed as Phase 1-owned: ${path}`);
    }
  }

  if (!scope.baseline_capture || scope.baseline_capture.dirty_path_count !== 111) {
    failures.push('baseline dirty-path capture is incomplete');
  }

  const classified = classifyPaths(currentPaths, scope);
  failures.push(...classified.failures);
  return {
    failures,
    currentPathSummary: {
      owned: classified.owned.length,
      preserved: classified.preserved.length,
      future: classified.future.length,
      transitioned: classified.transitioned.length,
      excluded: classified.excluded.length,
      deferred: classified.deferred.length,
      unclassified: classified.unclassified.length,
    },
  };
}

function validateInventory(inventory) {
  const failures = [];
  if (inventory.schema !== 'sdd-v3-authority-inventory/v1')
    failures.push('invalid authority inventory schema');
  if (inventory.change !== CHANGE_NAME)
    failures.push('authority inventory change does not match SPEC-SDD-0002');
  if (inventory.phase !== 1) failures.push('authority inventory phase must be 1');
  if (inventory.release_state !== 'candidate')
    failures.push('authority inventory must remain candidate');
  if (inventory.stable_declaration !== 'NOT_EXECUTED')
    failures.push('authority inventory activates Stable');
  if (inventory.baseline_commit !== BASELINE_COMMIT)
    failures.push('authority inventory baseline is incorrect');
  if (!Array.isArray(inventory.authorities))
    failures.push('authority inventory has no authorities array');

  const responsibilities = inventory.authorities?.map((entry) => entry.responsibility) ?? [];
  if (!unique(responsibilities)) failures.push('authority responsibility is duplicated');
  for (const responsibility of expectedResponsibilities) {
    if (!responsibilities.includes(responsibility)) {
      failures.push(`missing authority responsibility: ${responsibility}`);
    }
  }
  for (const entry of inventory.authorities ?? []) {
    if (!entry.path || !entry.owner || !entry.planned_action || !entry.rollback) {
      failures.push(`incomplete authority entry: ${entry.path || '<missing path>'}`);
    }
  }

  return failures;
}

function validateClassification(classification) {
  const failures = [];
  if (classification.schema !== 'sdd-v3-document-classification/v1') {
    failures.push('invalid stable-document classification schema');
  }
  if (classification.change !== CHANGE_NAME)
    failures.push('classification change does not match SPEC-SDD-0002');
  if (classification.phase !== 1) failures.push('classification phase must be 1');
  if (classification.release_state !== 'candidate')
    failures.push('classification must remain candidate');
  if (classification.stable_declaration !== 'NOT_EXECUTED')
    failures.push('classification activates Stable');
  if (classification.freeze_state !== 'UNCHANGED')
    failures.push('classification changes freeze state');
  if (classification.planned_tag_state !== 'NOT_PUBLISHED')
    failures.push('classification publishes the planned tag');

  const allowed = new Set(classification.allowed_statuses ?? []);
  for (const status of expectedClassifications.values()) {
    if (!allowed.has(status)) failures.push(`missing classification enum: ${status}`);
  }

  const documents = classification.documents ?? [];
  const documentPaths = documents.map((entry) => entry.path);
  if (!unique(documentPaths))
    failures.push('stable-document classification contains duplicate paths');
  for (const [path, expectedStatus] of expectedClassifications) {
    const entry = documents.find((candidate) => candidate.path === path);
    if (!entry) {
      failures.push(`missing document classification: ${path}`);
      continue;
    }
    if (entry.status !== expectedStatus) {
      failures.push(`wrong classification for ${path}: expected ${expectedStatus}`);
    }
    if (['deprecated', 'superseded'].includes(entry.status) && !entry.replacement) {
      failures.push(`missing replacement for ${path}`);
    }
  }
  for (const entry of documents) {
    if (!allowed.has(entry.status)) failures.push(`unknown document status: ${entry.status}`);
  }

  return failures;
}

function validateTaskProgress(tasksText, currentPaths, scope) {
  const failures = [];
  for (const task of ['1.1', '1.2']) {
    if (!new RegExp(`- \\[x\\] ${task}\\b`).test(tasksText)) {
      failures.push(`Phase 1 task ${task} is not checked`);
    }
  }
  const futurePaths = new Set(
    [
      ...(scope.phase2_owned_paths ?? []),
      ...(scope.phase3_owned_paths ?? []),
      ...(scope.phase4_owned_paths ?? []),
      ...(scope.phase5_owned_paths ?? []),
    ].map(normalizePath),
  );
  const phase2HasStarted = currentPaths.some((path) => futurePaths.has(normalizePath(path)));
  if (!phase2HasStarted) {
    for (const task of ['2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2']) {
      if (new RegExp(`- \\[x\\] ${task}\\b`).test(tasksText)) {
        failures.push(`later task ${task} was checked during Phase 1`);
      }
    }
  }
  return failures;
}

export async function loadPhase1Artifacts() {
  const [scope, inventory, classification] = await Promise.all([
    readJson(paths.scope),
    readJson(paths.inventory),
    readJson(paths.classification),
  ]);
  return {
    scope,
    inventory,
    classification,
    tasksText: await readFile(paths.tasks, 'utf8'),
  };
}

export async function validatePhase1Artifacts(artifacts, currentPaths) {
  const pathsToValidate = currentPaths ?? (await currentWorktreePaths());
  const scopeResult = validateScope(artifacts.scope, pathsToValidate);
  const failures = [
    ...scopeResult.failures,
    ...validateInventory(artifacts.inventory),
    ...validateClassification(artifacts.classification),
    ...validateTaskProgress(artifacts.tasksText, pathsToValidate, artifacts.scope),
  ];

  return {
    failures,
    currentPathSummary: scopeResult.currentPathSummary,
  };
}

async function currentWorktreePaths() {
  const { stdout } = await execFileAsync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    {
      cwd: REPOSITORY_ROOT,
    },
  );
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => normalizePath(line.slice(3).split(' -> ').at(-1)));
}

async function currentHead() {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT });
  return stdout.trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function runPhase1Validation() {
  const artifacts = await loadPhase1Artifacts();
  const result = await validatePhase1Artifacts(artifacts);
  if ((await currentHead()) !== BASELINE_COMMIT) {
    result.failures.push(`HEAD is not the approved baseline: ${BASELINE_COMMIT}`);
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runPhase1Validation();
  if (result.failures.length > 0) {
    console.error('SPEC-SDD-0002 Phase 1 validation: FAIL');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('SPEC-SDD-0002 Phase 1 validation: PASS');
    console.log(`- Current paths: ${JSON.stringify(result.currentPathSummary)}`);
    console.log('- Authority inventory has one owner per named responsibility');
    console.log('- Stable-document classifications are explicit and candidate-only');
    console.log('- Phase 1 scope rejects unclassified and deferred paths');
  }
}
