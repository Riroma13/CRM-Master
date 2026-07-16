// ⚡ AUTO-GENERATED — DO NOT EDIT
// Source: prisma/schema.prisma
// Generator: prisma/generators/tenant-scope/generator.ts
// Generated: 2026-07-16T21:17:24.501Z

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
