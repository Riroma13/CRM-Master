/**
 * 🔔 DOORBELL — SPEC-0028 Jobs tenant isolation
 *
 * Requires DATABASE_URL or DATABASE_TEST_URL. This suite uses the real Nest
 * application and Prisma tenant scope; it is intentionally not replaced by
 * mocked unit coverage.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { z } from 'zod';

jest.mock('@shared/plugin', () => ({ validatePluginManifest: jest.fn() }), { virtual: true });

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { JobDefinition, TrustedJobContext } from '../../src/modules/jobs/jobs.contracts';
import { JobsLifecycleService } from '../../src/modules/jobs/jobs-lifecycle.service';

const TENANT_A_ID = '00000000-0000-0000-0000-000000000125';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000126';
const TENANT_A_SLUG = 'jobs-doorbell-a';
const TENANT_B_SLUG = 'jobs-doorbell-b';

describe('🔔 DOORBELL — Jobs tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let lifecycle: JobsLifecycleService;

  const context: TrustedJobContext = {
    tenantId: TENANT_A_ID,
    correlationId: 'jobs-doorbell-correlation',
    idempotencyKey: 'jobs-doorbell-request',
  };
  const definition: JobDefinition<{ value: string; tenantId?: string }> = {
    key: 'jobs-doorbell-job',
    queueName: 'jobs-doorbell-queue',
    schema: z.object({ value: z.string(), tenantId: z.string().optional() }),
    attempts: 1,
    backoff: { type: 'exponential', delay: 100 },
    concurrency: 1,
    handle: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    lifecycle = moduleFixture.get(JobsLifecycleService);

    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.tenant.createMany({
      data: [
        {
          id: TENANT_A_ID,
          slug: TENANT_A_SLUG,
          name: 'Jobs Doorbell A',
          betterAuthOrganizationId: '00000000-0000-0000-0000-000000000127',
        },
        {
          id: TENANT_B_ID,
          slug: TENANT_B_SLUG,
          name: 'Jobs Doorbell B',
          betterAuthOrganizationId: '00000000-0000-0000-0000-000000000128',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await app.close();
  });

  it('denies a tenant A job envelope targeting tenant B', async () => {
    await expect(
      lifecycle.execute(definition, { context, data: { value: 'cross-tenant', tenantId: TENANT_B_ID } }),
    ).rejects.toThrow('Invalid job envelope');
    expect(definition.handle).not.toHaveBeenCalled();
  });

  it('fails closed for a forged tenant context even when both tenants are active', async () => {
    await expect(
      lifecycle.execute(
        definition,
        { context: { ...context, tenantId: TENANT_B_ID }, data: { value: 'forged', tenantId: TENANT_A_ID } },
      ),
    ).rejects.toThrow();
    expect(definition.handle).not.toHaveBeenCalled();
  });

  it('denies execution for an inactive tenant', async () => {
    await prisma.admin.tenant.update({ where: { id: TENANT_B_ID }, data: { isActive: false } });

    await expect(
      lifecycle.execute(definition, {
        context: { ...context, tenantId: TENANT_B_ID },
        data: { value: 'inactive' },
      }),
    ).rejects.toThrow('inactive or missing');
  });

  it('reloads execution through PrismaService.forTenant before invoking effects', async () => {
    await prisma.admin.tenant.update({ where: { id: TENANT_B_ID }, data: { isActive: true } });
    const scopedClient = jest.spyOn(PrismaService.prototype, 'forTenant');

    await lifecycle.execute(definition, { context, data: { value: 'scoped-reload' } });

    expect(scopedClient).toHaveBeenCalledWith(TENANT_A_ID);
    scopedClient.mockRestore();
  });
});
