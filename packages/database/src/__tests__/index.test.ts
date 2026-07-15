import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn(() => ({
    $extends: vi.fn((ext: any) => {
      if (ext.client) {
        return {
          $extends: vi.fn(),
          ...ext.client,
          $queryRaw: ext.client.$queryRaw,
          $queryRawUnsafe: ext.client.$queryRawUnsafe,
          $executeRaw: ext.client.$executeRaw,
        };
      }
      const capturedQuery = ext.query.$allModels.$allOperations;
      return {
        $extends: vi.fn((innerExt: any) => {
          if (innerExt.client) {
            return {
              $queryRaw: innerExt.client.$queryRaw,
              $queryRawUnsafe: innerExt.client.$queryRawUnsafe,
              $executeRaw: innerExt.client.$executeRaw,
              _capturedQuery: capturedQuery,
            };
          }
          return { $extends: vi.fn() };
        }),
        _capturedQuery: capturedQuery,
      };
    }),
  }));
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
    const query = (client as any)._capturedQuery;
    const args: any = { where: { titulo: 'test' } };

    await query({ model: 'Cita', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Documento model for findMany', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { where: {} };

    await query({ model: 'Documento', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBe('c1');
  });

  it('does NOT inject clienteId when clienteId is not provided', async () => {
    const client = createPrismaClient({ tenantId: 't1' });
    const query = (client as any)._capturedQuery;
    const args: any = { where: {} };

    await query({ model: 'Cita', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBeUndefined();
    expect(args.where.tenantId).toBe('t1');
  });

  it('injects clienteId only on models with clienteId field', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { where: {} };

    await query({ model: 'User', operation: 'findMany', args, query: vi.fn((a: any) => a) });

    expect(args.where.clienteId).toBeUndefined();
    expect(args.where.tenantId).toBe('t1');
  });

  it('creates unscoped client without tenantId', () => {
    const client = createPrismaClient({});
    expect(client._capturedQuery).toBeUndefined();
  });

  it('accepts single-string tenantId (backward compat)', () => {
    const client = createPrismaClient('t1');
    expect(client).toBeDefined();
  });

  it('injects clienteId on Cita model for create', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { data: { titulo: 'test' } };

    await query({ model: 'Cita', operation: 'create', args, query: vi.fn((a: any) => a) });

    expect(args.data.tenantId).toBe('t1');
    expect(args.data.clienteId).toBe('c1');
  });

  it('injects clienteId on Documento model for createMany', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { data: [{ titulo: 'doc1' }, { titulo: 'doc2' }] };

    await query({ model: 'Documento', operation: 'createMany', args, query: vi.fn((a: any) => a) });

    expect(args.data[0].clienteId).toBe('c1');
    expect(args.data[1].clienteId).toBe('c1');
    expect(args.data[0].tenantId).toBe('t1');
  });

  it('injects clienteId on Cita model for update', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { where: { id: 1 }, data: { titulo: 'updated' } };

    await query({ model: 'Cita', operation: 'update', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Cita model for delete', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
    const args: any = { where: { id: 1 } };

    await query({ model: 'Cita', operation: 'delete', args, query: vi.fn((a: any) => a) });

    expect(args.where.tenantId).toBe('t1');
    expect(args.where.clienteId).toBe('c1');
  });

  it('injects clienteId on Cita model for upsert', async () => {
    const client = createPrismaClient({ tenantId: 't1', clienteId: 'c1' });
    const query = (client as any)._capturedQuery;
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
