import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const changeRoot = new URL('../..', import.meta.url);
const archiveRoot = new URL('../archive/', changeRoot);

async function audit(archivePath) {
  const { auditCanonicalHistory } = await import('../audit-canonical-history.mjs');
  return auditCanonicalHistory({ archiveRoot: archivePath });
}

async function copyArchives() {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-canonical-audit-'));
  const copiedRoot = join(directory, 'archive');
  await cp(archiveRoot, copiedRoot, { recursive: true });
  return { directory, copiedRoot };
}

test('accepts the current pre-v3.0 population with the legacy baseline exception', async (t) => {
  const { directory, copiedRoot } = await copyArchives();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const result = await audit(copiedRoot);
  assert.equal(result.result, 'PASS_WITH_LEGACY_BASELINE');
  assert.deepEqual({
    directories: result.discoveredArchiveDirectories,
    readable: result.readableArchiveReports,
    included: result.includedArchiveReports,
    excluded: result.excludedArchiveEntries,
    sourceCommits: result.sourceCommitEvidence.explicitInCanonicalReports,
  }, { directories: 27, readable: 25, included: 22, excluded: 5, sourceCommits: 0 });
});

test('fails a future v3.0+ archive without an explicit source commit', async (t) => {
  const { directory, copiedRoot } = await copyArchives();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const reportPath = join(copiedRoot, '2026-07-20-SPEC-0013-document-platform', 'archive-report.md');
  const report = await readFile(reportPath, 'utf8');
  await writeFile(reportPath, `${report}\n schema_version: 3.0\n`);

  const result = await audit(copiedRoot);
  assert.equal(result.result, 'BLOCKED: canonical audit evidence is incomplete');
  assert.equal(result.versionClassification.v3Records, 1);
  assert.ok(result.sourceCommitEvidence.missingFromCanonicalReports.includes('SPEC-0013'));
});

test('requires the approved aggregate definition for v3.0+ readiness', async (t) => {
  const { directory, copiedRoot } = await copyArchives();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const reportPath = join(copiedRoot, '2026-07-20-SPEC-0013-document-platform', 'archive-report.md');
  const report = await readFile(reportPath, 'utf8');
  await writeFile(reportPath, `${report}\n schema_version: 3.0\n **Source commit:** 40d1d7354def85e52a94ec8a1186a22e4cb41eaf\n`);

  const result = await audit(copiedRoot);
  assert.equal(result.result, 'BLOCKED: canonical audit evidence is incomplete');
  assert.equal(result.aggregateDefinitionRequirements.publishedForV3Records, false);

  await writeFile(reportPath, `${report}\n schema_version: 3.0\n **Source commit:** 40d1d7354def85e52a94ec8a1186a22e4cb41eaf\n **Aggregate definition:** canonical-v3-aggregate/v1\n`);
  const passing = await audit(copiedRoot);
  assert.equal(passing.result, 'PASS');
});
