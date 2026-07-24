import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_FIELDS = [
  'spec_id',
  'archive_path',
  'source_commit',
  'archived_at',
  'working_set_accuracy',
  'prediction_accuracy',
  'design_confidence',
];
const REQUIRED_CATEGORY_IDS = {
  tenant: ['SPEC-0002', 'SPEC-0005', 'SPEC-0006', 'SPEC-0008'],
  'mission-control': ['SPEC-0003', 'SPEC-0009'],
  platform: ['SPEC-0010', 'SPEC-0011', 'SPEC-0012', 'SPEC-0013', 'SPEC-0014', 'SPEC-0015', 'SPEC-0016', 'SPEC-0017', 'SPEC-0020', 'SPEC-0021', 'SPEC-0022', 'SPEC-0023', 'SPEC-0024', 'SPEC-0028'],
  'audit-analytics': ['SPEC-0018', 'SPEC-0019'],
};
const FIELD_MAP_KEYS = ['source_field', 'target_field', 'transform', 'required', 'absent_value', 'value_type'];
const SOURCE_RECORD_KEYS = [...SOURCE_FIELDS];
const TARGET_RECORD_KEYS = [
  'document_id',
  'revision_id',
  'canonical_path',
  'source_commit',
  'schema_version',
  'source_version',
  'status',
  'audit',
  'supersedes_document_id',
  'supersedes_revision_id',
];
const AUDIT_KEYS = ['archived_at', 'working_set_accuracy', 'prediction_accuracy', 'design_confidence'];
const TARGET_FIELDS = [
  'document_id',
  'canonical_path',
  'source_commit',
  'audit.archived_at',
  'audit.working_set_accuracy',
  'audit.prediction_accuracy',
  'audit.design_confidence',
];
const ARCHIVE_PATH_PATTERN = /^openspec\/changes\/archive\/[^/]+\/archive-report\.md$/;
const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const ACCURACY_VALUES = new Set(['N/A']);
const CONFIDENCE_VALUES = new Set(['High', 'Medium', 'Low', 'N/A']);

function hasExactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function isAccuracy(value) {
  return ACCURACY_VALUES.has(value) || (typeof value === 'number' && value >= 0 && value <= 1);
}

function validateAuditValues(record, path, errors) {
  if (!ISO_UTC_PATTERN.test(record.archived_at)) errors.push(`${path}.archived_at must be ISO-8601 UTC`);
  if (!isAccuracy(record.working_set_accuracy)) errors.push(`${path}.working_set_accuracy must be number in [0,1] or N/A`);
  if (!isAccuracy(record.prediction_accuracy)) errors.push(`${path}.prediction_accuracy must be number in [0,1] or N/A`);
  if (!CONFIDENCE_VALUES.has(record.design_confidence)) errors.push(`${path}.design_confidence must be High, Medium, Low, or N/A`);
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function validateFixtures({ fixtureRoot }) {
  const [source, fieldMap, target] = await Promise.all([
    loadJson(join(fixtureRoot, 'v2.1-manifest.json')),
    loadJson(join(fixtureRoot, 'v2.1-field-map.json')),
    loadJson(join(fixtureRoot, 'v3.0-sample.json')),
  ]);
  const errors = [];
  if (!hasExactKeys(source, ['schema_version', 'source_version', 'manifest', 'records'])) {
    errors.push('invalid source fixture schema');
  }
  if (!hasExactKeys(fieldMap, ['schema_version', 'source_version', 'target_schema_version', 'mappings'])) {
    errors.push('invalid field map schema');
  }
  if (!hasExactKeys(target, ['schema_version', 'source_version', 'records'])) {
    errors.push('invalid target fixture schema');
  }
  for (const record of source.records) {
    if (!hasExactKeys(record, SOURCE_RECORD_KEYS)) errors.push(`invalid source record schema: ${record.spec_id ?? 'unknown'}`);
    if (!ARCHIVE_PATH_PATTERN.test(record.archive_path)) errors.push('archive_path must resolve under openspec/changes/archive');
    if (!SOURCE_COMMIT_PATTERN.test(record.source_commit)) errors.push('source_commit must be 40 lowercase hexadecimal characters');
    validateAuditValues(record, 'source', errors);
  }
  for (const record of target.records) {
    if (!hasExactKeys(record, TARGET_RECORD_KEYS) || !hasExactKeys(record.audit, AUDIT_KEYS)) {
      errors.push(`invalid target record schema: ${(record.document_id ?? 'unknown').slice(0, 9).toUpperCase()}`);
    }
    if (!ARCHIVE_PATH_PATTERN.test(record.canonical_path)) errors.push('canonical_path must resolve under openspec/changes/archive');
    if (!SOURCE_COMMIT_PATTERN.test(record.source_commit)) errors.push('source_commit must be 40 lowercase hexadecimal characters');
    validateAuditValues(record.audit, 'audit', errors);
  }
  for (const mapping of fieldMap.mappings) {
    if (!hasExactKeys(mapping, FIELD_MAP_KEYS)) errors.push(`invalid mapping schema: ${mapping.source_field ?? 'unknown'}`);
  }
  const mapped = new Set(fieldMap.mappings.map(({ source_field }) => source_field));
  for (const field of SOURCE_FIELDS) {
    if (!mapped.has(field)) errors.push(`unmapped source field: ${field}`);
  }
  const targetFields = fieldMap.mappings.map(({ target_field }) => target_field);
  for (const field of targetFields) {
    if (!TARGET_FIELDS.includes(field)) errors.push(`unknown target field: ${field}`);
  }
  for (const field of TARGET_FIELDS) {
    if (!targetFields.includes(field)) errors.push(`unmapped target field: ${field}`);
  }
  for (const field of new Set(targetFields)) {
    if (targetFields.filter((targetField) => targetField === field).length > 1) {
      errors.push(`duplicate target field: ${field}`);
    }
  }
  for (const field of new Set(fieldMap.mappings.map(({ source_field }) => source_field))) {
    if (fieldMap.mappings.filter(({ source_field }) => source_field === field).length > 1) {
      errors.push(`duplicate source field: ${field}`);
    }
  }
  if (fieldMap.mappings.length !== SOURCE_FIELDS.length || mapped.size !== SOURCE_FIELDS.length) {
    errors.push('field map must contain exactly one mapping for each source field');
  }
  if (fieldMap.mappings.length !== TARGET_FIELDS.length || new Set(targetFields).size !== TARGET_FIELDS.length) {
    errors.push('field map must contain exactly one mapping for each target field');
  }

  const categoryIds = Object.values(source.manifest.categories).flatMap(({ spec_ids }) => spec_ids);
  for (const [name, category] of Object.entries(source.manifest.categories)) {
    if (category.record_count !== category.spec_ids.length || category.spec_ids.length === 0) {
      errors.push(`category coverage mismatch: ${name}`);
    }
    if (JSON.stringify(category.spec_ids) !== JSON.stringify(REQUIRED_CATEGORY_IDS[name])) {
      errors.push(`category coverage mismatch: ${name}`);
    }
  }
  if (source.manifest.record_count !== 22 || source.records.length !== 22 || categoryIds.length !== 22) {
    errors.push('source record count must be 22');
  }
  if (target.records.length !== 22) errors.push('target record count must be 22');

  const sourceById = new Map(source.records.map((record) => [record.spec_id, record]));
  for (const [name, category] of Object.entries(source.manifest.categories)) {
    for (const specId of category.spec_ids) {
      if (!sourceById.has(specId)) errors.push(`category coverage mismatch: ${name}`);
    }
  }
  for (const sourceRecord of source.records) {
    const targetRecord = target.records.find(
      ({ document_id }) => document_id === `${sourceRecord.spec_id.toLowerCase()}:design`,
    );
    if (!targetRecord) {
      errors.push(`missing target record: ${sourceRecord.spec_id}`);
      continue;
    }
    for (const field of ['archive_path', 'source_commit']) {
      const targetField = field === 'archive_path' ? 'canonical_path' : field;
      if (targetRecord[targetField] !== sourceRecord[field]) {
        errors.push(`mapped value mismatch: ${sourceRecord.spec_id} ${targetField}`);
      }
    }
    for (const field of ['archived_at', 'working_set_accuracy', 'prediction_accuracy', 'design_confidence']) {
      if (targetRecord.audit[field] !== sourceRecord[field]) {
        errors.push(`audit value mismatch: ${sourceRecord.spec_id} audit.${field}`);
      }
    }
    if (
      targetRecord.schema_version !== '3.0' ||
      targetRecord.source_version !== 'v3.0' ||
      targetRecord.status !== 'active' ||
      targetRecord.supersedes_document_id !== null ||
      targetRecord.supersedes_revision_id !== null
    ) {
      errors.push(`explicit target defaults invalid: ${sourceRecord.spec_id}`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixtureRoot = join(fileURLToPath(new URL('../fixtures', import.meta.url)));
  const errors = await validateFixtures({ fixtureRoot });
  if (errors.length) {
    console.error(`FAIL\n${errors.join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS: fixture validation (22/22)');
  }
}
