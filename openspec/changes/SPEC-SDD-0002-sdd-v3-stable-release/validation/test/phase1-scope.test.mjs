import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyPaths,
  loadPhase1Artifacts,
  validatePhase1Artifacts,
  validateRequestedPaths,
} from '../validate-phase1.mjs';

test('accepts the captured Phase 1 scope and governance classification', async () => {
  const artifacts = await loadPhase1Artifacts();
  const result = await validatePhase1Artifacts(artifacts);

  assert.deepEqual(result.failures, []);
  assert.equal(result.currentPathSummary.unclassified, 0);
});

test('classifies pre-existing recovery and Direct paths as preserved exclusions', async () => {
  const { scope } = await loadPhase1Artifacts();
  const result = classifyPaths(
    [
      '.opencode/agents/sdd-direct-apply.md',
      'apps/api/src/app.module.ts',
      'docs/sdd-workflow-guard.md',
      'packages/database/prisma/schema.prisma',
    ],
    scope,
  );

  assert.deepEqual(result.failures, []);
  assert.equal(result.preserved.length + result.excluded.length, 4);
  assert.equal(result.excluded.length, 3);
});

test('accepts completed Apply Summary and Verify reports in the Verify transition', async () => {
  const { scope } = await loadPhase1Artifacts();
  const transitionedPaths = [
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/apply-summary.md',
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md',
  ];
  const result = classifyPaths(transitionedPaths, {
    ...scope,
    current_direct_phase: 'Verify',
  });

  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.transitioned, transitionedPaths);
  assert.deepEqual(result.deferred, []);
});

test('keeps downstream reports deferred before their allowed Direct phase', async () => {
  const { scope } = await loadPhase1Artifacts();
  const result = classifyPaths(
    [
      'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/apply-summary.md',
      'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md',
      'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md',
    ],
    {
      ...scope,
      current_direct_phase: 'Apply',
    },
  );

  assert.deepEqual(result.transitioned, []);
  assert.equal(result.deferred.length, 3);
  assert.match(result.failures.join('\n'), /deferred path/);
});

test('does not allow Archive or later reports during Verify', async () => {
  const { scope } = await loadPhase1Artifacts();
  const applySummary = 'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/apply-summary.md';
  const verifyReport = 'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md';
  const laterReports = [
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/archive-report.md',
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/health-report.md',
    'openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/repository-ready.md',
  ];
  const result = classifyPaths([applySummary, verifyReport, ...laterReports], {
    ...scope,
    current_direct_phase: 'Verify',
  });

  assert.deepEqual(result.transitioned, [applySummary, verifyReport]);
  assert.deepEqual(result.deferred, laterReports);
  assert.match(result.failures.join('\n'), /deferred path/);
});

test('requires Apply Summary before accepting a Verify report', async () => {
  const { scope } = await loadPhase1Artifacts();
  const result = classifyPaths(
    ['openspec/changes/SPEC-SDD-0002-sdd-v3-stable-release/verify-report.md'],
    {
      ...scope,
      current_direct_phase: 'Verify',
    },
  );

  assert.match(result.failures.join('\n'), /out of order|requires/);
});

test('fails closed for unclassified paths', async () => {
  const { scope } = await loadPhase1Artifacts();
  const result = classifyPaths(['docs/unclassified-governance-note.md'], scope);

  assert.deepEqual(result.unclassified, ['docs/unclassified-governance-note.md']);
  assert.match(result.failures.join('\n'), /unclassified path/);
});

test('rejects SPEC-SDD-0001, recovery, Direct infrastructure, and deferred paths as Phase 1 ownership', async () => {
  const { scope } = await loadPhase1Artifacts();
  const result = validateRequestedPaths(
    [
      'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/design.md',
      '.opencode/agents/sdd-direct-orchestrator.md',
      'apps/api/src/app.module.ts',
      'docs/architecture/sdd-v3.0-release-notes.md',
    ],
    scope,
  );

  assert.equal(result.failures.length, 4);
  assert.match(result.failures.join('\n'), /Phase 1 does not own/);
});

test('keeps release, Stable, tag, and freeze state inactive before later gates', async () => {
  const { inventory, classification, scope } = await loadPhase1Artifacts();

  assert.equal(inventory.release_state, 'candidate');
  assert.equal(classification.release_state, 'candidate');
  assert.equal(scope.stable_declaration, 'NOT_EXECUTED');
  assert.equal(scope.freeze_state, 'UNCHANGED');
});
