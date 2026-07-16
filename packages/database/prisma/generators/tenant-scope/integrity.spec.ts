/**
 * Integrity test for tenant-scope generator.
 *
 * This is NOT auto-generated. It independently reads schema.prisma and
 * cross-references it against the generated model lists to ensure:
 *   - Every model with `tenantId` appears in TENANT_SCOPED_MODELS
 *   - Every model with `clienteId` appears in CLIENTE_SCOPED_MODELS
 *   - No false positives (models listed that don't have the field)
 *
 * If you add a new scoped field to a model and forget to run the generator,
 * THIS TEST WILL FAIL.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  TENANT_SCOPED_MODELS,
  CLIENTE_SCOPED_MODELS,
} from './generated/tenant-models';

const SCHEMA_PATH = path.resolve(__dirname, '../../schema.prisma');

interface ParsedModel {
  name: string;
  fields: string[];
}

function parseSchema(filePath: string): ParsedModel[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const models: ParsedModel[] = [];

  const modelRegex = /model\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(content)) !== null) {
    const [, name, body] = match;
    const fields: string[] = [];

    // Match field names (ignore type, attributes, relations)
    const fieldRegex = /^\s+(\w+)\s+/gm;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      // Skip Prisma internal keywords
      if (!['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
        fields.push(fieldName);
      }
    }

    models.push({ name, fields });
  }

  return models;
}

describe('Tenant Scope Integrity (cross-referenced against schema.prisma)', () => {
  let models: ParsedModel[];

  beforeAll(() => {
    expect(fs.existsSync(SCHEMA_PATH)).toBe(true);
    models = parseSchema(SCHEMA_PATH);
  });

  it('every model with tenantId field is in TENANT_SCOPED_MODELS', () => {
    const schemaModelsWithTenantId = models
      .filter((m) => m.fields.includes('tenantId'))
      .map((m) => m.name);

    for (const modelName of schemaModelsWithTenantId) {
      expect(TENANT_SCOPED_MODELS).toContain(modelName);
    }
  });

  it('every model with clienteId field is in CLIENTE_SCOPED_MODELS', () => {
    const schemaModelsWithClienteId = models
      .filter((m) => m.fields.includes('clienteId'))
      .map((m) => m.name);

    for (const modelName of schemaModelsWithClienteId) {
      expect(CLIENTE_SCOPED_MODELS).toContain(modelName);
    }
  });

  it('no false positives in TENANT_SCOPED_MODELS', () => {
    const schemaTenantIds = new Set(
      models
        .filter((m) => m.fields.includes('tenantId'))
        .map((m) => m.name),
    );

    for (const modelName of TENANT_SCOPED_MODELS) {
      expect(schemaTenantIds.has(modelName)).toBe(true);
    }
  });

  it('no false positives in CLIENTE_SCOPED_MODELS', () => {
    const schemaClienteIds = new Set(
      models
        .filter((m) => m.fields.includes('clienteId'))
        .map((m) => m.name),
    );

    for (const modelName of CLIENTE_SCOPED_MODELS) {
      expect(schemaClienteIds.has(modelName)).toBe(true);
    }
  });

  it('TENANT_SCOPED_MODELS covers all expected business models', () => {
    const expected = [
      'AuditLog', 'Cita', 'ClientUser', 'Cliente', 'Comunicacion',
      'Disponibilidad', 'Documento', 'Encuesta', 'EventoAcademico',
      'EventoBitacora', 'Incidencia', 'ItemInventario', 'PagoIntent',
      'PlantillaDocumento', 'Presupuesto', 'Resource', 'Sistema',
      'Tarea', 'User', 'Webhook',
    ];
    for (const m of expected) {
      expect(TENANT_SCOPED_MODELS).toContain(m);
    }
  });

  it('CLIENTE_SCOPED_MODELS covers all expected client-scoped models', () => {
    const expected = [
      'Cita', 'ClientUser', 'Comunicacion', 'Documento',
      'Incidencia', 'PagoIntent', 'Presupuesto', 'Sistema', 'Tarea',
    ];
    for (const m of expected) {
      expect(CLIENTE_SCOPED_MODELS).toContain(m);
    }
  });
});
