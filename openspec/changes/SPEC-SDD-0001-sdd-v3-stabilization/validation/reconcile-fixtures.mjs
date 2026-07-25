import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function sourceFingerprint(record) {
  return JSON.stringify(record);
}

export async function reconcileFixtures({ source, target, statePath }) {
  let state = { records: {} };
  try {
    state = JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const sourceById = new Map(source.records.map((record) => [record.spec_id, record]));
  let inserted = 0;
  let duplicates = 0;
  for (const targetRecord of target.records) {
    const specId = targetRecord.document_id.slice(0, 9).toUpperCase();
    const sourceRecord = sourceById.get(specId);
    if (!sourceRecord) throw new Error(`missing source record: ${specId}`);
    const existing = state.records[targetRecord.document_id];
    const fingerprint = sourceFingerprint(sourceRecord);
    if (existing) {
      if (existing.source !== fingerprint) throw new Error(`source mutation: ${specId}`);
      if (existing.canonical_path !== targetRecord.canonical_path) {
        throw new Error(`authority collision: ${targetRecord.document_id}`);
      }
      duplicates += 1;
      continue;
    }
    state.records[targetRecord.document_id] = {
      canonical_path: targetRecord.canonical_path,
      revision_id: targetRecord.revision_id,
      source: fingerprint,
    };
    inserted += 1;
  }
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return { inserted, duplicates, records: Object.keys(state.records).length };
}

async function main() {
  const changeRoot = new URL('../', import.meta.url);
  const fixtureRoot = new URL('fixtures/', changeRoot);
  const [source, target] = await Promise.all([
    readFile(new URL('v2.1-manifest.json', fixtureRoot), 'utf8').then(JSON.parse),
    readFile(new URL('v3.0-sample.json', fixtureRoot), 'utf8').then(JSON.parse),
  ]);
  const directory = await mkdtemp(join(tmpdir(), 'sdd-reconciliation-'));
  try {
    const statePath = join(directory, 'registry.json');
    const first = await reconcileFixtures({ source, target, statePath });
    const second = process.argv.includes('--twice')
      ? await reconcileFixtures({ source, target, statePath })
      : null;
    console.log(`PASS: reconciliation inserted=${first.inserted} duplicates=${second?.duplicates ?? first.duplicates}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
