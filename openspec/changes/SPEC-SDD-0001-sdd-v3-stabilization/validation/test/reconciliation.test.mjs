import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const changeRoot = new URL('../..', import.meta.url);

async function loadRecords() {
  const source = JSON.parse(await readFile(new URL('fixtures/v2.1-manifest.json', changeRoot), 'utf8'));
  const target = JSON.parse(await readFile(new URL('fixtures/v3.0-sample.json', changeRoot), 'utf8'));
  return { source, target };
}

async function reconcile(records, directory) {
  const { reconcileFixtures } = await import('../reconcile-fixtures.mjs');
  return reconcileFixtures({ ...records, statePath: join(directory, 'registry.json') });
}

test('rerunning the same fixture keeps stable identities without duplicate inserts', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-reconcile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const records = await loadRecords();
  const first = await reconcile(records, directory);
  const second = await reconcile(records, directory);

  assert.equal(first.inserted, 22);
  assert.equal(second.inserted, 0);
  assert.equal(second.duplicates, 22);
  assert.equal(second.records, 22);
});

test('fails closed on a document identity collision', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-reconcile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const records = await loadRecords();
  await reconcile(records, directory);
  records.target.records[0].canonical_path = 'openspec/changes/archive/conflict/archive-report.md';

  await assert.rejects(() => reconcile(records, directory), /authority collision: spec-0002:design/);
});

test('fails when source evidence changes after initial reconciliation', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-reconcile-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const records = await loadRecords();
  await reconcile(records, directory);
  records.source.records[0].archived_at = '2026-01-01T00:00:00Z';

  await assert.rejects(() => reconcile(records, directory), /source mutation: SPEC-0002/);
});
