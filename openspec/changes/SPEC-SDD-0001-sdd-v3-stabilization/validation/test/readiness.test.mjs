import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const changeRoot = new URL('../..', import.meta.url);

async function createEvidence() {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-readiness-'));
  await cp(new URL('evidence/', changeRoot), join(directory, 'evidence'), { recursive: true });
  return { directory, evidenceRoot: join(directory, 'evidence') };
}

async function validate(evidenceRoot) {
  const { validateReadiness } = await import('../validate-readiness.mjs');
  return validateReadiness({
    reviewPath: join(evidenceRoot, 'architecture-review-approved.md'),
    reportPath: join(evidenceRoot, 'readiness-report.md'),
  });
}

test('accepts the approved legacy-baseline readiness state with the approved review', async (t) => {
  const { directory, evidenceRoot } = await createEvidence();
  t.after(() => rm(directory, { recursive: true, force: true }));

  assert.deepEqual(await validate(evidenceRoot), []);
});

test('requires each R-01 through R-12 row to have owner, observed value, and status', async (t) => {
  const { directory, evidenceRoot } = await createEvidence();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const reportPath = join(evidenceRoot, 'readiness-report.md');
  const report = await readFile(reportPath, 'utf8');
  await writeFile(reportPath, report.replace('| R-03 | PASS |', '| R-03 | |'));

  assert.match((await validate(evidenceRoot)).join('\n'), /R-03 must include status, observed value, and owner/);
});

test('requires R-01 and R-12 to use an approved legacy or strict pass state', async (t) => {
  const { directory, evidenceRoot } = await createEvidence();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const reportPath = join(evidenceRoot, 'readiness-report.md');
  const report = await readFile(reportPath, 'utf8');
  await writeFile(reportPath, report.replace('PASS_WITH_LEGACY_BASELINE', 'FAIL: pending canonical audit'));

  assert.match((await validate(evidenceRoot)).join('\n'), /R-01 must be PASS_WITH_LEGACY_BASELINE for pre-v3.0 or PASS for v3.0\+/);
});

test('requires the review input to contain Verdict: APPROVED', async (t) => {
  const { directory, evidenceRoot } = await createEvidence();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const reviewPath = join(evidenceRoot, 'architecture-review-approved.md');
  const review = await readFile(reviewPath, 'utf8');
  await writeFile(reviewPath, review.replace('Verdict: APPROVED', 'Verdict: REJECTED'));

  assert.match((await validate(evidenceRoot)).join('\n'), /R-07 requires architecture review Verdict: APPROVED/);
});
