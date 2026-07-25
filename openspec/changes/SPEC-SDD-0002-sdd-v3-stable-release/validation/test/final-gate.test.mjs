import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const declaration = JSON.parse(
  await readFile(new URL('../../stable-release-declaration.json', import.meta.url), 'utf8'),
);
const finalGate = await import('../validate-final-gate.mjs');

test('accepts the exact final Stable/freeze declaration contract', () => {
  assert.deepEqual(finalGate.validateDeclaration(declaration), []);
  assert.equal(declaration.schema, 'sdd-v3-final-release/v1');
  assert.equal(declaration.release_id, 'sdd-v3.0-stable');
  assert.equal(declaration.version, 'v3.0');
  assert.equal(
    declaration.implementation_baseline,
    'c028537bae6fe1d8ecafc3974cd9cf0e46a673ce',
  );
  assert.equal(declaration.verified_commit, '03ecd9d18a329986f71214bb3ecd16b1b62ff264');
});

test('binds the declaration to the exact verified candidate commit', () => {
  assert.equal(declaration.verified_commit, finalGate.CANDIDATE_COMMIT);
  assert.equal(declaration.final_gate.verified_commit, finalGate.CANDIDATE_COMMIT);
  assert.equal(declaration.candidate_preconditions.candidate_commit, finalGate.CANDIDATE_COMMIT);
  assert.notEqual(declaration.verified_commit, declaration.implementation_baseline);
});

test('records Stable, active freeze, executed manual gate, and pending tag state', () => {
  assert.equal(declaration.release_state, 'stable');
  assert.equal(declaration.stable_declaration, 'EXECUTED');
  assert.equal(declaration.freeze_state_after_final_gate, 'ACTIVE');
  assert.equal(declaration.final_gate.status, 'EXECUTED');
  assert.equal(declaration.final_gate.authority, 'manual-maintainer-release-tag');
  assert.equal(declaration.final_gate.automatic_transition, 'FORBIDDEN');
  assert.equal(declaration.tag_state, 'PENDING_FINAL_TAG');
  assert.equal(declaration.tag_binding.target, 'finalization_commit');
  assert.equal(declaration.tag_binding.candidate_commit_is_target, false);
});

test('preserves legacy compatibility and strict v3.0+ evidence requirements', () => {
  assert.equal(declaration.compatibility.pre_v3_0.status, 'PASS_WITH_LEGACY_BASELINE');
  assert.equal(declaration.compatibility.pre_v3_0.aggregate, 'not-claimed');
  assert.equal(declaration.compatibility.v3_0_plus.status, 'STRICT');
  assert.equal(declaration.compatibility.v3_0_plus.source_commit_required, true);
  assert.equal(declaration.compatibility.v3_0_plus.source_commit_format, '40-lowercase-hex');
  assert.equal(declaration.compatibility.v3_0_plus.aggregate, 'canonical-v3-aggregate/v1');
});

test('rejects candidate or pre-final state in a final declaration', () => {
  const invalid = structuredClone(declaration);
  invalid.release_state = 'candidate';
  invalid.stable_declaration = 'NOT_EXECUTED';
  invalid.tag_state = 'NOT_PUBLISHED';
  invalid.freeze_state_after_final_gate = 'PENDING';
  invalid.final_gate.status = 'NOT_EXECUTED';

  assert.match(
    finalGate.validateDeclaration(invalid).join('\n'),
    /final release state|Stable declaration|final tag state|final freeze state|final-gate status/i,
  );
});

test('rejects a mismatched verified commit', () => {
  const invalid = structuredClone(declaration);
  invalid.verified_commit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  invalid.final_gate.verified_commit = invalid.verified_commit;
  invalid.candidate_preconditions.candidate_commit = invalid.verified_commit;

  assert.match(finalGate.validateDeclaration(invalid).join('\n'), /verified candidate commit|final-gate verified commit|candidate commit/i);
});

test('rejects a tag binding that self-references or targets the candidate', () => {
  const invalid = structuredClone(declaration);
  invalid.tag_binding.candidate_commit_is_target = true;
  invalid.tag_binding.finalization_commit_hash = finalGate.CANDIDATE_COMMIT;
  invalid.notes = invalid.notes.filter((note) => !note.includes('final tag will target'));

  assert.match(finalGate.validateDeclaration(invalid).join('\n'), /tag-target|finalization commit hash|final tag targets/i);
});

test('validates committed candidate preconditions without requiring the final tag', async () => {
  const result = await finalGate.runFinalGateValidation({ mode: 'pre-tag' });

  assert.deepEqual(result.failures, []);
  assert.match(result.currentHead, /^[0-9a-f]{40}$/);
  assert.equal(result.tagTarget, null);
});

test('keeps the tag boundary explicit before and after parent tag creation', async () => {
  const preTag = await finalGate.runFinalGateValidation({ mode: 'pre-tag' });
  const postTag = await finalGate.runFinalGateValidation({ mode: 'post-tag' });

  if (preTag.failures.length === 0) {
    assert.equal(preTag.tagTarget, null);
    assert.match(postTag.failures.join('\n'), /required in post-tag mode/i);
  } else {
    assert.match(preTag.failures.join('\n'), /must not exist in pre-tag mode/i);
    assert.deepEqual(postTag.failures, []);
    assert.notEqual(postTag.tagTarget, finalGate.CANDIDATE_COMMIT);
  }
});
