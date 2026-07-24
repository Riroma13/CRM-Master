import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const changeRoot = fileURLToPath(new URL('../', import.meta.url));
const archiveRoot = join(changeRoot, '..', 'archive');
const fixturePath = join(changeRoot, 'fixtures', 'v2.1-manifest.json');
const governancePath = join(changeRoot, 'evidence', 'canonical-audit-governance-resolution.md');
const sourceCommitPattern = /(?:\*\*Source commit:\*\*|source_commit\s*:)\s*[`"']?([0-9a-f]{40})/i;
const v3MarkerPattern = /(?:schema_version\s*:\s*[`"']?3\.0|source_version\s*:\s*[`"']?v3\.0|SDD v3\.0)/i;
const aggregateDefinitionMarker = /(?:\*\*Aggregate definition:\*\*|aggregate_definition\s*:)\s*[`"']?canonical-v3-aggregate\/v1/i;

const categories = {
  tenant: ['SPEC-0002', 'SPEC-0005', 'SPEC-0006', 'SPEC-0008'],
  'mission-control': ['SPEC-0003', 'SPEC-0009'],
  platform: [
    'SPEC-0010', 'SPEC-0011', 'SPEC-0012', 'SPEC-0013', 'SPEC-0014',
    'SPEC-0015', 'SPEC-0016', 'SPEC-0017', 'SPEC-0020', 'SPEC-0021',
    'SPEC-0022', 'SPEC-0023', 'SPEC-0024', 'SPEC-0028',
  ],
  'audit-analytics': ['SPEC-0018', 'SPEC-0019'],
};

const categoryBySpec = new Map(
  Object.entries(categories).flatMap(([category, specIds]) => specIds.map((specId) => [specId, category])),
);

function specIdFromDirectory(name) {
  const match = name.match(/(SPEC-\d{4})/);
  return match?.[1] ?? null;
}

async function inspectArchives(root = archiveRoot) {
  const directories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const included = [];
  const excluded = [];
  for (const directory of directories) {
    const reportPath = join(root, directory, 'archive-report.md');
    const specId = specIdFromDirectory(directory);
    const archivePath = relative(join(changeRoot, '..', '..', '..'), reportPath).replaceAll('\\', '/');
    let report;
    try {
      report = await readFile(reportPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      excluded.push({
        archivePath,
        reason: directory === 'SPEC-0006-tenant-citas-2026-07-08'
          ? 'partial historical duplicate referenced by SPEC-0006; no canonical archive-report.md'
          : 'archive directory has no canonical archive-report.md',
      });
      continue;
    }
    if (specId && categoryBySpec.has(specId)) {
      const v3 = v3MarkerPattern.test(report);
      const sourceCommit = report.match(sourceCommitPattern)?.[1] ?? null;
      included.push({
        specId,
        category: categoryBySpec.get(specId),
        archivePath,
        version: v3 ? 'v3.0+' : 'pre-v3.0',
        explicitSourceCommit: sourceCommit && sourceCommit !== '0'.repeat(40) ? sourceCommit : null,
        aggregateDefinition: aggregateDefinitionMarker.test(report),
      });
    } else {
      excluded.push({ archivePath, reason: specId ? 'SPEC identity is not in the approved 22-record population' : 'non-SPEC dashboard/recovery row' });
    }
  }
  return { included, excluded };
}

export async function auditCanonicalHistory(paths = {}) {
  const configuredArchiveRoot = paths.archiveRoot ?? archiveRoot;
  const configuredFixturePath = paths.fixturePath ?? fixturePath;
  const configuredGovernancePath = paths.governancePath ?? governancePath;
  const archives = await inspectArchives(configuredArchiveRoot);
  const fixture = JSON.parse(await readFile(configuredFixturePath, 'utf8'));
  const governance = await readFile(configuredGovernancePath, 'utf8');
  const fixtureNonZeroCommits = fixture.records.filter(
    (record) => record.source_commit !== '0'.repeat(40),
  ).map((record) => record.spec_id);
  const fixtureZeroCommits = fixture.records.filter(
    (record) => record.source_commit === '0'.repeat(40),
  ).map((record) => record.spec_id);
  const v3Records = archives.included.filter(({ version }) => version === 'v3.0+');
  const governanceRulesDocumented = governance.includes('Legacy Baseline Exception')
    && governance.toLowerCase().includes('inclusion')
    && governance.toLowerCase().includes('exclusion');
  const governanceDefinitionApproved = governance.includes('canonical-v3-aggregate/v1');
  const aggregateDefinitionsPublished = v3Records.length > 0
    && governanceDefinitionApproved
    && v3Records.every(({ aggregateDefinition }) => aggregateDefinition);
  const sourceCommitEvidence = {
    explicitInCanonicalReports: archives.included.filter(({ explicitSourceCommit }) => explicitSourceCommit).length,
    missingFromCanonicalReports: archives.included.filter(({ explicitSourceCommit }) => !explicitSourceCommit).map(({ specId }) => specId),
    fixtureNonZeroClaims: fixtureNonZeroCommits,
    fixtureZeroPlaceholders: fixtureZeroCommits,
  };
  const v3RequirementsPass = v3Records.every(({ explicitSourceCommit }) => explicitSourceCommit)
    && aggregateDefinitionsPublished
    && governanceRulesDocumented;
  const legacyRequirementsPass = archives.included.every(({ version, aggregateDefinition, explicitSourceCommit }) => (
    version === 'pre-v3.0' && !aggregateDefinition && !explicitSourceCommit
  )) && governanceRulesDocumented;
  const result = {
    canonicalArchiveRoot: 'openspec/changes/archive',
    discoveredArchiveDirectories: archives.included.length + archives.excluded.length,
    readableArchiveReports: archives.included.length + archives.excluded.filter(({ reason }) => !reason.includes('no canonical archive-report.md') && !reason.includes('partial historical duplicate')).length,
    includedArchiveReports: archives.included.length,
    excludedArchiveEntries: archives.excluded.length,
    included: archives.included,
    excluded: archives.excluded,
    sourceCommitEvidence,
    versionClassification: { preV3Records: archives.included.filter(({ version }) => version === 'pre-v3.0').length, v3Records: v3Records.length },
    aggregateDefinitionRequirements: {
      definition: 'canonical-v3-aggregate/v1',
      approved: governanceDefinitionApproved,
      inclusionExclusionRulesDocumented: governanceRulesDocumented,
      publishedForV3Records: aggregateDefinitionsPublished,
    },
    aggregateDefinitionsPublished,
    result: archives.included.length === 22
      && (v3Records.length > 0 ? v3RequirementsPass : legacyRequirementsPass)
      ? (v3Records.length > 0 ? 'PASS' : 'PASS_WITH_LEGACY_BASELINE')
      : 'BLOCKED: canonical audit evidence is incomplete',
  };
  return result;
}

async function main() {
  const result = await auditCanonicalHistory();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
