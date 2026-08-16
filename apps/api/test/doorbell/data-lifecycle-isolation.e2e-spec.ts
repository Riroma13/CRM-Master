/**
 * DOORBELL — SPEC-0032 lifecycle tenant isolation.
 *
 * This suite is intentionally enabled only with an explicitly disposable
 * database URL. It must never fall back to DATABASE_URL/DATABASE_TEST_URL.
 */
import { INestApplication } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const SAFE_DATABASE_URL = process.env.SPEC0032_DISPOSABLE_DATABASE_URL;
let safeDatabase = false;
let DOORBELL_DATABASE_URL: string | undefined;
if (SAFE_DATABASE_URL) {
  const url = new URL(SAFE_DATABASE_URL);
  safeDatabase = !['crm_test', 'production'].includes(url.pathname.slice(1)) && url.hostname !== 'production';
  if (safeDatabase) {
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '30');
    DOORBELL_DATABASE_URL = url.toString();
  }
}

const TENANT_A_ID = '00000000-0000-0000-0000-000000000321';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000322';
const TENANT_A_SLUG = 'lifecycle-doorbell-a';
const TENANT_B_SLUG = 'lifecycle-doorbell-b';

(safeDatabase ? describe : describe.skip)('DOORBELL — lifecycle tenant isolation', () => {
  let app: INestApplication;
  let prisma: any;

  beforeAll(async () => {
    process.env.DATABASE_URL = DOORBELL_DATABASE_URL;
    process.env.DATABASE_TEST_URL = DOORBELL_DATABASE_URL;
    const { AppModule } = require('../../src/app.module');
    const { PrismaService } = require('../../src/common/prisma.service');
    const module = await Test.createTestingModule({
      imports: [AppModule, BullModule.registerQueue({ name: 'lifecycle' })],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = module.get(PrismaService);

    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: TENANT_A_SLUG, name: 'Lifecycle Doorbell A' },
        { id: TENANT_B_ID, slug: TENANT_B_SLUG, name: 'Lifecycle Doorbell B' },
      ],
    });
    await prisma.admin.dataLifecyclePolicy.createMany({
      data: [
        { tenantId: TENANT_A_ID, target: 'audit-events', schedule: '0 0 * * *', enabled: false },
        { tenantId: TENANT_B_ID, target: 'audit-events', schedule: '0 0 * * *', enabled: false },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    if (app) await app.close();
  });

  it('does not expose or mutate another Host tenant policy', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/lifecycle/policies/audit-events')
      .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/lifecycle/policies/audit-events')
      .set('Host', `${TENANT_B_SLUG}.crmmaster.com`)
      .expect(200);

    await request(app.getHttpServer())
      .put('/api/v1/lifecycle/policies/audit-events')
      .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
      .send({ target: 'audit-events', schedule: '0 1 * * *', enabled: false })
      .expect(200);

    const policies = await prisma.admin.dataLifecyclePolicy.findMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      orderBy: { tenantId: 'asc' },
    });
    expect(policies).toHaveLength(2);
    expect(policies.find((policy: any) => policy.tenantId === TENANT_B_ID).schedule).toBe('0 0 * * *');
  });

  it('returns only the Host tenant run ledger', async () => {
    const policyB = await prisma.admin.dataLifecyclePolicy.findFirst({ where: { tenantId: TENANT_B_ID } });
    await prisma.admin.dataLifecycleRun.create({
      data: {
        tenantId: TENANT_B_ID,
        policyId: policyB.id,
        scheduledFor: new Date('2026-01-01T00:00:00.000Z'),
        status: 'SUCCEEDED',
        purgedCount: 3,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/lifecycle/policies/audit-events/runs')
      .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
      .expect(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
    expect(response.body.purgedCount).toBe(0);
  });

  it('rejects a forged job tenant envelope before ledger mutation', async () => {
    const { JobsLifecycleService } = require('../../src/modules/jobs/jobs-lifecycle.service');
    const { createLifecycleJobDefinition } = require('../../src/modules/lifecycle/lifecycle-job.definition');
    const { LifecycleRunnerProcessor } = require('../../src/modules/lifecycle/lifecycle-runner.processor');
    const jobs = app.get(JobsLifecycleService);
    const runner = app.get(LifecycleRunnerProcessor);
    const policy = await prisma.admin.dataLifecyclePolicy.findFirst({ where: { tenantId: TENANT_A_ID } });
    const before = await prisma.admin.dataLifecycleRun.count({ where: { policyId: policy.id } });

    await expect(jobs.execute(createLifecycleJobDefinition(runner), {
      context: { tenantId: TENANT_A_ID, idempotencyKey: 'doorbell-forged-job' },
      data: { policyId: policy.id, scheduledFor: new Date().toISOString(), tenantId: TENANT_B_ID },
    })).rejects.toThrow('Invalid job envelope');

    await expect(prisma.admin.dataLifecycleRun.count({ where: { policyId: policy.id } })).resolves.toBe(before);
  });
});

if (!safeDatabase) {
  describe('DOORBELL safety gate', () => {
    it('skips because SPEC0032_DISPOSABLE_DATABASE_URL is not a dedicated non-production schema', () => {
      console.warn('[SPEC-0032] Skipped: provide SPEC0032_DISPOSABLE_DATABASE_URL for disposable real-HTTP proof.');
    });
  });
}
