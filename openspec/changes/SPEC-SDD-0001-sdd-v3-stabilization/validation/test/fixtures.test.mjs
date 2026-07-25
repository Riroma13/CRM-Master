import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const changeRoot = new URL('../..', import.meta.url);
const fixtureRoot = new URL('fixtures/', changeRoot);

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-fixtures-'));
  await cp(fixtureRoot, join(directory, 'fixtures'), { recursive: true });
  return { directory, fixtureRoot: join(directory, 'fixtures') };
}

async function validate(fixtureRoot) {
  const { validateFixtures } = await import('../validate-fixtures.mjs');
  return validateFixtures({ fixtureRoot });
}

test('accepts the complete 22-record fixture set', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  assert.deepEqual(await validate(fixtureRoot), []);
});

test('fails when a required source field is not mapped', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const fieldMapPath = join(fixtureRoot, 'v2.1-field-map.json');
  const fieldMap = JSON.parse(await readFile(fieldMapPath, 'utf8'));
  fieldMap.mappings = fieldMap.mappings.filter(({ source_field }) => source_field !== 'archived_at');
  await writeFile(fieldMapPath, `${JSON.stringify(fieldMap, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /unmapped source field: archived_at/);
});

test('fails when mappings are incomplete or target the same path twice', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const fieldMapPath = join(fixtureRoot, 'v2.1-field-map.json');
  const fieldMap = JSON.parse(await readFile(fieldMapPath, 'utf8'));
  fieldMap.mappings[1].target_field = 'document_id';
  await writeFile(fieldMapPath, `${JSON.stringify(fieldMap, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /duplicate target field: document_id/);
});

test('fails when a mapping targets an unknown field', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const fieldMapPath = join(fixtureRoot, 'v2.1-field-map.json');
  const fieldMap = JSON.parse(await readFile(fieldMapPath, 'utf8'));
  fieldMap.mappings[0].target_field = 'unknown.target';
  await writeFile(fieldMapPath, `${JSON.stringify(fieldMap, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /unknown target field: unknown.target/);
});

test('fails when a source field is mapped more than once', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const fieldMapPath = join(fixtureRoot, 'v2.1-field-map.json');
  const fieldMap = JSON.parse(await readFile(fieldMapPath, 'utf8'));
  fieldMap.mappings[1].source_field = 'spec_id';
  await writeFile(fieldMapPath, `${JSON.stringify(fieldMap, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /duplicate source field: spec_id/);
});

test('fails when source or target mapping values use invalid formats', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const sourcePath = join(fixtureRoot, 'v2.1-manifest.json');
  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  source.records[0].archive_path = '/tmp/archive-report.md';
  await writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /archive_path must resolve under openspec\/changes\/archive/);
});

test('fails when fixture objects do not match their exact schemas', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const targetPath = join(fixtureRoot, 'v3.0-sample.json');
  const target = JSON.parse(await readFile(targetPath, 'utf8'));
  delete target.records[0].audit.design_confidence;
  await writeFile(targetPath, `${JSON.stringify(target, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /invalid target record schema: SPEC-0002/);
});

test('inventory evidence uses unique concrete archive-path records', async () => {
  const inventory = JSON.parse(await readFile(new URL('../../evidence/improvement-inventory.json', import.meta.url), 'utf8'));
  const source = JSON.parse(await readFile(new URL('../../fixtures/v2.1-manifest.json', import.meta.url), 'utf8'));
  const manifestPaths = new Set(source.records.map(({ archive_path }) => archive_path));

  for (const improvement of inventory.improvements) {
    const archivePaths = improvement.evidence.map(({ archive_path }) => archive_path);
    assert.equal(new Set(archivePaths).size, archivePaths.length);
    for (const entry of improvement.evidence) {
      assert.deepEqual(Object.keys(entry).sort(), ['archive_path', 'source_commit']);
      assert.match(entry.archive_path, /^openspec\/changes\/archive\/[^/]+\/archive-report\.md$/);
      assert.ok(manifestPaths.has(entry.archive_path));
      assert.match(entry.source_commit, /^[0-9a-f]{40}$/);
    }
  }
});

test('fails when a declared category is uncovered', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const manifestPath = join(fixtureRoot, 'v2.1-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.manifest.categories.tenant.spec_ids.pop();
  manifest.manifest.categories.tenant.record_count = 3;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /category coverage mismatch: tenant/);
});

test('fails when a target audit value differs from its source', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const targetPath = join(fixtureRoot, 'v3.0-sample.json');
  const target = JSON.parse(await readFile(targetPath, 'utf8'));
  target.records[0].audit.archived_at = '2026-01-01T00:00:00Z';
  await writeFile(targetPath, `${JSON.stringify(target, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /audit value mismatch: SPEC-0002 audit.archived_at/);
});

test('fails when source or target cardinality is not 22', async (t) => {
  const { directory, fixtureRoot } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const targetPath = join(fixtureRoot, 'v3.0-sample.json');
  const target = JSON.parse(await readFile(targetPath, 'utf8'));
  target.records.pop();
  await writeFile(targetPath, `${JSON.stringify(target, null, 2)}\n`);

  assert.match((await validate(fixtureRoot)).join('\n'), /target record count must be 22/);
});
