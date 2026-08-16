import { LifecyclePolicyInput } from '../../../../../../packages/shared/src/lifecycle';
import { LifecyclePolicyService } from '../lifecycle-policy.service';

describe('LifecyclePolicyService', () => {
  const prisma = {
    admin: {
      dataLifecyclePolicy: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    },
  };
  const jobs = { schedule: jest.fn(), cancel: jest.fn() };
  const audit = { log: jest.fn() };
  const context = { tenantId: 'tenant-host', idempotencyKey: 'request-1' };

  beforeEach(() => jest.clearAllMocks());

  it('persists tenant identity from trusted Host context and schedules a stable id', async () => {
    prisma.admin.dataLifecyclePolicy.upsert.mockResolvedValue({
      id: 'policy-1', tenantId: context.tenantId, target: 'audit-events', schedule: '0 2 * * *', enabled: true,
    });

    const service = new LifecyclePolicyService(prisma as any, jobs as any, audit as any);
    await service.upsertPolicy(context, { target: 'audit-events', schedule: '0 2 * * *', enabled: true });

    expect(prisma.admin.dataLifecyclePolicy.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_target: { tenantId: context.tenantId, target: 'audit-events' } },
      create: expect.objectContaining({ tenantId: context.tenantId }),
    }));
    expect(jobs.schedule).toHaveBeenCalledWith(expect.anything(), 'lifecycle:policy-1', '0 2 * * *', context, { policyId: 'policy-1', scheduledFor: expect.any(String) });
  });

  it('rejects target mismatches and unsupported duration fields before persistence', async () => {
    const service = new LifecyclePolicyService(prisma as any, jobs as any, audit as any);

    await expect(service.upsertPolicy(context, { target: 'document-trash', schedule: '0 2 * * *', enabled: true }, 'audit-events')).rejects.toThrow();
    await expect(service.upsertPolicy(context, { target: 'audit-events', schedule: '0 2 * * *', enabled: true, purgeAfterDays: 30 } as LifecyclePolicyInput & { purgeAfterDays: number })).rejects.toThrow();
    expect(prisma.admin.dataLifecyclePolicy.upsert).not.toHaveBeenCalled();
  });

  it('masks a foreign or missing policy and supports deterministic enable/disable', async () => {
    prisma.admin.dataLifecyclePolicy.findFirst.mockResolvedValue(null);
    const service = new LifecyclePolicyService(prisma as any, jobs as any, audit as any);
    await expect(service.getPolicy(context, 'audit-events')).resolves.toBeNull();

    prisma.admin.dataLifecyclePolicy.findFirst.mockResolvedValue({ id: 'policy-1', tenantId: context.tenantId, target: 'audit-events' });
    prisma.admin.dataLifecyclePolicy.update.mockResolvedValue({ id: 'policy-1', enabled: false });
    await service.setEnabled(context, 'audit-events', false);
    expect(prisma.admin.dataLifecyclePolicy.update).toHaveBeenCalledWith(expect.objectContaining({ data: { enabled: false } }));
    expect(jobs.cancel).toHaveBeenCalledWith('lifecycle', 'lifecycle:policy-1');
  });
});
