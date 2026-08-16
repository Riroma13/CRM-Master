import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { LifecycleController } from '../lifecycle.controller';
import { LifecyclePolicyService } from '../lifecycle-policy.service';
import { PrismaService } from '../../../common/prisma.service';

describe('LifecycleController', () => {
  let app: INestApplication;
  const policyService = {
    upsertPolicy: jest.fn().mockResolvedValue({ id: 'policy-a', target: 'audit-events', enabled: true }),
    getPolicy: jest.fn().mockResolvedValue({ id: 'policy-a', target: 'audit-events', tenantId: 'tenant-a' }),
    setEnabled: jest.fn().mockResolvedValue({ id: 'policy-a', enabled: false }),
  };
  const prisma = {
    forTenant: jest.fn().mockReturnValue({
      dataLifecyclePolicy: {
        findFirst: jest.fn().mockResolvedValue({ id: 'policy-b' }),
      },
      dataLifecycleRun: {
        findMany: jest.fn().mockResolvedValue([{ id: 'run-b', tenantId: 'tenant-b', purgedCount: 4 }]),
        count: jest.fn().mockResolvedValue(1),
        aggregate: jest.fn().mockResolvedValue({ _sum: { purgedCount: 4 } }),
      },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [LifecycleController],
      providers: [
        { provide: LifecyclePolicyService, useValue: policyService },
        { provide: PrismaService, useValue: prisma },
        { provide: 'APP_GUARD', useValue: { canActivate: () => true } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.tenantId = req.headers.host?.startsWith('tenant-b') ? 'tenant-b' : 'tenant-a';
      next();
    });
    await app.init();
  });

  afterEach(async () => app.close());

  it('upserts a policy using the Host-derived tenant, never request input', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/lifecycle/policies/audit-events')
      .set('Host', 'tenant-a.example.test')
      .send({ target: 'audit-events', schedule: '0 0 * * *', enabled: true })
      .expect(200);

    expect(policyService.upsertPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a' }),
      { target: 'audit-events', schedule: '0 0 * * *', enabled: true },
      'audit-events',
    );
    expect(policyService.upsertPolicy.mock.calls[0][0]).not.toHaveProperty('tenantId', 'tenant-b');
  });

  it('rejects route/body target mismatches before persistence', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/lifecycle/policies/audit-events')
      .send({ target: 'document-trash', schedule: '0 0 * * *', enabled: true })
      .expect(400);

    expect(policyService.upsertPolicy).not.toHaveBeenCalled();
  });

  it('rejects tenant authority and unsupported retention fields', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/lifecycle/policies/audit-events')
      .send({
        target: 'audit-events',
        schedule: '0 0 * * *',
        enabled: true,
        tenantId: 'tenant-b',
        archiveAfterDays: 30,
      })
      .expect(400);

    expect(policyService.upsertPolicy).not.toHaveBeenCalled();
  });

  it('returns a missing policy as an indistinguishable 404', async () => {
    policyService.getPolicy.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/api/v1/lifecycle/policies/audit-events')
      .set('Host', 'tenant-a.example.test')
      .expect(404);
  });

  it('disables a policy through the Host-derived tenant', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/lifecycle/policies/audit-events')
      .set('Host', 'tenant-b.example.test')
      .expect(200);

    expect(policyService.setEnabled).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-b' }),
      'audit-events',
      false,
    );
  });

  it('returns only the resolved tenant ledger with pagination and purgedCount', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/lifecycle/policies/audit-events/runs?page=2&limit=10')
      .set('Host', 'tenant-b.example.test')
      .expect(200);

    expect(response.body).toEqual({
      data: [{ id: 'run-b', tenantId: 'tenant-b', purgedCount: 4 }],
      pagination: { page: 2, limit: 10, total: 1 },
      purgedCount: 4,
    });
    expect(prisma.forTenant).toHaveBeenCalledWith('tenant-b');
  });
});
