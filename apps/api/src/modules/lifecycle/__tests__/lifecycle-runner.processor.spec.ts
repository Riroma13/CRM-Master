import { LifecycleRunnerProcessor } from '../lifecycle-runner.processor';

describe('LifecycleRunnerProcessor', () => {
  const adapter = { target: 'audit-events', execute: jest.fn() };
  const audit = { log: jest.fn() };
  const transaction = jest.fn();
  const scoped = { $transaction: transaction };
  const prisma = { forTenant: jest.fn(() => scoped) };
  const context = { tenantId: 'tenant-trusted', idempotencyKey: 'run-1' };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a forged tenant envelope before mutation', async () => {
    const runner = new LifecycleRunnerProcessor(prisma as any, [adapter] as any, audit as any);
    await expect(runner.handle(context, { policyId: 'policy-1', tenantId: 'tenant-forged', scheduledFor: new Date().toISOString() } as any)).rejects.toThrow();
    expect(prisma.forTenant).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('claims and dispatches a lifecycle run exactly once', async () => {
    const run = { id: 'run-1', status: 'RUNNING', purgedCount: 0 };
    const tx = {
      dataLifecyclePolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'policy-1', target: 'audit-events', enabled: true }) },
      dataLifecycleRun: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(run), update: jest.fn().mockResolvedValue({ ...run, status: 'SUCCEEDED', purgedCount: 4 }) },
    };
    transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));
    adapter.execute.mockResolvedValue({ purgedCount: 4 });
    const runner = new LifecycleRunnerProcessor(prisma as any, [adapter] as any, audit as any);

    await runner.handle(context, { policyId: 'policy-1', scheduledFor: '2026-08-16T02:00:00.000Z' });

    expect(adapter.execute).toHaveBeenCalledWith(context, expect.objectContaining({ target: 'audit-events' }));
    expect(tx.dataLifecycleRun.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCEEDED', purgedCount: 4 }) }));
    expect(audit.log).toHaveBeenCalled();
  });

  it('returns a terminal duplicate without dispatch and redacts adapter failures', async () => {
    const terminal = { id: 'run-1', status: 'SUCCEEDED', purgedCount: 2 };
    const tx = {
      dataLifecyclePolicy: { findUnique: jest.fn().mockResolvedValue({ id: 'policy-1', target: 'audit-events', enabled: true }) },
      dataLifecycleRun: { findUnique: jest.fn().mockResolvedValue(terminal), create: jest.fn(), update: jest.fn() },
    };
    transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));
    const runner = new LifecycleRunnerProcessor(prisma as any, [adapter] as any, audit as any);
    await expect(runner.handle(context, { policyId: 'policy-1', scheduledFor: '2026-08-16T02:00:00.000Z' })).resolves.toEqual(terminal);
    expect(adapter.execute).not.toHaveBeenCalled();
    expect(tx.dataLifecycleRun.create).not.toHaveBeenCalled();
  });
});
