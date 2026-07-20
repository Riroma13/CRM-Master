import { describe, it, expect } from 'vitest';
import { ActivityEventEnvelopeSchema, Category } from '../event-envelope';

describe('Backward compat — event envelope', () => {
  it('old envelope without new fields still passes validation', () => {
    const old = {
      eventType: 'cliente.creado',
      tenantId: 'tenant-1',
      clienteId: 'cliente-1',
      entityType: 'cliente',
      entityId: 'cliente-1',
      actor: 'admin@test.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: { nombre: 'Test' },
    };

    const result = ActivityEventEnvelopeSchema.safeParse(old);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventId).toBeUndefined();
      expect(result.data.visibility).toBeUndefined();
    }
  });

  it('minimal old envelope without optional fields passes validation', () => {
    const minimal = {
      eventType: 'login.realizado',
      tenantId: 't-1',
      entityType: 'auth',
      actor: 'user@test.com',
      sourceModule: 'auth',
      severity: 'info',
      category: 'auth',
      payload: {},
    };

    const result = ActivityEventEnvelopeSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('new envelope with all fields passes validation', () => {
    const full = {
      eventType: 'cliente.creado',
      tenantId: 'tenant-1',
      clienteId: 'cliente-1',
      entityType: 'cliente',
      entityId: 'cliente-1',
      actor: 'admin@test.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: { nombre: 'Test' },
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      correlationId: 'corr-123',
      causationId: 'cause-456',
      visibility: 'internal',
      subjectName: 'Cliente Test S.A.',
      actorName: 'Admin Usuario',
      occurredAt: '2026-07-20T10:00:00.000Z',
    };

    const result = ActivityEventEnvelopeSchema.safeParse(full);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.visibility).toBe('internal');
      expect(result.data.subjectName).toBe('Cliente Test S.A.');
      expect(result.data.actorName).toBe('Admin Usuario');
    }
  });

  it('rejects invalid eventId (non-UUID)', () => {
    const invalid = {
      eventType: 'cliente.creado',
      tenantId: 'tenant-1',
      entityType: 'cliente',
      actor: 'admin@test.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: {},
      eventId: 'not-a-uuid',
    };

    const result = ActivityEventEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid visibility value', () => {
    const invalid = {
      eventType: 'cliente.creado',
      tenantId: 'tenant-1',
      entityType: 'cliente',
      actor: 'admin@test.com',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: {},
      visibility: 'secret',
    };

    const result = ActivityEventEnvelopeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('new Category enum includes all old values', () => {
    const oldCategories = ['crm', 'scheduling', 'communication', 'automation', 'auth'] as const;
    for (const cat of oldCategories) {
      const parsed = Category.safeParse(cat);
      expect(parsed.success).toBe(true);
    }
  });

  it('new Category enum includes new values', () => {
    const newCategories = ['workflow', 'notification', 'document', 'integration', 'activity'] as const;
    for (const cat of newCategories) {
      const parsed = Category.safeParse(cat);
      expect(parsed.success).toBe(true);
    }
  });
});
