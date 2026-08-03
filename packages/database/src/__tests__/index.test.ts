import { describe, it, expect, vi } from 'vitest';

const capturedQuery = vi.hoisted(() => ({ handler: undefined as any }));

vi.mock('@prisma/client', () => {
  const createMockClient = () => ({
    $extends: vi.fn((extension: any) => {
      if (extension.query?.$allModels?.$allOperations) {
        capturedQuery.handler = extension.query.$allModels.$allOperations;
      }

      return {
        ...(extension.client ?? {}),
        ...createMockClient(),
      };
    }),
  });

  const mockPrismaClient = vi.fn(() => createMockClient());
  return { PrismaClient: mockPrismaClient };
});

import { createPrismaClient } from '../index';

describe('createPrismaClient with clienteId', () => {
  it('accepts { tenantId } without clienteId (backward compat)', () => {
    const client = createPrismaClient({ tenantId: 't1' });
    expect(client).toBeDefined();
  });

  it('accepts { tenantId, clienteId }', () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    expect(client).toBeDefined();
  });

  it('injects clienteId on Cita model for findMany', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { where: { titulo: 'test' } };

    await query({ model: 'Cita', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Documento model for findMany', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { where: {} };

    await query({ model: 'Documento', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBe('c1');
  });

  it('does NOT inject clienteId when clienteId is not provided', async () => {
    const client = createPrismaClient({ tenantId: 't1' });
    const query = capturedQuery.handler;
    const args: any = { where: {} };

    await query({ model: 'Cita', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBeUndefined();
    expect(args.where.tenantId).toBe('t1');
  });

  it('injects clienteId only on models with clienteId field', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { where: {} };

    await query({ model: 'LegacyUser', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBeUndefined();
    expect(args.where.tenantId).toBe('t1');
  });

  it('creates unscoped client without tenantId', () => {
    const client = createPrismaClient({});
    expect(client).toBeDefined();
  });

  it('accepts single-string tenantId (backward compat)', () => {
    const client = createPrismaClient('t1');
    expect(client).toBeDefined();
  });

  it('injects clienteId on Cita model for create', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { data: { titulo: 'test' } };

    await query({ model: 'Cita', operation: 'create', args, query: vi.fn((a: any) => a) });

    expect(args.data.tenantId).toBe('t1');
    expect(args.data.clienteId).toBe('c1');
  });

  it('injects clienteId on Documento model for createMany', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { data: [{ titulo: 'doc1' }, { titulo: 'doc2' }] };

    await query({ model: 'Documento', operation: 'createMany', args, query: vi.fn((a: any) => a) });

    expect(args.data[0].clienteId).toBe('c1');
    expect(args.data[1].clienteId).toBe('c1');
    expect(args.data[0].tenantId).toBe('t1');
  });

  it('injects clienteId on Cita model for update', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { where: { id: 1 }, data: { titulo: 'updated' } };

    await query({ model: 'Cita', operation: 'update', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Cita model for delete', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = { where: { id: 1 } };

    await query({ model: 'Cita', operation: 'delete', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Cita model for upsert', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = capturedQuery.handler;
    const args: any = {
      where: { id: 1 },
      create: { titulo: 'new' },
      update: { titulo: 'updated' },
    };

    await query({ model: 'Cita', operation: 'upsert', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
    expect(args.create.clienteId).toBe('c1');
    expect(args.create.tenantId).toBe('t1');
  });
});
