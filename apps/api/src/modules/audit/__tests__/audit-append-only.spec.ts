import { createAuditAppendOnlyMiddleware } from '../audit-append-only.middleware';
import { createPrismaClient } from '../../../../../../packages/database/src';
import { auditAppendOnlyExtension } from '../../../../../../packages/database/src/audit-append-only.extension';

type MWParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

describe('AuditAppendOnlyMiddleware', () => {
  let middleware: ReturnType<typeof createAuditAppendOnlyMiddleware>;

  beforeEach(() => {
    middleware = createAuditAppendOnlyMiddleware();
  });

  function createParams(overrides: Partial<MWParams>): MWParams {
    return {
      model: 'AuditEvent',
      action: 'create',
      args: {},
      dataPath: [],
      runInTransaction: false,
      ...overrides,
    };
  }

  it('allows create on AuditEvent', async () => {
    const next = jest.fn().mockResolvedValue({ id: 'evt-1' });
    const params = createParams({ action: 'create' });

    const result = await middleware(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: 'evt-1' });
  });

  it('allows findMany on AuditEvent', async () => {
    const next = jest.fn().mockResolvedValue([]);
    const params = createParams({ action: 'findMany' });

    const result = await middleware(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual([]);
  });

  it('throws on update of AuditEvent', async () => {
    const next = jest.fn();
    const params = createParams({ action: 'update', args: { where: { id: 'evt-1' }, data: { outcome: 'failure' } } });

    await expect(middleware(params, next)).rejects.toThrow(
      'Audit events are append-only. Updates are not permitted.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws on delete of AuditEvent', async () => {
    const next = jest.fn();
    const params = createParams({ action: 'delete', args: { where: { id: 'evt-1' } } });

    await expect(middleware(params, next)).rejects.toThrow(
      'Audit events are append-only. Deletions are not permitted.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws on updateMany of AuditEvent', async () => {
    const next = jest.fn();
    const params = createParams({ action: 'updateMany', args: { where: { tenantId: 't-1' }, data: { legalHold: true } } });

    await expect(middleware(params, next)).rejects.toThrow(
      'Audit events are append-only. Updates are not permitted.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws on deleteMany of AuditEvent', async () => {
    const next = jest.fn();
    const params = createParams({ action: 'deleteMany', args: { where: { tenantId: 't-1' } } });

    await expect(middleware(params, next)).rejects.toThrow(
      'Audit events are append-only. Deletions are not permitted.',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows update when __internalRedact flag is set', async () => {
    const next = jest.fn().mockResolvedValue({ id: 'evt-1' });
    const params = createParams({
      action: 'update',
      args: {
        where: { id: 'evt-1' },
        data: { metadata: { _redacted: true } },
        __internalRedact: true,
      },
    });

    const result = await middleware(params, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].args.__internalRedact).toBeUndefined();
    expect(result).toEqual({ id: 'evt-1' });
  });

  it('allows updateMany when __internalRedact flag is set', async () => {
    const next = jest.fn().mockResolvedValue({ count: 1 });
    const params = createParams({
      action: 'updateMany',
      args: {
        where: { tenantId: 't-1' },
        data: { legalHold: false },
        __internalRedact: true,
      },
    });

    const result = await middleware(params, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].args.__internalRedact).toBeUndefined();
    expect(result).toEqual({ count: 1 });
  });

  it('passes through non-AuditEvent models', async () => {
    const next = jest.fn().mockResolvedValue({ id: 1 });
    const params = createParams({ model: 'User', action: 'update', args: { where: { id: 'u-1' }, data: { name: 'new' } } });

    const result = await middleware(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect(result).toEqual({ id: 1 });
  });
});

describe('Audit append-only Prisma client invariant', () => {
  it('blocks AuditEvent updates on an unscoped client before database access', async () => {
    const client = createPrismaClient();

    await expect(
      client.auditEvent.update({
        where: { id: 'evt-1' },
        data: { outcome: 'failure' },
      }),
    ).rejects.toThrow('Audit events are append-only. Updates are not permitted.');
  });

  it('blocks AuditEvent deletes on a tenant-scoped client before database access', async () => {
    const client = createPrismaClient('tenant-1');

    await expect(
      client.auditEvent.delete({ where: { id: 'evt-1' } }),
    ).rejects.toThrow('Audit events are append-only. Deletions are not permitted.');
  });

  it.each([
    ['update', 'auditEvent.update'],
    ['updateMany', 'auditEvent.updateMany'],
    ['delete', 'auditEvent.delete'],
    ['deleteMany', 'auditEvent.deleteMany'],
  ])('blocks %s on a tenant-scoped client', async (_operation, accessor) => {
    const client = createPrismaClient('tenant-1') as any;
    const [delegate, method] = accessor.split('.') as [string, string];
    const args = method.includes('Many')
      ? { where: { tenantId: 'tenant-1' } }
      : { where: { id: 'evt-1' } };

    await expect(client[delegate][method](args)).rejects.toThrow(/Audit events are append-only/);
  });

  it('strips the internal redaction marker before delegating an update', async () => {
    const next = jest.fn().mockResolvedValue({ count: 1 });
    const hook = (auditAppendOnlyExtension.query.$allModels as any).$allOperations;
    const args = {
      where: { tenantId: 'tenant-1' },
      data: { legalHold: false },
      __internalRedact: true,
    };

    await expect(hook({ model: 'AuditEvent', operation: 'updateMany', args, query: next })).resolves.toEqual({ count: 1 });
    expect(next).toHaveBeenCalledWith({ where: { tenantId: 'tenant-1' }, data: { legalHold: false } });
  });

  it('keeps deletes blocked when the internal redaction marker is present', async () => {
    const hook = (auditAppendOnlyExtension.query.$allModels as any).$allOperations;

    await expect(
      hook({
        model: 'AuditEvent',
        operation: 'deleteMany',
        args: { where: { tenantId: 'tenant-1' }, __internalRedact: true },
        query: jest.fn(),
      }),
    ).rejects.toThrow('Audit events are append-only. Deletions are not permitted.');
  });
});
