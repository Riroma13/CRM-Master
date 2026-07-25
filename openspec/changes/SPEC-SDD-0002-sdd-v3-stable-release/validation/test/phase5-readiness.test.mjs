import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { loadPhase1Artifacts } from '../validate-phase1.mjs';
import {
  runPhase5Validation,
  validateArchitectureReviewEvidence,
  validatePhase5Evidence,
  validatePhase5Scope,
} from '../validate-phase5.mjs';

const requiredCriteria = [
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

const completeReview = `
status: APPROVED_WITH_CONDITIONS
No \`BLOCKER\`
## Mandatory Downstream Acceptance Criteria
${requiredCriteria.join(' evidence\\n')}
AR-NB-001 CLOSED
AR-NB-002 CLOSED
`;

const completeEvidence = `
release_state: candidate
stable_declaration: NOT_EXECUTED
planned_tag_state: NOT_PUBLISHED
freeze_state_after_final_gate: PENDING
final_gate: NOT_EXECUTED
Handoff: Apply Summary and Verify only after Phase 5
${requiredCriteria.map((criterion) => `| ${criterion} | evidence/phase-5-result.md |`).join('\\n')}
AR-NB-001 CLOSED
AR-NB-002 CLOSED
`;

test('accepts complete Architecture Review and DC evidence', () => {
  assert.deepEqual(validateArchitectureReviewEvidence(completeReview), []);
  assert.deepEqual(validatePhase5Evidence(completeEvidence), []);
});

test('rejects a readiness packet with a missing mandatory criterion', () => {
  const incomplete = completeEvidence.replace('| DC-006 | evidence/phase-5-result.md |', '');

  assert.match(validatePhase5Evidence(incomplete).join('\\n'), /DC-006/);
});

test('reconciles the repository and emits a complete Phase 5 result', async () => {
  const result = await runPhase5Validation();

  assert.deepEqual(result.failures, []);
  assert.equal(result.currentPathSummary.unclassified, 0);
  assert.equal(result.currentPathSummary.deferred, 0);
  assert.equal(result.currentPathSummary.transitioned, 2);
  assert.equal(result.releaseState, 'candidate');
  assert.equal(result.finalGateStatus, 'NOT_EXECUTED');
});

test('rejects downstream reports before Verify without relaxing the Phase 5 snapshot', async () => {
  const { scope } = await loadPhase1Artifacts();
  const currentPaths = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).split(' -> ').at(-1).replaceAll('\\', '/'));

  const result = validatePhase5Scope({ ...scope, current_direct_phase: 'Apply' }, currentPaths);

  assert.match(result.failures.join('\n'), /deferred path|downstream report started early/);
  assert.match(result.failures.join('\n'), /pre-Phase 5 changed-path set was not preserved/);
});
