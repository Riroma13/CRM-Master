import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const VALIDATION_ROOT = dirname(fileURLToPath(import.meta.url));
const CHANGE_ROOT = resolve(VALIDATION_ROOT, '..');
const REPOSITORY_ROOT = resolve(CHANGE_ROOT, '../../..');

export const CHANGE_NAME = 'SPEC-SDD-0002-sdd-v3-stable-release';
export const IMPLEMENTATION_BASELINE = 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce';
export const CANDIDATE_COMMIT = '03ecd9d18a329986f71214bb3ecd16b1b62ff264';
export const TAG_NAME = 'sdd-v3.0-baseline';

const DECLARATION_PATH = join(CHANGE_ROOT, 'stable-release-declaration.json');
const CANDIDATE_ARCHIVE_PATH =
  'openspec/changes/archive/2026-07-24-SPEC-SDD-0002-sdd-v3-stable-release';
const CANDIDATE_FILES = {
  verifyReport: `${
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release'
  }/verify-report.md`,
  repositoryReady: `${
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release'
  }/repository-ready.md`,
  archiveReport: `${CANDIDATE_ARCHIVE_PATH}/archive-report.md`,
  classification: `${
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release'
  }/evidence/stable-document-classification.json`,
  scope: `${'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release'}/validation/owned-path-scope.json`,
};

const EXPECTED_NOTE = 'The final tag will target the finalization commit, not the candidate commit.';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireExact(actual, expected, label, failures) {
  if (actual !== expected) failures.push(`${label} must be ${expected}`);
}

function requireBoolean(actual, expected, label, failures) {
  if (actual !== expected) failures.push(`${label} must be ${expected}`);
}

function requireFragment(document, fragment, label, failures) {
  if (typeof document !== 'string' || !document.includes(fragment)) {
    failures.push(`${label} is missing: ${fragment}`);
  }
}

function requireLine(document, key, expected, label, failures) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedExpected = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (
    typeof document !== 'string' ||
    !new RegExp(`^${escapedKey}:\\s*${escapedExpected}\\s*$`, 'm').test(document)
  ) {
    failures.push(`${label} must be ${expected}`);
  }
}

function validateDeclarationCandidatePreconditions(preconditions, failures) {
  if (!isObject(preconditions)) {
    failures.push('candidate_preconditions must be an object');
    return;
  }

  requireExact(preconditions.candidate_commit, CANDIDATE_COMMIT, 'candidate commit', failures);

  const verify = preconditions.verify_report;
  if (!isObject(verify)) {
    failures.push('candidate verify_report precondition is required');
  } else {
    requireExact(verify.status, 'VERIFIED', 'candidate verify status', failures);
    requireExact(verify.decision, 'VERIFIED', 'candidate verify decision', failures);
  }

  const repositoryReady = preconditions.repository_ready;
  if (!isObject(repositoryReady)) {
    failures.push('candidate repository_ready precondition is required');
  } else {
    requireExact(repositoryReady.status, 'REPOSITORY_READY', 'candidate readiness status', failures);
    requireExact(repositoryReady.gate_status, 'PASS_WITH_WARNINGS', 'candidate readiness gate', failures);
    if (!Array.isArray(repositoryReady.blocking_findings)) {
      failures.push('candidate readiness blocking_findings must be an array');
    } else if (repositoryReady.blocking_findings.length !== 0) {
      failures.push('candidate readiness must have no blockers');
    }
  }

  const archive = preconditions.archive;
  if (!isObject(archive)) {
    failures.push('candidate archive precondition is required');
  } else {
    requireExact(archive.path, `${CANDIDATE_ARCHIVE_PATH}/`, 'candidate archive path', failures);
    requireExact(archive.status, 'ARCHIVED', 'candidate archive status', failures);
    requireExact(archive.decision, 'ARCHIVED_CANDIDATE_ONLY', 'candidate archive decision', failures);
  }

  const preFinalState = preconditions.pre_final_state;
  if (!isObject(preFinalState)) {
    failures.push('candidate pre_final_state is required');
  } else {
    requireExact(preFinalState.release_state, 'candidate', 'candidate release state', failures);
    requireExact(preFinalState.stable_declaration, 'NOT_EXECUTED', 'candidate Stable declaration', failures);
    requireExact(
      preFinalState.freeze_state_after_final_gate,
      'PENDING',
      'candidate freeze state',
      failures,
    );
    requireExact(preFinalState.planned_tag_state, 'NOT_PUBLISHED', 'candidate tag state', failures);
    requireExact(preFinalState.final_gate_status, 'NOT_EXECUTED', 'candidate final-gate status', failures);
  }
}

export function validateDeclaration(declaration) {
  const failures = [];
  if (!isObject(declaration)) return ['final declaration must be an object'];

  requireExact(declaration.schema, 'sdd-v3-final-release/v1', 'declaration schema', failures);
  requireExact(declaration.change, CHANGE_NAME, 'declaration change', failures);
  requireExact(declaration.release_id, 'sdd-v3.0-stable', 'declaration release_id', failures);
  requireExact(declaration.version, 'v3.0', 'declaration version', failures);
  requireExact(
    declaration.implementation_baseline,
    IMPLEMENTATION_BASELINE,
    'implementation baseline',
    failures,
  );
  requireExact(declaration.verified_commit, CANDIDATE_COMMIT, 'verified candidate commit', failures);
  requireExact(declaration.release_state, 'stable', 'final release state', failures);
  requireExact(declaration.stable_declaration, 'EXECUTED', 'Stable declaration', failures);
  requireExact(declaration.planned_baseline_tag, TAG_NAME, 'planned baseline tag', failures);
  requireExact(declaration.tag_state, 'PENDING_FINAL_TAG', 'final tag state', failures);
  requireExact(
    declaration.freeze_state_after_final_gate,
    'ACTIVE',
    'final freeze state',
    failures,
  );

  const finalGate = declaration.final_gate;
  if (!isObject(finalGate)) {
    failures.push('final_gate must be an object');
  } else {
    requireExact(finalGate.status, 'EXECUTED', 'final-gate status', failures);
    requireExact(finalGate.authority, 'manual-maintainer-release-tag', 'final-gate authority', failures);
    requireExact(finalGate.verified_commit, CANDIDATE_COMMIT, 'final-gate verified commit', failures);
    requireExact(finalGate.automatic_transition, 'FORBIDDEN', 'automatic transition policy', failures);
    if (finalGate.finalization_commit_hash !== null) {
      failures.push('finalization commit hash must remain unclaimed in the self-referencing declaration');
    }
  }

  const compatibility = declaration.compatibility;
  if (!isObject(compatibility)) {
    failures.push('compatibility policy is required');
  } else {
    const legacy = compatibility.pre_v3_0;
    if (!isObject(legacy)) {
      failures.push('pre-v3.0 compatibility policy is required');
    } else {
      requireExact(legacy.status, 'PASS_WITH_LEGACY_BASELINE', 'legacy compatibility status', failures);
      requireExact(legacy.aggregate, 'not-claimed', 'legacy aggregate policy', failures);
      requireExact(legacy.scope, 'pre-v3.0 evidence only', 'legacy compatibility scope', failures);
    }

    const strict = compatibility.v3_0_plus;
    if (!isObject(strict)) {
      failures.push('v3.0+ compatibility policy is required');
    } else {
      requireExact(strict.status, 'STRICT', 'v3.0+ compatibility status', failures);
      requireBoolean(strict.source_commit_required, true, 'v3.0+ source commit requirement', failures);
      requireExact(strict.source_commit_format, '40-lowercase-hex', 'v3.0+ source commit format', failures);
      requireExact(strict.aggregate, 'canonical-v3-aggregate/v1', 'v3.0+ aggregate', failures);
      requireExact(
        strict.aggregate_definition,
        'qualifying_included / included_v3_records',
        'v3.0+ aggregate definition',
        failures,
      );
    }
  }

  validateDeclarationCandidatePreconditions(declaration.candidate_preconditions, failures);

  const tagBinding = declaration.tag_binding;
  if (!isObject(tagBinding)) {
    failures.push('tag_binding must be an object');
  } else {
    requireExact(tagBinding.target, 'finalization_commit', 'tag binding target', failures);
    requireBoolean(tagBinding.candidate_commit_is_target, false, 'candidate tag-target policy', failures);
    if (tagBinding.finalization_commit_hash !== null) {
      failures.push('tag binding must not claim a finalization commit hash');
    }
    requireExact(
      tagBinding.post_tag_check,
      `${TAG_NAME} must resolve to the finalization commit, not the verified candidate commit`,
      'post-tag binding check',
      failures,
    );
  }

  if (!Array.isArray(declaration.notes) || !declaration.notes.some((note) => note === EXPECTED_NOTE)) {
    failures.push('declaration note must state that the final tag targets the finalization commit, not the candidate commit');
  }

  return failures;
}

export function validateCandidatePreconditions({
  verifyReport,
  repositoryReady,
  archiveReport,
  classification,
  scope,
} = {}) {
  const failures = [];

  requireLine(verifyReport, 'status', 'VERIFIED', 'candidate verify report status', failures);
  requireLine(verifyReport, 'decision', 'VERIFIED', 'candidate verify report decision', failures);
  requireLine(verifyReport, 'critical_findings', '0', 'candidate critical findings', failures);
  requireLine(verifyReport, 'requirements', '6/6', 'candidate requirements', failures);
  requireLine(verifyReport, 'scenarios', '6/6', 'candidate scenarios', failures);

  requireLine(repositoryReady, 'status', 'REPOSITORY_READY', 'candidate repository-ready status', failures);
  requireLine(repositoryReady, 'decision', 'REPOSITORY_READY_WITH_WARNINGS', 'candidate repository-ready decision', failures);
  requireFragment(
    repositoryReady,
    '**Status:** `PASS_WITH_WARNINGS`',
    'candidate repository-ready gate status',
    failures,
  );
  requireLine(repositoryReady, 'blocking_findings', '[]', 'candidate blockers', failures);

  requireLine(archiveReport, 'status', 'ARCHIVED', 'candidate archive status', failures);
  requireLine(archiveReport, 'decision', 'ARCHIVED_CANDIDATE_ONLY', 'candidate archive decision', failures);
  requireLine(archiveReport, 'verification', 'VERIFIED', 'candidate archive verification', failures);

  if (!isObject(classification)) {
    failures.push('candidate document classification must be an object');
  } else {
    requireExact(classification.schema, 'sdd-v3-document-classification/v1', 'candidate classification schema', failures);
    requireExact(classification.change, CHANGE_NAME, 'candidate classification change', failures);
    requireExact(classification.release_state, 'candidate', 'candidate classification release state', failures);
    requireExact(classification.stable_declaration, 'NOT_EXECUTED', 'candidate classification Stable state', failures);
    requireExact(classification.freeze_state, 'UNCHANGED', 'candidate classification freeze state', failures);
    requireExact(classification.planned_tag_state, 'NOT_PUBLISHED', 'candidate classification tag state', failures);
  }

  if (!isObject(scope)) {
    failures.push('candidate owned-path scope must be an object');
  } else {
    requireExact(scope.baseline_commit, IMPLEMENTATION_BASELINE, 'candidate scope baseline', failures);
    requireExact(scope.release_state, 'candidate', 'candidate scope release state', failures);
    requireExact(scope.stable_declaration, 'NOT_EXECUTED', 'candidate scope Stable state', failures);
    requireExact(scope.freeze_state_after_final_gate, 'PENDING', 'candidate scope freeze state', failures);
    requireExact(scope.planned_tag_state, 'NOT_PUBLISHED', 'candidate scope tag state', failures);
  }

  return failures;
}

async function runGit(args) {
  return execFileAsync('git', args, { cwd: REPOSITORY_ROOT });
}

async function readGitFile(commit, path) {
  try {
    const { stdout } = await runGit(['show', `${commit}:${path}`]);
    return stdout;
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readGitJson(commit, path) {
  const content = await readGitFile(commit, path);
  if (content === null) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function loadCandidatePreconditions() {
  const [verifyReport, repositoryReady, archiveReport, classification, scope] = await Promise.all([
    readGitFile(CANDIDATE_COMMIT, CANDIDATE_FILES.verifyReport),
    readGitFile(CANDIDATE_COMMIT, CANDIDATE_FILES.repositoryReady),
    readGitFile(CANDIDATE_COMMIT, CANDIDATE_FILES.archiveReport),
    readGitJson(CANDIDATE_COMMIT, CANDIDATE_FILES.classification),
    readGitJson(CANDIDATE_COMMIT, CANDIDATE_FILES.scope),
  ]);

  return {
    verifyReport,
    repositoryReady,
    archiveReport,
    classification,
    scope,
  };
}

async function requireCandidateFiles(failures) {
  try {
    const { stdout } = await runGit([
      'ls-tree',
      '-r',
      '--name-only',
      CANDIDATE_COMMIT,
      '--',
      CANDIDATE_ARCHIVE_PATH,
    ]);
    if (!stdout.split('\n').includes(CANDIDATE_FILES.archiveReport)) {
      failures.push(`candidate archive is missing from ${CANDIDATE_COMMIT}`);
    }
  } catch (error) {
    failures.push(`candidate archive cannot be inspected: ${error.message}`);
  }

  for (const [name, path] of Object.entries(CANDIDATE_FILES)) {
    if (name === 'archiveReport') continue;
    if ((await readGitFile(CANDIDATE_COMMIT, path)) === null) {
      failures.push(`candidate artifact is missing from ${CANDIDATE_COMMIT}: ${path}`);
    }
  }
}

async function currentHead() {
  const { stdout } = await runGit(['rev-parse', 'HEAD']);
  return stdout.trim();
}

async function candidateCommitExists() {
  try {
    const { stdout } = await runGit(['rev-parse', '--verify', `${CANDIDATE_COMMIT}^{commit}`]);
    return stdout.trim() === CANDIDATE_COMMIT;
  } catch {
    return false;
  }
}

async function candidateIsAncestor() {
  try {
    await runGit(['merge-base', '--is-ancestor', CANDIDATE_COMMIT, 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

async function tagExists() {
  try {
    await runGit(['show-ref', '--verify', '--quiet', `refs/tags/${TAG_NAME}`]);
    return true;
  } catch {
    return false;
  }
}

async function tagTarget() {
  const { stdout } = await runGit(['rev-parse', '--verify', `refs/tags/${TAG_NAME}^{commit}`]);
  return stdout.trim();
}

export async function validateGitBinding({ mode = 'pre-tag' } = {}) {
  const failures = [];
  if (!['pre-tag', 'post-tag'].includes(mode)) {
    return { failures: [`unsupported validation mode: ${mode}`], currentHead: null, tagTarget: null };
  }

  if (!(await candidateCommitExists())) {
    failures.push(`verified candidate commit does not resolve exactly: ${CANDIDATE_COMMIT}`);
  }
  if (!(await candidateIsAncestor())) {
    failures.push(`HEAD must descend from the verified candidate commit: ${CANDIDATE_COMMIT}`);
  }

  let head = null;
  try {
    head = await currentHead();
  } catch (error) {
    failures.push(`current HEAD cannot be read: ${error.message}`);
  }

  const hasTag = await tagExists();
  let resolvedTag = null;
  if (mode === 'pre-tag') {
    if (hasTag) failures.push(`${TAG_NAME} must not exist in pre-tag mode`);
  } else if (!hasTag) {
    failures.push(`${TAG_NAME} is required in post-tag mode`);
  } else {
    try {
      resolvedTag = await tagTarget();
      if (resolvedTag !== head) {
        failures.push(`${TAG_NAME} must resolve to the finalization HEAD, not ${resolvedTag}`);
      }
      if (resolvedTag === CANDIDATE_COMMIT) {
        failures.push(`${TAG_NAME} must not target the verified candidate commit`);
      }
    } catch (error) {
      failures.push(`${TAG_NAME} target cannot be resolved: ${error.message}`);
    }
  }

  return { failures, currentHead: head, tagTarget: resolvedTag };
}

export async function runFinalGateValidation({ mode = 'pre-tag' } = {}) {
  const failures = [];
  let declaration;
  try {
    declaration = await readJson(DECLARATION_PATH);
    failures.push(...validateDeclaration(declaration));
  } catch (error) {
    failures.push(`final declaration cannot be read or parsed: ${error.message}`);
  }

  const candidate = await loadCandidatePreconditions();
  failures.push(...validateCandidatePreconditions(candidate));
  await requireCandidateFiles(failures);

  const binding = await validateGitBinding({ mode });
  failures.push(...binding.failures);

  return {
    failures,
    mode,
    currentHead: binding.currentHead,
    tagTarget: binding.tagTarget,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--post-tag') ? 'post-tag' : 'pre-tag';
  const result = await runFinalGateValidation({ mode });
  if (result.failures.length > 0) {
    console.error(`SPEC-SDD-0002 final-gate validation (${mode}): FAIL`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`SPEC-SDD-0002 final-gate validation (${mode}): PASS`);
    console.log(`- Verified candidate commit: ${CANDIDATE_COMMIT}`);
    console.log('- Candidate Verify, Repository Ready, archive, and pre-final state preconditions pass');
    console.log('- Stable declaration, active freeze, compatibility policy, and tag binding are exact');
    if (mode === 'pre-tag') {
      console.log(`- ${TAG_NAME} is intentionally not required until the finalization commit exists`);
    } else {
      console.log(`- ${TAG_NAME} resolves to finalization HEAD: ${result.tagTarget}`);
    }
  }
}
