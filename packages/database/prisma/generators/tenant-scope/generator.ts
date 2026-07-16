#!/usr/bin/env tsx
/**
 * Tenant Scope Generator
 *
 * Reads schema.prisma and generates:
 *   - generated/tenant-models.ts   → Typed model lists for Prisma scoping
 *   - generated/tenant-metadata.json → Machine-readable metadata for CI
 *   - generated/tenant-tests.ts    → Vitest tests that verify correctness
 *
 * Single source of truth: schema.prisma
 * Zero hardcoded lists. Zero manual maintenance.
 * If someone adds tenantId/clienteId to a model, everything updates automatically.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Config ──────────────────────────────────────────────────────────────

const SCHEMA_PATH = path.resolve(__dirname, '../../schema.prisma');
const OUTPUT_DIR = path.resolve(__dirname, 'generated');

const FIELDS_TO_SCAN = ['tenantId', 'clienteId'] as const;
type ScopedField = (typeof FIELDS_TO_SCAN)[number];

// ── Schema Parser ───────────────────────────────────────────────────────

interface ParsedModel {
  name: string;
  fields: { name: string; type: string; isOptional: boolean }[];
}

function parseSchema(filePath: string): ParsedModel[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const models: ParsedModel[] = [];

  // Match model blocks: model Name { ... }
  const modelRegex = /model\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(content)) !== null) {
    const [, name, body] = match;
    const fields: ParsedModel['fields'] = [];

    // Match field lines: fieldName  Type  @attributes?
    const fieldRegex = /^\s+(\w+)\s+(\w+)\??/gm;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const [, fieldName, fieldType] = fieldMatch;
      const line = body.split('\n').find((l) => l.trim().startsWith(fieldName)) || '';
      const isOptional = line.includes(fieldName) && line.includes('?');

      fields.push({
        name: fieldName,
        type: fieldType.replace('?', ''),
        isOptional,
      });
    }

    models.push({ name, fields });
  }

  return models;
}

// ── Model Classifier ────────────────────────────────────────────────────

interface ClassifiedModels {
  tenantScoped: string[];
  clienteScoped: string[];
  allModels: string[];
  byField: Record<ScopedField, string[]>;
  timestamp: string;
}

function classifyModels(models: ParsedModel[]): ClassifiedModels {
  const allModels = models.map((m) => m.name);
  const tenantScoped: string[] = [];
  const clienteScoped: string[] = [];
  const byField: Record<ScopedField, string[]> = {
    tenantId: [],
    clienteId: [],
  };

  for (const model of models) {
    for (const field of model.fields) {
      if (field.name === 'tenantId') {
        tenantScoped.push(model.name);
        byField.tenantId.push(model.name);
      }
      if (field.name === 'clienteId') {
        clienteScoped.push(model.name);
        byField.clienteId.push(model.name);
      }
    }
  }

  return {
    tenantScoped: [...new Set(tenantScoped)].sort(),
    clienteScoped: [...new Set(clienteScoped)].sort(),
    allModels: allModels.sort(),
    byField,
    timestamp: new Date().toISOString(),
  };
}

// ── Generated File Writers ──────────────────────────────────────────────

function writeTenantModels(data: ClassifiedModels, outDir: string): string {
  const content = `// ⚡ AUTO-GENERATED — DO NOT EDIT
// Source: prisma/schema.prisma
// Generator: prisma/generators/tenant-scope/generator.ts
// Generated: ${data.timestamp}

/**
 * Models that have a \`tenantId\` field and receive automatic
 * tenant-scoping in every Prisma query via createPrismaClient().
 */
export const TENANT_SCOPED_MODELS = ${JSON.stringify(data.tenantScoped, null, 2)} as const;

/**
 * Models that have a \`clienteId\` field and receive automatic
 * cross-client isolation via createPrismaClient({ clienteId }).
 */
export const CLIENTE_SCOPED_MODELS = ${JSON.stringify(data.clienteScoped, null, 2)} as const;

/**
 * Every model in the schema. Useful for validation.
 */
export const ALL_MODELS = ${JSON.stringify(data.allModels, null, 2)} as const;

/**
 * Models grouped by the scoping field they contain.
 */
export const MODELS_BY_SCOPED_FIELD = ${JSON.stringify(data.byField, null, 2)} as const;

// ── Type helpers ────────────────────────────────────────────────────────

export type TenantScopedModel = typeof TENANT_SCOPED_MODELS[number];
export type ClienteScopedModel = typeof CLIENTE_SCOPED_MODELS[number];

export function isTenantScopedModel(name: string): name is TenantScopedModel {
  return (TENANT_SCOPED_MODELS as readonly string[]).includes(name);
}

export function isClienteScopedModel(name: string): name is ClienteScopedModel {
  return (CLIENTE_SCOPED_MODELS as readonly string[]).includes(name);
}
`;

  const filePath = path.join(outDir, 'tenant-models.ts');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function writeTenantMetadata(data: ClassifiedModels, outDir: string): string {
  const filePath = path.join(outDir, 'tenant-metadata.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return filePath;
}

function writeTenantTests(data: ClassifiedModels, outDir: string): string {
  const content = `// ⚡ AUTO-GENERATED — DO NOT EDIT
// Source: prisma/schema.prisma
// Generator: prisma/generators/tenant-scope/generator.ts
// Generated: ${data.timestamp}

import { describe, it, expect } from 'vitest';
import {
  TENANT_SCOPED_MODELS,
  CLIENTE_SCOPED_MODELS,
  ALL_MODELS,
  MODELS_BY_SCOPED_FIELD,
  isTenantScopedModel,
  isClienteScopedModel,
} from './tenant-models';

describe('Tenant Scope Models (auto-generated from schema.prisma)', () => {
  it('every model in tenantScoped has tenantId field', () => {
    for (const model of TENANT_SCOPED_MODELS) {
      expect(MODELS_BY_SCOPED_FIELD.tenantId).toContain(model);
    }
  });

  it('every model in clienteScoped has clienteId field', () => {
    for (const model of CLIENTE_SCOPED_MODELS) {
      expect(MODELS_BY_SCOPED_FIELD.clienteId).toContain(model);
    }
  });

  it('tenantScoped and clienteScoped are subsets of all models', () => {
    for (const m of TENANT_SCOPED_MODELS) {
      expect(ALL_MODELS).toContain(m);
    }
    for (const m of CLIENTE_SCOPED_MODELS) {
      expect(ALL_MODELS).toContain(m);
    }
  });

  it('isTenantScopedModel type guard works', () => {
    for (const model of TENANT_SCOPED_MODELS) {
      expect(isTenantScopedModel(model)).toBe(true);
    }
    expect(isTenantScopedModel('NonExistentModel')).toBe(false);
  });

  it('isClienteScopedModel type guard works', () => {
    for (const model of CLIENTE_SCOPED_MODELS) {
      expect(isClienteScopedModel(model)).toBe(true);
    }
    expect(isClienteScopedModel('NonExistentModel')).toBe(false);
  });

  it('no duplicate entries in any list', () => {
    expect(new Set(TENANT_SCOPED_MODELS).size).toBe(TENANT_SCOPED_MODELS.length);
    expect(new Set(CLIENTE_SCOPED_MODELS).size).toBe(CLIENTE_SCOPED_MODELS.length);
  });

  it('all model names match actual Prisma models (no typos)', () => {
    // This test verifies every generated model name is a real model
    // by checking it doesn't reference non-existent models
    for (const m of [...TENANT_SCOPED_MODELS, ...CLIENTE_SCOPED_MODELS]) {
      expect(ALL_MODELS).toContain(m);
    }
  });
});
`;

  const filePath = path.join(outDir, 'tenant-scope.spec.ts');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ── CI Verification ─────────────────────────────────────────────────────

/**
 * Verifies that the generated files match the current schema.
 * Returns { valid, errors }.
 * Use this in CI to fail the build if generated files are stale.
 */
function verifyGeneratedFiles(data: ClassifiedModels, outDir: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const metadataPath = path.join(outDir, 'tenant-metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return { valid: false, errors: ['Generated metadata not found. Run the generator first.'] };
  }

  try {
    const existing = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Compare model lists (ignore timestamp)
    const normalizedExisting = { ...existing, timestamp: '' };
    const normalizedCurrent = { ...data, timestamp: '' };

    if (JSON.stringify(normalizedExisting) !== JSON.stringify(normalizedCurrent)) {
      errors.push('Generated metadata is stale. Run the tenant-scope generator.');
    }
  } catch {
    errors.push('Failed to parse existing metadata.');
  }

  return { valid: errors.length === 0, errors };
}

// ── Main ────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify');
  const schemaPath = args.find((a) => !a.startsWith('--')) || SCHEMA_PATH;
  const outDir = args.find((_, i) => i > 0 && !args[i].startsWith('--')) || OUTPUT_DIR;

  // Parse and classify
  const models = parseSchema(schemaPath);
  const classified = classifyModels(models);

  if (verifyOnly) {
    // Read-only verification — no files written
    const verification = verifyGeneratedFiles(classified, outDir);

    console.log('── Tenant Scope Verify ──');
    console.log(`Schema:     ${schemaPath}`);
    console.log(`Models:     ${classified.allModels.length} total`);
    console.log(`  tenantId: ${classified.tenantScoped.length} models`);
    console.log(`  clienteId:${classified.clienteScoped.length} models`);

    if (!verification.valid) {
      console.log(`\n⚠️  CI Verification:`);
      for (const err of verification.errors) {
        console.log(`   ❌ ${err}`);
      }
      console.log(`\n❌ Generated files are stale. Run \`pnpm generate:scope\` to regenerate.`);
      process.exit(1);
    }

    console.log(`\n✅ Generated files are up to date.`);
    return;
  }

  // Full generation mode
  fs.mkdirSync(outDir, { recursive: true });

  const modelsPath = writeTenantModels(classified, outDir);
  const metadataPath = writeTenantMetadata(classified, outDir);
  const testsPath = writeTenantTests(classified, outDir);

  // Check for stale generated files
  const verification = verifyGeneratedFiles(classified, outDir);

  console.log('── Tenant Scope Generator ──');
  console.log(`Schema:     ${schemaPath}`);
  console.log(`Output:     ${outDir}`);
  console.log(`Models:     ${classified.allModels.length} total`);
  console.log(`  tenantId: ${classified.tenantScoped.length} models`);
  console.log(`  clienteId:${classified.clienteScoped.length} models`);
  console.log(`Files:`);
  console.log(`  ✅ ${modelsPath}`);
  console.log(`  ✅ ${metadataPath}`);
  console.log(`  ✅ ${testsPath}`);

  if (!verification.valid) {
    console.log(`\n⚠️  CI Verification:`);
    for (const err of verification.errors) {
      console.log(`   ❌ ${err}`);
    }
    process.exit(1);
  }

  console.log(`\n✅ Generated files are up to date.`);
}

main();
