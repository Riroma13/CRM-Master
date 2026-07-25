import assert from 'node:assert/strict';
import test from 'node:test';

const candidateContract = {
  schema: 'sdd-v3-release-contract/v1',
  change: 'SPEC-SDD-0002-sdd-v3-stable-release',
  manifest: {
    phase: 3,
    release_id: 'sdd-v3.0-stable',
    version: 'v3.0',
    implementation_baseline: 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce',
    planned_baseline_tag: 'sdd-v3.0-baseline',
    release_state: 'candidate',
    stable_declaration: 'maintainer-only-after-repository-ready',
    planned_tag_state: 'NOT_PUBLISHED',
    freeze_state_after_final_gate: 'PENDING',
    final_gate: {
      status: 'NOT_EXECUTED',
      authority: 'manual-maintainer-release-tag',
      verified_commit: 'DEFERRED',
      allowed_future_transition: 'manual Release/Tag after Repository Ready',
      automatic_transition: 'FORBIDDEN',
      requires_verified_commit: true,
    },
    approval_record: 'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md',
    canonical_documents: [
      'docs/sdd-workflow-guard.md',
      'docs/templates/design-enterprise-template.md',
      'docs/templates/design-master-prompt.md',
      'docs/architecture/platform-baseline.md',
      'docs/architecture/sdd-infrastructure.md',
      'docs/architecture/adr/0021-sdd-v3-stable-release.md',
      'docs/architecture/sdd-v3.0-release-notes.md',
      'docs/architecture/CHANGELOG.md',
    ],
  },
  compatibility: {
    pre_v3_0: {
      version: 'v2.1',
      status: 'PASS_WITH_LEGACY_BASELINE',
      source_commit_policy: 'accepted-historical-limitation',
      aggregate: 'not-claimed',
    },
    v3_0_plus: {
      version: 'v3.0+',
      source_commit_required: true,
      source_commit_format: '40-lowercase-hex',
      aggregate: 'canonical-v3-aggregate/v1',
      aggregate_definition: 'qualifying_included / included_v3_records',
    },
  },
  opt_in_contract: {
    source_version: 'v2.1',
    target_version: 'v3.0',
    required_fields: [
      'source_identity',
      'target_identity',
      'target_revision',
      'effective_design_boundary',
      'one_time_marker',
      'supersession_link',
      'completed_evidence',
    ],
    one_time_marker: 'required-and-unique',
    preservation_rule: 'completed v2.1 evidence is preserved and never rewritten',
    reopened_rule:
      'reopened v2.1 work creates a new v3.0 revision and supersedes the v2.1 revision',
  },
  legacy_document_mappings: [
    {
      path: 'docs/SDD-WORKFLOW.md',
      status: 'historical-compatible',
      replacement: 'docs/sdd-workflow-guard.md',
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'docs/templates/design-prompt.md',
      status: 'deprecated',
      replacement: 'docs/templates/design-master-prompt.md',
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'docs/architecture/sdd-v3-roadmap.md',
      status: 'superseded',
      replacement: 'docs/architecture/sdd-v3.0-release-notes.md',
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'docs/roadmaps/**',
      status: 'historical-reference',
      replacement: null,
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'docs/history/**',
      status: 'historical-reference',
      replacement: null,
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**',
      status: 'historical-reference',
      replacement: null,
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: 'product/runtime/**',
      status: 'not-in-release',
      replacement: null,
      source_version: 'v2.1',
      immutable: true,
    },
    {
      path: '.opencode/**',
      status: 'not-in-release',
      replacement: null,
      source_version: 'v2.1',
      immutable: true,
    },
  ],
  preservation: {
    historical_v2_1_immutable: true,
    completed_evidence: 'preserved',
    historical_paths: [
      'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/**',
      'openspec/changes/archive/2026-07-24-SPEC-SDD-0001-sdd-v3-stabilization/**',
    ],
  },
  opt_ins: [
    {
      source_version: 'v2.1',
      source_identity: 'SPEC-EXAMPLE-v2.1',
      target_version: 'v3.0',
      target_identity: 'SPEC-EXAMPLE-v3.0',
      target_revision: 'revision-1',
      effective_design_boundary: 'design-boundary-1',
      one_time_marker: 'opt-in-1',
      supersession_link: 'SPEC-EXAMPLE-v2.1 -> SPEC-EXAMPLE-v3.0',
      completed_evidence: 'preserved',
    },
  ],
  evidence: [
    {
      version: 'v3.0',
      source_commit: 'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce',
      aggregate: 'canonical-v3-aggregate/v1',
    },
  ],
  changed_paths: [
    'docs/architecture/sdd-v3.0-release-notes.md',
    'docs/architecture/adr/0021-sdd-v3-stable-release.md',
    'docs/sdd-workflow-guard.md',
    'docs/templates/design-enterprise-template.md',
    'docs/templates/design-master-prompt.md',
    'docs/architecture/platform-baseline.md',
    'docs/architecture/sdd-infrastructure.md',
    'docs/architecture/CHANGELOG.md',
    'docs/SDD-WORKFLOW.md',
    'docs/templates/design-prompt.md',
    'docs/architecture/sdd-v3-roadmap.md',
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-4-result.md',
  ],
};

const canonicalMetadata = `<!-- sdd-v3-release-contract:v1
release_id: sdd-v3.0-stable
version: v3.0
implementation_baseline: c028537bae6fe1d8ecafc3974cd9cf0e46a673ce
planned_baseline_tag: sdd-v3.0-baseline
release_state: candidate
stable_declaration: maintainer-only-after-repository-ready
planned_tag_state: NOT_PUBLISHED
freeze_state_after_final_gate: PENDING
pre_v3_0_compatibility: PASS_WITH_LEGACY_BASELINE
v3_0_plus_aggregate: canonical-v3-aggregate/v1
approval_record: openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/architecture-review.md
manifest: docs/architecture/sdd-v3.0-release-notes.md
adr: docs/architecture/adr/0021-sdd-v3-stable-release.md
-->`;

const canonicalDocuments = candidateContract.manifest.canonical_documents.map((path) => ({
  path,
  content: canonicalMetadata,
}));

async function validate(contract) {
  const { validateReleaseContract } = await import('../validate-release.mjs');
  return validateReleaseContract(contract);
}

test('accepts exactly one candidate v3.0 release contract', async () => {
  assert.deepEqual(await validate(candidateContract), []);
});

test('accepts one exact candidate metadata contract across the authoritative document set', async () => {
  const { validateCrossDocumentContract } = await import('../validate-release.mjs');

  assert.deepEqual(validateCrossDocumentContract(canonicalDocuments), []);
});

test('rejects stale or duplicated metadata in an authoritative document', async () => {
  const { validateCrossDocumentContract } = await import('../validate-release.mjs');
  const documents = structuredClone(canonicalDocuments);
  documents[0].content = documents[0].content.replace('version: v3.0', 'version: v2.1');
  documents[1].content = `${documents[1].content}\n${canonicalMetadata}`;

  assert.match(
    validateCrossDocumentContract(documents).join('\n'),
    /version|exactly one|duplicate/i,
  );
});

test('rejects duplicate or alternate release identities', async () => {
  const contract = structuredClone(candidateContract);
  contract.manifest.release_id = 'other-release';
  assert.match((await validate(contract)).join('\n'), /release_id/);
});

test('rejects Stable, published tag, or active freeze before the final gate', async () => {
  const contract = structuredClone(candidateContract);
  contract.manifest.release_state = 'stable';
  contract.manifest.stable_declaration = 'published';
  contract.manifest.freeze_state_after_final_gate = 'ACTIVE';
  assert.match((await validate(contract)).join('\n'), /final-gate|candidate|Stable|freeze/i);
});

test('rejects incomplete or repeated v2.1 opt-in records', async () => {
  const contract = structuredClone(candidateContract);
  contract.opt_ins[0].target_revision = undefined;
  contract.opt_ins.push(structuredClone(contract.opt_ins[0]));
  assert.match((await validate(contract)).join('\n'), /opt-in|revision|duplicate/i);
});

test('requires strict v3.0 source and aggregate evidence', async () => {
  const contract = structuredClone(candidateContract);
  contract.evidence[0].aggregate = 'PASS_WITH_LEGACY_BASELINE';
  assert.match((await validate(contract)).join('\n'), /canonical-v3-aggregate|source commit/i);
});

test('fails closed on an unclassified path', async () => {
  const contract = structuredClone(candidateContract);
  contract.changed_paths.push('docs/unclassified-governance-note.md');
  assert.match((await validate(contract)).join('\n'), /unclassified|Working Set/i);
});

test('requires every legacy document mapping and replacement', async () => {
  const contract = structuredClone(candidateContract);
  contract.legacy_document_mappings = contract.legacy_document_mappings.filter(
    (entry) => entry.path !== 'docs/templates/design-prompt.md',
  );

  assert.match((await validate(contract)).join('\n'), /legacy|mapping|replacement/i);
});

test('rejects historical mutation claims and incomplete preservation', async () => {
  const contract = structuredClone(candidateContract);
  contract.preservation.historical_v2_1_immutable = false;
  contract.changed_paths.push('openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md');

  assert.match((await validate(contract)).join('\n'), /historical|immutable|SPEC-SDD-0001/i);
});

test('accepts the candidate release manifest and ADR from the declared paths', async () => {
  const { validateReleaseDocuments } = await import('../validate-release.mjs');
  const result = await validateReleaseDocuments();

  assert.deepEqual(result.failures, []);
});

const legacyStatus = (status, replacement) => `<!-- sdd-v3-legacy-status:v1
status: ${status}
source_version: v2.1
replacement: ${replacement}
immutable: true
release_id: sdd-v3.0-stable
release_state: candidate
stable_declaration: maintainer-only-after-repository-ready
planned_tag_state: NOT_PUBLISHED
freeze_state_after_final_gate: PENDING
final_gate_authority: manual-maintainer-release-tag
allowed_future_transition: manual Release/Tag after Repository Ready
automatic_transition: FORBIDDEN
-->`;

test('accepts explicit candidate legacy status and the single manual final-gate transition', async () => {
  const { validateLegacyDocumentStatus, validateFinalGateState } =
    await import('../validate-release.mjs');

  assert.deepEqual(
    validateLegacyDocumentStatus({
      path: 'docs/SDD-WORKFLOW.md',
      content: legacyStatus('historical-compatible', 'docs/sdd-workflow-guard.md'),
    }),
    [],
  );
  assert.deepEqual(validateFinalGateState(candidateContract.manifest), []);
});

test('rejects legacy status that claims Stable, a published tag, or active freeze', async () => {
  const { validateLegacyDocumentStatus } = await import('../validate-release.mjs');
  const content = legacyStatus('historical-compatible', 'docs/sdd-workflow-guard.md')
    .replace('release_state: candidate', 'release_state: stable')
    .replace('planned_tag_state: NOT_PUBLISHED', 'planned_tag_state: PUBLISHED')
    .replace('freeze_state_after_final_gate: PENDING', 'freeze_state_after_final_gate: ACTIVE');

  assert.match(
    validateLegacyDocumentStatus({ path: 'docs/SDD-WORKFLOW.md', content }).join('\n'),
    /candidate|published|freeze|Stable/i,
  );
});

test('rejects an automatic or unverified future transition', async () => {
  const { validateFinalGateState } = await import('../validate-release.mjs');
  const manifest = structuredClone(candidateContract.manifest);
  manifest.final_gate.automatic_transition = 'ALLOWED';
  manifest.final_gate.verified_commit = 'not-final';

  assert.match(validateFinalGateState(manifest).join('\n'), /manual|automatic|verified/i);
});

test('validates all three secondary legacy documents from the repository', async () => {
  const { loadLegacyDocuments, validateLegacyDocuments } = await import('../validate-release.mjs');
  const documents = await loadLegacyDocuments();

  assert.equal(documents.length, 3);
  assert.deepEqual(validateLegacyDocuments(documents), []);
});

test('classifies Phase 4 legacy and evidence paths as future work during carried scope checks', async () => {
  const { classifyPaths, loadPhase1Artifacts } = await import('../validate-phase1.mjs');
  const { scope } = await loadPhase1Artifacts();
  const paths = [
    'docs/SDD-WORKFLOW.md',
    'docs/templates/design-prompt.md',
    'docs/architecture/sdd-v3-roadmap.md',
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/evidence/phase-4-result.md',
  ];

  const result = classifyPaths(paths, scope);

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.future, paths);
});
