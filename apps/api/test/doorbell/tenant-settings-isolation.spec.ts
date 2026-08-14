/**
 * 🔔 DOORBELL — Tenant settings Host isolation
 *
 * This test must exercise the real Nest HTTP pipeline. Direct Prisma reads do
 * not prove that Host resolution, @TenantId(), guards, DTO validation, and the
 * settings facade agree on the same tenant boundary.
 *
 * Requires DATABASE_URL or DATABASE_TEST_URL.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_A_ID = '00000000-0000-0000-0000-000000000031';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000032';
const TENANT_A_SLUG = 'settings-doorbell-a';
const TENANT_B_SLUG = 'settings-doorbell-b';
const BA_USER_ID = '00000000-0000-0000-0000-000000000037';
const LEGACY_USER_ID = '00000000-0000-0000-0000-000000000038';
const BA_ORG_ID = '00000000-0000-0000-0000-000000000039';
const BA_MEMBER_ID = '00000000-0000-0000-0000-000000000040';
const BA_SESSION_ID = '00000000-0000-0000-0000-000000000041';
const SESSION_TOKEN = 'tenant-settings-doorbell-session';
const USER_EMAIL = 'tenant-settings-doorbell@example.test';

const dbAvailable = Boolean(process.env.DATABASE_URL || process.env.DATABASE_TEST_URL);

if (dbAvailable) {
  describe('DOORBELL — tenant settings Host isolation', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      process.env.BETTER_AUTH_URL = 'http://localhost:3000';

      const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));
      await app.init();
      prisma = moduleFixture.get(PrismaService);

      await cleanupFixtures();

      await prisma.admin.tenant.createMany({
        data: [
          { id: TENANT_A_ID, slug: TENANT_A_SLUG, name: 'Tenant A' },
          {
            id: TENANT_B_ID,
            slug: TENANT_B_SLUG,
            name: 'Tenant B',
            betterAuthOrganizationId: BA_ORG_ID,
          },
        ],
      });

      await prisma.admin.legacyUser.create({
        data: {
          id: LEGACY_USER_ID,
          tenantId: TENANT_B_ID,
          email: USER_EMAIL,
          name: 'Tenant Settings Doorbell Owner',
          role: 'owner',
          betterAuthUserId: BA_USER_ID,
        },
      });

      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW())`,
        BA_ORG_ID,
        'Tenant B',
        TENANT_B_SLUG,
      );
      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, true, $3, NOW(), NOW())`,
        BA_USER_ID,
        USER_EMAIL,
        'Tenant Settings Doorbell Owner',
      );
      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_members (id, organization_id, user_id, role, "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
        BA_MEMBER_ID,
        BA_ORG_ID,
        BA_USER_ID,
        'owner',
      );
      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_sessions (id, user_id, token, expires_at, active_organization_id, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        BA_SESSION_ID,
        BA_USER_ID,
        SESSION_TOKEN,
        new Date(Date.now() + 60 * 60 * 1000),
        BA_ORG_ID,
      );
    });

    afterAll(async () => {
      if (prisma) await cleanupFixtures();
      if (app) await app.close();
    });

    it('uses Host-derived tenant context for GET/PATCH and rejects a body tenantId', async () => {
      const hostB = `${TENANT_B_SLUG}.crmmaster.com`;
      const hostA = `${TENANT_A_SLUG}.crmmaster.com`;
      const auth = { Authorization: `Bearer ${SESSION_TOKEN}` };

      const readB = await request(app.getHttpServer())
        .get('/api/v1/tenant/settings')
        .set('Host', hostB)
        .set(auth);
      expect(readB.status).toBe(200);
      expect(readB.body).toMatchObject({ id: TENANT_B_ID, name: 'Tenant B' });
      expect(readB.body.name).not.toBe('Tenant A');

      const readAWithTenantBSession = await request(app.getHttpServer())
        .get('/api/v1/tenant/settings')
        .set('Host', hostA)
        .set(auth);
      expect(readAWithTenantBSession.status).toBe(403);

      const updateAWithTenantBSession = await request(app.getHttpServer())
        .patch('/api/v1/tenant/settings')
        .set('Host', hostA)
        .set(auth)
        .send({ name: 'Cross-tenant mutation attempt' });
      expect(updateAWithTenantBSession.status).toBe(403);

      const forgedUpdate = await request(app.getHttpServer())
        .patch('/api/v1/tenant/settings')
        .set('Host', hostB)
        .set(auth)
        .send({ name: 'Forged tenant update', tenantId: TENANT_A_ID });
      expect(forgedUpdate.status).toBe(400);

      const updateB = await request(app.getHttpServer())
        .patch('/api/v1/tenant/settings')
        .set('Host', hostB)
        .set(auth)
        .send({ name: 'Tenant B Updated' });
      expect(updateB.status).toBe(200);
      expect(updateB.body).toMatchObject({ id: TENANT_B_ID, name: 'Tenant B Updated' });

      const [tenantA, tenantB] = await Promise.all([
        prisma.admin.tenant.findUnique({ where: { id: TENANT_A_ID }, select: { name: true } }),
        prisma.admin.tenant.findUnique({ where: { id: TENANT_B_ID }, select: { name: true } }),
      ]);
      expect(tenantA?.name).toBe('Tenant A');
      expect(tenantB?.name).toBe('Tenant B Updated');
    });

    async function cleanupFixtures() {
      await prisma.admin.$executeRawUnsafe(
        'DELETE FROM ba_sessions WHERE id = $1 OR user_id = $2',
        BA_SESSION_ID,
        BA_USER_ID,
      );
      await prisma.admin.$executeRawUnsafe(
        'DELETE FROM ba_members WHERE id = $1 OR user_id = $2',
        BA_MEMBER_ID,
        BA_USER_ID,
      );
      await prisma.admin.$executeRawUnsafe(
        'DELETE FROM ba_users WHERE id = $1 OR email = $2',
        BA_USER_ID,
        USER_EMAIL,
      );
      await prisma.admin.legacyUser.deleteMany({
        where: { id: LEGACY_USER_ID },
      });
      await prisma.admin.tenant.deleteMany({
        where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.$executeRawUnsafe(
        'DELETE FROM ba_organizations WHERE id = $1 OR slug = $2',
        BA_ORG_ID,
        TENANT_B_SLUG,
      );
    }
  });
} else {
  describe('DOORBELL — tenant settings Host isolation', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn('[DOORBELL] Skipping tenant settings Host isolation: DATABASE_URL not set.');
    });
  });
}
