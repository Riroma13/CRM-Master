import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { classifyPaths } from './validate-phase1.mjs';

const execFileAsync = promisify(execFile);
const VALIDATION_ROOT = dirname(fileURLToPath(import.meta.url));
const CHANGE_ROOT = resolve(VALIDATION_ROOT, '..');
const REPOSITORY_ROOT = resolve(CHANGE_ROOT, '../../..');
const CHANGE_NAME = 'SPEC-SDD-0002-sdd-v3-stable-release';
const CHANGE_PATH_PREFIX = `openspec/changes/${CHANGE_NAME}`;
const BASELINE_COMMIT = 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce';
const RELEASE_METADATA_MARKER = 'sdd-v3-release-contract:v1';
const LEGACY_STATUS_MARKER = 'sdd-v3-legacy-status:v1';

const paths = {
  adr: resolve(REPOSITORY_ROOT, 'docs/architecture/adr/0021-sdd-v3-stable-release.md'),
  manifest: resolve(REPOSITORY_ROOT, 'docs/architecture/sdd-v3.0-release-notes.md'),
  scope: join(VALIDATION_ROOT, 'owned-path-scope.json'),
};

const expectedCanonicalDocuments = [
  'docs/sdd-workflow-guard.md',
  'docs/templates/design-enterprise-template.md',
  'docs/templates/design-master-prompt.md',
  'docs/architecture/platform-baseline.md',
  'docs/architecture/sdd-infrastructure.md',
  'docs/architecture/adr/0021-sdd-v3-stable-release.md',
  'docs/architecture/sdd-v3.0-release-notes.md',
  'docs/architecture/CHANGELOG.md',
];

const requiredOptInFields = [
  'source_identity',
  'target_identity',
  'target_revision',
  'effective_design_boundary',
  'one_time_marker',
  'supersession_link',
  'completed_evidence',
];

const expectedLegacyMappings = [
  {
    path: 'docs/SDD-WORKFLOW.md',
    status: 'historical-compatible',
    replacement: 'docs/sdd-workflow-guard.md',
  },
  {
    path: 'docs/templates/design-prompt.md',
    status: 'deprecated',
    replacement: 'docs/templates/design-master-prompt.md',
  },
  {
    path: 'docs/architecture/sdd-v3-roadmap.md',
    status: 'superseded',
    replacement: 'docs/architecture/sdd-v3.0-release-notes.md',
  },
  { path: 'docs/roadmaps/**', status: 'historical-reference', replacement: null },
  { path: 'docs/history/**', status: 'historical-reference', replacement: null },
  {
    path: 'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**',
    status: 'historical-reference',
    replacement: null,
  },
  { path: 'product/runtime/**', status: 'not-in-release', replacement: null },
  { path: '.opencode/**', status: 'not-in-release', replacement: null },
];

const expectedLegacyStatus = new Map([
  [
    'docs/SDD-WORKFLOW.md',
    { status: 'historical-compatible', replacement: 'docs/sdd-workflow-guard.md' },
  ],
  [
    'docs/templates/design-prompt.md',
    { status: 'deprecated', replacement: 'docs/templates/design-master-prompt.md' },
  ],
  [
    'docs/architecture/sdd-v3-roadmap.md',
    { status: 'superseded', replacement: 'docs/architecture/sdd-v3.0-release-notes.md' },
  ],
]);

const phase2AllowedPaths = new Set([
  `${CHANGE_PATH_PREFIX}/tasks.md`,
  `${CHANGE_PATH_PREFIX}/evidence/phase-2-result.md`,
  `${CHANGE_PATH_PREFIX}/validation/owned-path-scope.json`,
  `${CHANGE_PATH_PREFIX}/validation/validate-phase1.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/validate-release.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/test/release-contract.test.mjs`,
  'docs/architecture/sdd-v3.0-release-notes.md',
  'docs/architecture/adr/0021-sdd-v3-stable-release.md',
]);

const phase3AllowedPaths = new Set([
  ...phase2AllowedPaths,
  `${CHANGE_PATH_PREFIX}/evidence/phase-3-result.md`,
  'docs/sdd-workflow-guard.md',
  'docs/templates/design-enterprise-template.md',
  'docs/templates/design-master-prompt.md',
  'docs/architecture/platform-baseline.md',
  'docs/architecture/sdd-infrastructure.md',
  'docs/architecture/CHANGELOG.md',
]);

const phase4AllowedPaths = new Set([
  ...phase3AllowedPaths,
  `${CHANGE_PATH_PREFIX}/evidence/phase-4-result.md`,
  ...expectedLegacyStatus.keys(),
]);

const phase5AllowedPaths = new Set([
  ...phase4AllowedPaths,
  `${CHANGE_PATH_PREFIX}/evidence/phase-5-result.md`,
  `${CHANGE_PATH_PREFIX}/validation/validate-phase5.mjs`,
  `${CHANGE_PATH_PREFIX}/validation/test/phase5-readiness.test.mjs`,
]);

const expectedReleaseMetadata = {
  release_id: 'sdd-v3.0-stable',
  version: 'v3.0',
  implementation_baseline: BASELINE_COMMIT,
  planned_baseline_tag: 'sdd-v3.0-baseline',
  release_state: 'candidate',
  stable_declaration: 'maintainer-only-after-repository-ready',
  planned_tag_state: 'NOT_PUBLISHED',
  freeze_state_after_final_gate: 'PENDING',
  pre_v3_0_compatibility: 'PASS_WITH_LEGACY_BASELINE',
  v3_0_plus_aggregate: 'canonical-v3-aggregate/v1',
  approval_record: `${CHANGE_PATH_PREFIX}/architecture-review.md`,
  manifest: 'docs/architecture/sdd-v3.0-release-notes.md',
  adr: 'docs/architecture/adr/0021-sdd-v3-stable-release.md',
};

const forbiddenChangedPathPrefixes = [
  'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/',
  'openspec/changes/archive/',
  '.opencode/',
  'apps/',
  'packages/',
  'scripts/',
  'docs/history/',
  'pnpm-lock.yaml',
];

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function requireExact(actual, expected, label, failures) {
  if (actual !== expected) failures.push(`${label} must be ${expected}`);
}

function requireNonEmpty(actual, label, failures) {
  if (!isNonEmptyString(actual)) failures.push(`${label} is required`);
}

function validateManifest(manifest, failures) {
  if (!isObject(manifest)) {
    failures.push('manifest must be an object');
    return;
  }

  requireExact(manifest.phase, 3, 'manifest.phase', failures);
  requireExact(manifest.release_id, 'sdd-v3.0-stable', 'manifest.release_id', failures);
  requireExact(manifest.version, 'v3.0', 'manifest.version', failures);
  requireExact(
    manifest.implementation_baseline,
    BASELINE_COMMIT,
    'manifest.implementation_baseline',
    failures,
  );
  requireExact(
    manifest.planned_baseline_tag,
    'sdd-v3.0-baseline',
    'manifest.planned_baseline_tag',
    failures,
  );
  requireExact(manifest.release_state, 'candidate', 'manifest.release_state', failures);
  requireExact(
    manifest.stable_declaration,
    'maintainer-only-after-repository-ready',
    'manifest.stable_declaration',
    failures,
  );
  requireExact(manifest.planned_tag_state, 'NOT_PUBLISHED', 'manifest.planned_tag_state', failures);
  requireExact(
    manifest.freeze_state_after_final_gate,
    'PENDING',
    'manifest.freeze_state_after_final_gate',
    failures,
  );

  failures.push(...validateFinalGateState(manifest));

  requireExact(
    manifest.approval_record,
    `${CHANGE_PATH_PREFIX}/architecture-review.md`,
    'manifest.approval_record',
    failures,
  );

  if (!Array.isArray(manifest.canonical_documents)) {
    failures.push('canonical document set is required');
  } else {
    if (!unique(manifest.canonical_documents)) {
      failures.push('canonical document set contains duplicates');
    }
    if (manifest.canonical_documents.length !== expectedCanonicalDocuments.length) {
      failures.push('canonical document set must contain exactly eight documents');
    }
    for (const path of expectedCanonicalDocuments) {
      if (!manifest.canonical_documents.includes(path)) {
        failures.push(`missing canonical document: ${path}`);
      }
    }
  }
}

function validateCompatibility(compatibility, failures) {
  if (!isObject(compatibility)) {
    failures.push('compatibility contract is required');
    return;
  }

  const legacy = compatibility.pre_v3_0;
  if (!isObject(legacy)) {
    failures.push('pre-v3.0 compatibility contract is required');
  } else {
    requireExact(legacy.version, 'v2.1', 'pre-v3.0 version', failures);
    requireExact(
      legacy.status,
      'PASS_WITH_LEGACY_BASELINE',
      'pre-v3.0 compatibility status',
      failures,
    );
    requireExact(
      legacy.source_commit_policy,
      'accepted-historical-limitation',
      'pre-v3.0 source commit policy',
      failures,
    );
    requireExact(legacy.aggregate, 'not-claimed', 'pre-v3.0 aggregate', failures);
  }

  const v3 = compatibility.v3_0_plus;
  if (!isObject(v3)) {
    failures.push('v3.0+ compatibility contract is required');
  } else {
    requireExact(v3.version, 'v3.0+', 'v3.0+ version', failures);
    if (v3.source_commit_required !== true) {
      failures.push('v3.0+ source commit is required');
    }
    requireExact(
      v3.source_commit_format,
      '40-lowercase-hex',
      'v3.0+ source commit format',
      failures,
    );
    requireExact(v3.aggregate, 'canonical-v3-aggregate/v1', 'v3.0+ aggregate', failures);
    requireExact(
      v3.aggregate_definition,
      'qualifying_included / included_v3_records',
      'v3.0+ aggregate definition',
      failures,
    );
  }
}

function validateOptInContract(contract, failures) {
  if (!isObject(contract)) {
    failures.push('one-time opt-in contract is required');
    return;
  }

  requireExact(contract.source_version, 'v2.1', 'opt-in source version', failures);
  requireExact(contract.target_version, 'v3.0', 'opt-in target version', failures);

  if (!Array.isArray(contract.required_fields)) {
    failures.push('opt-in required fields are missing');
  } else {
    if (!unique(contract.required_fields))
      failures.push('opt-in required fields contain duplicates');
    for (const field of requiredOptInFields) {
      if (!contract.required_fields.includes(field)) {
        failures.push(`opt-in required field is missing: ${field}`);
      }
    }
  }

  requireExact(contract.one_time_marker, 'required-and-unique', 'opt-in one-time marker', failures);
  requireExact(
    contract.preservation_rule,
    'completed v2.1 evidence is preserved and never rewritten',
    'opt-in preservation rule',
    failures,
  );
  requireExact(
    contract.reopened_rule,
    'reopened v2.1 work creates a new v3.0 revision and supersedes the v2.1 revision',
    'opt-in reopened rule',
    failures,
  );
}

function validateOptIns(optIns, failures) {
  if (!Array.isArray(optIns)) {
    failures.push('opt-in records must be an array');
    return;
  }

  const markers = [];
  const sourceIdentities = [];
  const targetIdentities = [];
  for (const [index, record] of optIns.entries()) {
    if (!isObject(record)) {
      failures.push(`opt-in record ${index + 1} must be an object`);
      continue;
    }

    requireExact(record.source_version, 'v2.1', `opt-in ${index + 1} source version`, failures);
    requireExact(record.target_version, 'v3.0', `opt-in ${index + 1} target version`, failures);

    for (const field of requiredOptInFields) {
      requireNonEmpty(record[field], `opt-in ${index + 1} ${field}`, failures);
    }
    if (record.completed_evidence !== 'preserved') {
      failures.push(`opt-in ${index + 1} completed evidence must be preserved`);
    }
    if (
      isNonEmptyString(record.source_identity) &&
      isNonEmptyString(record.target_identity) &&
      !record.supersession_link.includes(record.source_identity)
    ) {
      failures.push(`opt-in ${index + 1} supersession link omits the source identity`);
    }
    if (
      isNonEmptyString(record.source_identity) &&
      isNonEmptyString(record.target_identity) &&
      !record.supersession_link.includes(record.target_identity)
    ) {
      failures.push(`opt-in ${index + 1} supersession link omits the target identity`);
    }

    markers.push(record.one_time_marker);
    sourceIdentities.push(record.source_identity);
    targetIdentities.push(record.target_identity);
  }

  if (!unique(markers)) failures.push('opt-in one-time markers must be unique');
  if (!unique(sourceIdentities)) failures.push('opt-in source identities must be unique');
  if (!unique(targetIdentities)) failures.push('opt-in target identities must be unique');
}

function validateLegacyMappings(mappings, failures) {
  if (!Array.isArray(mappings)) {
    failures.push('legacy document mappings are required');
    return;
  }

  const paths = mappings.map((entry) => entry?.path);
  if (!unique(paths)) failures.push('legacy document mappings contain duplicate paths');

  for (const expected of expectedLegacyMappings) {
    const actual = mappings.find((entry) => entry?.path === expected.path);
    if (!actual) {
      failures.push(`legacy mapping is missing: ${expected.path}`);
      continue;
    }
    requireExact(
      actual.status,
      expected.status,
      `legacy mapping status for ${expected.path}`,
      failures,
    );
    requireExact(
      actual.replacement,
      expected.replacement,
      `legacy mapping replacement for ${expected.path}`,
      failures,
    );
    requireExact(
      actual.source_version,
      'v2.1',
      `legacy mapping source version for ${expected.path}`,
      failures,
    );
    if (actual.immutable !== true) {
      failures.push(`legacy mapping must be immutable: ${expected.path}`);
    }
  }
}

function validateEvidence(evidence, failures) {
  if (!Array.isArray(evidence)) {
    failures.push('evidence records must be an array');
    return;
  }

  for (const [index, record] of evidence.entries()) {
    if (!isObject(record)) {
      failures.push(`evidence record ${index + 1} must be an object`);
      continue;
    }
    const version = record.version ?? record.source_version;
    if (typeof version !== 'string') {
      failures.push(`evidence record ${index + 1} version is required`);
      continue;
    }

    if (version.startsWith('v3')) {
      if (!/^[0-9a-f]{40}$/.test(record.source_commit ?? '')) {
        failures.push(`v3.0 evidence ${index + 1} requires an explicit source commit`);
      } else if (/^0+$/.test(record.source_commit)) {
        failures.push(`v3.0 evidence ${index + 1} cannot use an all-zero source commit`);
      }
      requireExact(
        record.aggregate,
        'canonical-v3-aggregate/v1',
        `v3.0 evidence ${index + 1} aggregate`,
        failures,
      );
    } else if (version === 'v2.1' && record.aggregate !== 'PASS_WITH_LEGACY_BASELINE') {
      failures.push(`pre-v3.0 evidence ${index + 1} must retain PASS_WITH_LEGACY_BASELINE`);
    }
  }
}

function validatePreservation(preservation, failures) {
  if (!isObject(preservation)) {
    failures.push('historical preservation contract is required');
    return;
  }
  if (preservation.historical_v2_1_immutable !== true) {
    failures.push('historical v2.1 evidence must be immutable');
  }
  requireExact(preservation.completed_evidence, 'preserved', 'completed evidence policy', failures);
  if (!Array.isArray(preservation.historical_paths)) {
    failures.push('historical paths are required');
    return;
  }
  for (const path of [
    'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**',
    'openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/**',
  ]) {
    if (!preservation.historical_paths.includes(path)) {
      failures.push(`historical preservation path is missing: ${path}`);
    }
  }
}

function parseReleaseMetadata(markdown) {
  return parseMetadataBlocks(markdown, RELEASE_METADATA_MARKER);
}

function parseMetadataBlocks(markdown, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<!--\\s*${escapedMarker}\\s*\\n([\\s\\S]*?)\\n-->`, 'g');

  return [...markdown.matchAll(pattern)].map((match) => {
    const metadata = {};
    for (const line of match[1].split('\n')) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
    return metadata;
  });
}

export function validateFinalGateState(manifest) {
  const failures = [];
  if (!isObject(manifest)) {
    failures.push('manifest is required for final-gate validation');
    return failures;
  }

  requireExact(manifest.release_state, 'candidate', 'release-candidate state', failures);
  requireExact(
    manifest.stable_declaration,
    'maintainer-only-after-repository-ready',
    'Stable declaration boundary',
    failures,
  );
  requireExact(manifest.planned_tag_state, 'NOT_PUBLISHED', 'planned tag state', failures);
  requireExact(
    manifest.freeze_state_after_final_gate,
    'PENDING',
    'freeze reactivation state',
    failures,
  );

  if (!isObject(manifest.final_gate)) {
    failures.push('final-gate state is required');
    return failures;
  }

  requireExact(manifest.final_gate.status, 'NOT_EXECUTED', 'final-gate status', failures);
  requireExact(
    manifest.final_gate.authority,
    'manual-maintainer-release-tag',
    'final-gate authority',
    failures,
  );
  requireExact(
    manifest.final_gate.verified_commit,
    'DEFERRED',
    'final-gate verified commit',
    failures,
  );
  requireExact(
    manifest.final_gate.allowed_future_transition,
    'manual Release/Tag after Repository Ready',
    'allowed future transition',
    failures,
  );
  requireExact(
    manifest.final_gate.automatic_transition,
    'FORBIDDEN',
    'automatic transition policy',
    failures,
  );
  if (manifest.final_gate.requires_verified_commit !== true) {
    failures.push('final-gate requires the verified commit');
  }

  return failures;
}

export function validateLegacyDocumentStatus(document) {
  const failures = [];
  const expected = expectedLegacyStatus.get(document?.path);
  if (!expected) {
    failures.push(`unexpected legacy status path: ${document?.path || '<missing path>'}`);
    return failures;
  }
  if (typeof document.content !== 'string') {
    failures.push(`legacy status content is not text: ${document.path}`);
    return failures;
  }

  const blocks = parseMetadataBlocks(document.content, LEGACY_STATUS_MARKER);
  if (blocks.length !== 1) {
    failures.push(`${document.path} must contain exactly one ${LEGACY_STATUS_MARKER} block`);
    return failures;
  }

  const metadata = blocks[0];
  const expectedFields = {
    status: expected.status,
    source_version: 'v2.1',
    replacement: expected.replacement,
    immutable: 'true',
    release_id: 'sdd-v3.0-stable',
    release_state: 'candidate',
    stable_declaration: 'maintainer-only-after-repository-ready',
    planned_tag_state: 'NOT_PUBLISHED',
    freeze_state_after_final_gate: 'PENDING',
    final_gate_authority: 'manual-maintainer-release-tag',
    allowed_future_transition: 'manual Release/Tag after Repository Ready',
    automatic_transition: 'FORBIDDEN',
  };

  for (const [key, value] of Object.entries(expectedFields)) {
    requireExact(metadata[key], value, `${document.path} legacy status ${key}`, failures);
  }
  for (const key of Object.keys(metadata)) {
    if (!Object.hasOwn(expectedFields, key)) {
      failures.push(`${document.path} legacy status contains an unknown field: ${key}`);
    }
  }

  for (const pattern of [
    /release_state:\s*stable/i,
    /planned_tag_state:\s*published/i,
    /freeze_state_after_final_gate:\s*ACTIVE/i,
  ]) {
    if (pattern.test(document.content)) {
      failures.push(`${document.path} contains a premature release or freeze state: ${pattern}`);
    }
  }

  return failures;
}

export async function loadLegacyDocuments() {
  return Promise.all(
    [...expectedLegacyStatus.keys()].map(async (path) => ({
      path,
      content: await readFile(resolve(REPOSITORY_ROOT, path), 'utf8'),
    })),
  );
}

export function validateLegacyDocuments(documents) {
  const failures = [];
  if (!Array.isArray(documents)) return ['legacy documents must be an array'];

  const paths = documents.map((document) => document?.path);
  if (!unique(paths)) failures.push('legacy status documents contain duplicate paths');
  if (documents.length !== expectedLegacyStatus.size) {
    failures.push(
      `legacy status documents must contain exactly ${expectedLegacyStatus.size} documents`,
    );
  }

  for (const path of expectedLegacyStatus.keys()) {
    const matches = documents.filter((document) => document?.path === path);
    if (matches.length === 0) {
      failures.push(`legacy status document is missing: ${path}`);
      continue;
    }
    failures.push(...validateLegacyDocumentStatus(matches[0]));
  }

  return failures;
}

export function validateCrossDocumentContract(documents) {
  const failures = [];
  if (!Array.isArray(documents)) return ['authoritative documents must be an array'];

  const documentPaths = documents.map((document) => document?.path);
  if (!unique(documentPaths)) failures.push('authoritative documents contain duplicate paths');
  if (documents.length !== expectedCanonicalDocuments.length) {
    failures.push('authoritative document set must contain exactly eight documents');
  }

  for (const path of expectedCanonicalDocuments) {
    const candidates = documents.filter((document) => document?.path === path);
    if (candidates.length === 0) {
      failures.push(`authoritative document is missing: ${path}`);
      continue;
    }

    const markdown = candidates[0].content;
    if (typeof markdown !== 'string') {
      failures.push(`authoritative document content is not text: ${path}`);
      continue;
    }

    const metadataBlocks = parseReleaseMetadata(markdown);
    if (metadataBlocks.length !== 1) {
      failures.push(`${path} must contain exactly one ${RELEASE_METADATA_MARKER} block`);
      continue;
    }

    const metadata = metadataBlocks[0];
    for (const [key, expected] of Object.entries(expectedReleaseMetadata)) {
      if (metadata[key] !== expected) {
        failures.push(`${path} metadata ${key} must be ${expected}`);
      }
    }
    for (const key of Object.keys(metadata)) {
      if (!Object.hasOwn(expectedReleaseMetadata, key)) {
        failures.push(`${path} metadata contains an unknown field: ${key}`);
      }
    }

    for (const pattern of [
      /\bv3\.0\.0\b/,
      /release_state:\s*stable/i,
      /stable_declaration:\s*published/i,
      /planned_tag_state:\s*published/i,
      /freeze_state_after_final_gate:\s*ACTIVE/i,
    ]) {
      if (pattern.test(metadataBlocks[0])) {
        failures.push(`${path} contains a premature or alternate release state: ${pattern}`);
      }
    }
  }

  for (const document of documents) {
    if (!expectedCanonicalDocuments.includes(document?.path)) {
      failures.push(`unexpected authoritative document: ${document?.path || '<missing path>'}`);
    }
  }

  return failures;
}

function documentByPath(documents, path) {
  return documents.find((document) => document.path === path)?.content;
}

function requireDocumentFragment(markdown, path, fragment, failures) {
  if (!markdown?.includes(fragment)) {
    failures.push(`${path} is missing required contract reference: ${fragment}`);
  }
}

function validateDesignShape(markdown, failures) {
  const sectionNumbers = [...markdown.matchAll(/^## (\d+)\./gm)].map((match) => Number(match[1]));
  const expectedSections = Array.from({ length: 18 }, (_, index) => index + 1);
  if (JSON.stringify(sectionNumbers) !== JSON.stringify(expectedSections)) {
    failures.push('Enterprise Design Template must preserve exactly sections 1 through 18');
  }

  const preparationTopics = [...markdown.matchAll(/^### ([A-G])\./gm)].map((match) => match[1]);
  if (JSON.stringify(preparationTopics) !== JSON.stringify(['A', 'B', 'C', 'D', 'E', 'F', 'G'])) {
    failures.push(
      'Enterprise Design Template must preserve exactly Architecture Review topics A-G',
    );
  }
}

function validateCanonicalDocumentText(documents, failures) {
  const guardPath = 'docs/sdd-workflow-guard.md';
  const guard = documentByPath(documents, guardPath);
  for (const fragment of [
    '## Transition Table',
    '## Direct Mode (Opt-In, Project-Local)',
    'A clean Tasks Review authorizes the automatic post-review execution chain;',
    'Commit, Push, Merge, Release, and Tag',
  ]) {
    requireDocumentFragment(guard, guardPath, fragment, failures);
  }

  const templatePath = 'docs/templates/design-enterprise-template.md';
  const template = documentByPath(documents, templatePath);
  if (template) validateDesignShape(template, failures);

  const changelogPath = 'docs/architecture/CHANGELOG.md';
  const changelog = documentByPath(documents, changelogPath);
  if (changelog && (changelog.match(/^## Candidate: SDD v3\.0$/gm) ?? []).length !== 1) {
    failures.push('Architecture Changelog must contain exactly one candidate v3.0 entry');
  }
  requireDocumentFragment(
    changelog,
    changelogPath,
    'docs/architecture/sdd-v3.0-release-notes.md',
    failures,
  );
  requireDocumentFragment(
    changelog,
    changelogPath,
    'docs/architecture/adr/0021-sdd-v3-stable-release.md',
    failures,
  );

  requireDocumentFragment(
    documentByPath(documents, 'docs/architecture/platform-baseline.md'),
    'docs/architecture/platform-baseline.md',
    'Historical v2.1 Baseline',
    failures,
  );
  requireDocumentFragment(
    documentByPath(documents, 'docs/architecture/sdd-infrastructure.md'),
    'docs/architecture/sdd-infrastructure.md',
    'final manual',
    failures,
  );
  requireDocumentFragment(
    documentByPath(documents, 'docs/architecture/sdd-infrastructure.md'),
    'docs/architecture/sdd-infrastructure.md',
    'Release/Tag gate',
    failures,
  );
  requireDocumentFragment(
    documentByPath(documents, 'docs/templates/design-master-prompt.md'),
    'docs/templates/design-master-prompt.md',
    'docs/architecture/sdd-v3.0-release-notes.md',
    failures,
  );
  requireDocumentFragment(
    documentByPath(documents, 'docs/architecture/sdd-v3.0-release-notes.md'),
    'docs/architecture/sdd-v3.0-release-notes.md',
    '## Document Status Classification',
    failures,
  );
  requireDocumentFragment(
    documentByPath(documents, 'docs/architecture/adr/0021-sdd-v3-stable-release.md'),
    'docs/architecture/adr/0021-sdd-v3-stable-release.md',
    '## Cross-Document Contract',
    failures,
  );
}

function validateChangedPaths(changedPaths, failures) {
  if (!Array.isArray(changedPaths)) {
    failures.push('changed_paths must be an array');
    return;
  }

  const normalized = changedPaths.map(normalizePath);
  for (const path of normalized) {
    if (forbiddenChangedPathPrefixes.some((prefix) => path.startsWith(prefix))) {
      failures.push(`forbidden historical or runtime path: ${path}`);
    } else if (!phase5AllowedPaths.has(path)) {
      failures.push(`unclassified path outside the Phase 5 Working Set: ${path}`);
    }
  }
}

export function validateReleaseContract(contract) {
  const failures = [];
  if (!isObject(contract)) return ['release contract must be an object'];

  requireExact(contract.schema, 'sdd-v3-release-contract/v1', 'release contract schema', failures);
  requireExact(contract.change, CHANGE_NAME, 'release contract change', failures);
  validateManifest(contract.manifest, failures);
  validateCompatibility(contract.compatibility, failures);
  validateOptInContract(contract.opt_in_contract, failures);
  validateOptIns(contract.opt_ins, failures);
  validateLegacyMappings(contract.legacy_document_mappings, failures);
  validatePreservation(contract.preservation, failures);
  validateEvidence(contract.evidence, failures);
  validateChangedPaths(contract.changed_paths, failures);

  return failures;
}

function extractJsonContract(markdown) {
  const match = markdown.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) throw new Error('release notes must contain one JSON contract block');
  return JSON.parse(match[1]);
}

function validateAdrText(markdown, failures) {
  for (const fragment of [
    'release_id`: `sdd-v3.0-stable`',
    'version`: `v3.0`',
    `implementation baseline: \`${BASELINE_COMMIT}\``,
    'planned tag: `sdd-v3.0-baseline`',
    'PASS_WITH_LEGACY_BASELINE',
    'canonical-v3-aggregate/v1',
    'architecture-review.md',
  ]) {
    if (!markdown.includes(fragment))
      failures.push(`ADR-0021 is missing contract text: ${fragment}`);
  }

  for (const pattern of [
    /release_state:\s*stable/i,
    /stable_declaration:\s*published/i,
    /planned_tag_state:\s*published/i,
    /freeze_state_after_final_gate:\s*ACTIVE/i,
    /\bv3\.0\.0\b/,
  ]) {
    if (pattern.test(markdown))
      failures.push(`ADR-0021 contains a premature or alternate state: ${pattern}`);
  }
}

function extractMarkdownSection(markdown, heading, nextHeading) {
  const start = markdown.indexOf(heading);
  if (start === -1) return '';
  const end = markdown.indexOf(nextHeading, start + heading.length);
  return markdown.slice(start, end === -1 ? markdown.length : end).trim();
}

function normalizeGuardTransitionTable(section) {
  return section
    .split('\n')
    .map((line) => {
      if (!line.trim().startsWith('|')) return line.trim();
      return line
        .trim()
        .split('|')
        .slice(1, -1)
        .map((cell) => {
          const normalizedCell = cell.trim();
          return /^-+$/.test(normalizedCell) ? '-' : normalizedCell;
        })
        .join('|');
    })
    .filter(Boolean)
    .join('\n');
}

async function validateGuardTransitionPreservation(currentGuard, failures) {
  let baselineGuard;
  try {
    const result = await execFileAsync(
      'git',
      ['show', `${BASELINE_COMMIT}:docs/sdd-workflow-guard.md`],
      { cwd: REPOSITORY_ROOT },
    );
    baselineGuard = result.stdout;
  } catch (error) {
    failures.push(`baseline Workflow Guard cannot be read: ${error.message}`);
    return;
  }

  const baselineTransitionTable = extractMarkdownSection(
    baselineGuard,
    '## Transition Table',
    '## Conditional Transitions',
  );
  const currentTransitionTable = extractMarkdownSection(
    currentGuard,
    '## Transition Table',
    '## Conditional Transitions',
  );
  if (
    normalizeGuardTransitionTable(baselineTransitionTable) !==
    normalizeGuardTransitionTable(currentTransitionTable)
  ) {
    failures.push('Workflow Guard transition semantics changed during metadata update');
  }
}

export async function validateReleaseDocuments() {
  const failures = [];
  let contract;
  const documents = [];

  for (const path of expectedCanonicalDocuments) {
    try {
      documents.push({
        path,
        content: await readFile(resolve(REPOSITORY_ROOT, path), 'utf8'),
      });
    } catch (error) {
      failures.push(`authoritative document cannot be read (${path}): ${error.message}`);
    }
  }

  const manifest = documentByPath(documents, 'docs/architecture/sdd-v3.0-release-notes.md');
  if (manifest) {
    try {
      contract = extractJsonContract(manifest);
    } catch (error) {
      failures.push(`release manifest cannot be parsed: ${error.message}`);
    }
  }

  if (contract) failures.push(...validateReleaseContract(contract));
  failures.push(...validateCrossDocumentContract(documents));
  validateCanonicalDocumentText(documents, failures);

  try {
    failures.push(...validateLegacyDocuments(await loadLegacyDocuments()));
  } catch (error) {
    failures.push(`legacy status documents cannot be read: ${error.message}`);
  }

  const adr = documentByPath(documents, 'docs/architecture/adr/0021-sdd-v3-stable-release.md');
  if (adr) validateAdrText(adr, failures);

  const guard = documentByPath(documents, 'docs/sdd-workflow-guard.md');
  if (guard) await validateGuardTransitionPreservation(guard, failures);

  return { failures, contract };
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
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: REPOSITORY_ROOT });
  return stdout.trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function validateReleaseScope() {
  const scope = await readJson(paths.scope);
  const currentPaths = await currentWorktreePaths();
  const phase4Scope = {
    ...scope,
    phase_owned_paths: [
      ...scope.phase_owned_paths,
      ...(scope.phase2_owned_paths ?? []),
      ...(scope.phase3_owned_paths ?? []),
      ...(scope.phase4_owned_paths ?? []),
      ...(scope.phase5_owned_paths ?? []),
    ],
  };
  const result = classifyPaths(currentPaths, phase4Scope);
  const failures = [...result.failures];

  if ((await currentHead()) !== BASELINE_COMMIT) {
    failures.push(`HEAD is not the approved baseline: ${BASELINE_COMMIT}`);
  }
  for (const path of currentPaths) {
    if (path.startsWith('openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/')) {
      failures.push(`historical SPEC-SDD-0001 path changed: ${path}`);
    }
  }

  return {
    failures,
    currentPathSummary: {
      owned: result.owned.length,
      preserved: result.preserved.length,
      future: result.future?.length ?? 0,
      transitioned: result.transitioned?.length ?? 0,
      excluded: result.excluded.length,
      deferred: result.deferred.length,
      unclassified: result.unclassified.length,
    },
  };
}

export async function runReleaseValidation() {
  const documentResult = await validateReleaseDocuments();
  const scopeResult = await validateReleaseScope();
  return {
    failures: [...documentResult.failures, ...scopeResult.failures],
    currentPathSummary: scopeResult.currentPathSummary,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runReleaseValidation();
  if (result.failures.length > 0) {
    console.error('SPEC-SDD-0002 release validation: FAIL');
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('SPEC-SDD-0002 release validation: PASS');
    console.log(`- Current paths: ${JSON.stringify(result.currentPathSummary)}`);
    console.log('- Candidate release identity and final-gate state are exact');
    console.log('- v2.1 opt-in, legacy mapping, preservation, and v3.0 evidence rules pass');
    console.log('- Historical, runtime, and unclassified paths fail closed');
  }
}
