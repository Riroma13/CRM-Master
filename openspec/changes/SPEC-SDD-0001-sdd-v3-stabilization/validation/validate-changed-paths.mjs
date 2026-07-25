import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const scopePath = fileURLToPath(new URL('owned-path-scope.json', import.meta.url));

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export async function loadOwnedPathScope(path = scopePath) {
  const scope = JSON.parse(await readFile(path, 'utf8'));
  if (
    scope.schema !== 'sdd-owned-path-scope/v1' ||
    !Array.isArray(scope.ownedPaths) ||
    !Array.isArray(scope.excludedPaths) ||
    !Array.isArray(scope.excludedPathRules)
  ) {
    throw new Error('invalid SPEC-SDD-0001 owned-path scope manifest');
  }
  return scope;
}

function exclusionFor(path, scope) {
  const exact = scope.excludedPaths.find((entry) => normalizePath(entry.path) === path);
  if (exact) return exact;
  return scope.excludedPathRules.find((entry) => {
    const prefix = normalizePath(entry.prefix);
    return prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix;
  });
}

function documentFailures(documents) {
  const failures = [];
  for (const document of documents) {
    if (/SPEC-SDD-0002 action:\s*(?:declare Stable|release|restore (?:the )?freeze|create tags?)/i.test(document)) {
      failures.push('SPEC-SDD-0002 scope violation: Stable, release, freeze restoration, and tag actions remain exclusive to SPEC-SDD-0002');
    }
  }
  return failures;
}

export function classifyChangedPaths({ changedPaths, scope }) {
  const ownedPaths = [];
  const excludedPaths = [];
  const failures = [];
  const owned = new Set(scope.ownedPaths.map(normalizePath));

  for (const rawPath of changedPaths) {
    const path = normalizePath(rawPath);
    if (owned.has(path)) {
      ownedPaths.push(path);
      continue;
    }
    const exclusion = exclusionFor(path, scope);
    if (exclusion) {
      excludedPaths.push({ path, reason: exclusion.reason });
      continue;
    }
    failures.push(`non-Working-Set path: ${rawPath}`);
  }

  return { ownedPaths, excludedPaths, failures };
}

export async function validateChangedPaths({ changedPaths, documents = [], scope: providedScope }) {
  const scope = providedScope ?? await loadOwnedPathScope();
  const owned = new Set(scope.ownedPaths.map(normalizePath));
  const failures = changedPaths
    .filter((path) => !owned.has(normalizePath(path)))
    .map((path) => `non-Working-Set path: ${path}`);
  return [...failures, ...documentFailures(documents)];
}

export async function inspectChangedPathScope({ changedPaths, documents = [], scope: providedScope }) {
  const scope = providedScope ?? await loadOwnedPathScope();
  const result = classifyChangedPaths({ changedPaths, scope });
  return {
    ...result,
    failures: [...result.failures, ...documentFailures(documents)],
    excludedPathPolicy: scope.excludedPathPolicy,
  };
}

async function run(command, args) {
  await execFileAsync(process.execPath, [command, ...args]);
}

export async function runDocumentationSafetyDoorbell({ changedPaths, documents = [] }) {
  const root = new URL('./', import.meta.url);
  await run(fileURLToPath(new URL('validate-structure.mjs', root)), []);
  await run(fileURLToPath(new URL('validate-fixtures.mjs', root)), []);
  await run(fileURLToPath(new URL('reconcile-fixtures.mjs', root)), ['--twice']);
  await run(fileURLToPath(new URL('validate-readiness.mjs', root)), []);
  return validateChangedPaths({ changedPaths, documents });
}

async function currentWorktreePaths() {
  const { stdout } = await execFileAsync(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd: repositoryRoot },
  );
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).split(' -> ').at(-1));
}

export async function runCurrentWorktreeSafetyDoorbell() {
  const root = new URL('./', import.meta.url);
  await run(fileURLToPath(new URL('validate-structure.mjs', root)), []);
  await run(fileURLToPath(new URL('validate-fixtures.mjs', root)), []);
  await run(fileURLToPath(new URL('reconcile-fixtures.mjs', root)), ['--twice']);
  await run(fileURLToPath(new URL('validate-readiness.mjs', root)), []);
  return inspectChangedPathScope({ changedPaths: await currentWorktreePaths() });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--current-worktree')) {
    const result = await runCurrentWorktreeSafetyDoorbell();
    if (result.failures.length > 0) {
      console.error(`FAIL\n${result.failures.map((failure) => `- ${failure}`).join('\n')}`);
      process.exitCode = 1;
    } else {
      console.log(`PASS: SPEC-SDD-0001 owned-path scope (${result.ownedPaths.length} owned, ${result.excludedPaths.length} excluded recovery paths)`);
      for (const { path, reason } of result.excludedPaths) console.log(`EXCLUDED: ${path} -- ${reason}`);
    }
  } else {
    const changedPaths = process.argv.slice(2);
    const failures = await runDocumentationSafetyDoorbell({ changedPaths });
    if (failures.length > 0) {
      console.error(`FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
      process.exitCode = 1;
    } else {
      console.log('PASS: documentation safety doorbell');
    }
  }
}
