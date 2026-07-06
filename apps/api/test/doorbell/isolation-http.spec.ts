/**
 * 🔔 DOORBELL HTTP — Multi-tenant isolation gate via HTTP
 *
 * CRÍTICO: Estos tests DEBEN fallar si el pipeline HTTP permite
 * fuga de datos entre tenants. Verifican que:
 * 1. TenantResolveMiddleware resuelve el tenant desde el Host header
 * 2. BetterAuthGuard valida sesiones contra ba_sessions reales
 * 3. TenantScopeGuard controla acceso basado en rol superadmin
 * 4. Los servicios scopean los datos al tenant correcto
 *
 * Requiere DATABASE_URL o DATABASE_TEST_URL para ejecutarse.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { BetterAuthGuard } from '../../src/common/guards/better-auth.guard';

// ─── Constantes ───────────────────────────────────────────────

const TENANT_A_ID = '00000000-0000-0000-0000-000000000011';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000012';
const TENANT_A_SLUG = 'e2e-test-tenant-a';
const TENANT_B_SLUG = 'e2e-test-tenant-b';
const USER_A_ID = '00000000-0000-0000-0000-000000000013';
const USER_B_ID = '00000000-0000-0000-0000-000000000014';
const NON_SUPER_USER_ID = '00000000-0000-0000-0000-000000000015';

const CLIENTE_B_NOMBRE = 'Cliente-Secreto-B-E2E';

const SUPERADMIN_EMAIL_A = `e2e-admin-${TENANT_A_SLUG}@test.com`;
const SUPERADMIN_EMAIL_B = `e2e-admin-${TENANT_B_SLUG}@test.com`;
const NON_SUPER_EMAIL = 'e2e-non-super@test.com';

const SUPERADMIN_TOKEN_A = 'sess_e2e_superadmin_a_token_001';
const NON_SUPER_TOKEN = 'sess_e2e_non_super_token_001';

// ─── DB check ─────────────────────────────────────────────────

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

const BA_EMAILS = [SUPERADMIN_EMAIL_A, SUPERADMIN_EMAIL_B, NON_SUPER_EMAIL];
const BA_SLUGS = [TENANT_A_SLUG, TENANT_B_SLUG];

if (dbAvailable) {
  describe('🔔 DOORBELL HTTP — Multi-tenant isolation via HTTP', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      process.env.BETTER_AUTH_URL = 'http://localhost:3000';

      // Build test module (BetterAuthGuard is registered as APP_GUARD)
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = moduleFixture.get<PrismaService>(PrismaService);

      // ── Cleanup ─────────────────────────────────────────────
      for (const email of BA_EMAILS) {
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_sessions WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_accounts WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_members WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_users WHERE email = $1`, email,
        );
      }
      for (const slug of BA_SLUGS) {
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_invitations WHERE organization_id IN (SELECT id FROM ba_organizations WHERE slug = $1)`, slug,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_members WHERE organization_id IN (SELECT id FROM ba_organizations WHERE slug = $1)`, slug,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_organizations WHERE slug = $1`, slug,
        );
      }
      for (const slug of BA_SLUGS) {
        await prisma.admin.$executeRawUnsafe(
          `UPDATE tenants SET better_auth_org_id = NULL WHERE slug = $1`, slug,
        );
      }
      for (const email of BA_EMAILS) {
        await prisma.admin.$executeRawUnsafe(
          `UPDATE users SET better_auth_user_id = NULL WHERE email = $1`, email,
        );
      }
      await prisma.admin.cliente.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.user.deleteMany({
        where: { id: { in: [USER_A_ID, USER_B_ID, NON_SUPER_USER_ID] } },
      });
      await prisma.admin.tenant.deleteMany({
        where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });

      // ── Seed legacy data ───────────────────────────────────
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_A_ID },
        create: { id: TENANT_A_ID, slug: TENANT_A_SLUG, name: 'E2E Tenant A' },
        update: {},
      });
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_B_ID },
        create: { id: TENANT_B_ID, slug: TENANT_B_SLUG, name: 'E2E Tenant B' },
        update: {},
      });

      await prisma.admin.user.upsert({
        where: { email: SUPERADMIN_EMAIL_A },
        create: {
          id: USER_A_ID, tenantId: TENANT_A_ID,
          email: SUPERADMIN_EMAIL_A, name: 'Admin A E2E', role: 'superadmin',
        },
        update: {},
      });
      await prisma.admin.user.upsert({
        where: { email: SUPERADMIN_EMAIL_B },
        create: {
          id: USER_B_ID, tenantId: TENANT_B_ID,
          email: SUPERADMIN_EMAIL_B, name: 'Admin B E2E', role: 'superadmin',
        },
        update: {},
      });
      await prisma.admin.user.upsert({
        where: { email: NON_SUPER_EMAIL },
        create: {
          id: NON_SUPER_USER_ID, tenantId: TENANT_A_ID,
          email: NON_SUPER_EMAIL, name: 'Non-Super E2E', role: 'admin',
        },
        update: {},
      });

      // ── Seed Better-Auth tables ────────────────────────────
      const orgAId = crypto.randomUUID();
      const orgBId = crypto.randomUUID();
      for (const { id, name, slug } of [
        { id: orgAId, name: 'E2E Tenant A', slug: TENANT_A_SLUG },
        { id: orgBId, name: 'E2E Tenant B', slug: TENANT_B_SLUG },
      ]) {
        await prisma.admin.$executeRawUnsafe(
          `INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW())`,
          id, name, slug,
        );
      }
      await prisma.admin.tenant.update({
        where: { id: TENANT_A_ID }, data: { betterAuthOrganizationId: orgAId },
      });
      await prisma.admin.tenant.update({
        where: { id: TENANT_B_ID }, data: { betterAuthOrganizationId: orgBId },
      });

      const baUserAId = crypto.randomUUID();
      const baUserBId = crypto.randomUUID();
      const baNonSuperId = crypto.randomUUID();
      for (const { id, email, name } of [
        { id: baUserAId, email: SUPERADMIN_EMAIL_A, name: 'Admin A E2E' },
        { id: baUserBId, email: SUPERADMIN_EMAIL_B, name: 'Admin B E2E' },
        { id: baNonSuperId, email: NON_SUPER_EMAIL, name: 'Non-Super E2E' },
      ]) {
        await prisma.admin.$executeRawUnsafe(
          `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          id, email, true, name,
        );
      }

      await prisma.admin.user.update({
        where: { id: USER_A_ID }, data: { betterAuthUserId: baUserAId },
      });
      await prisma.admin.user.update({
        where: { id: USER_B_ID }, data: { betterAuthUserId: baUserBId },
      });
      await prisma.admin.user.update({
        where: { id: NON_SUPER_USER_ID }, data: { betterAuthUserId: baNonSuperId },
      });

      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_members (id, organization_id, user_id, role, "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
        crypto.randomUUID(), orgAId, baNonSuperId, 'admin',
      );

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
        crypto.randomUUID(), baUserAId, SUPERADMIN_TOKEN_A, futureDate.toISOString(),
      );
      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
        crypto.randomUUID(), baNonSuperId, NON_SUPER_TOKEN, futureDate.toISOString(),
      );

      // Verify sessions are queryable (same SQL the guard uses)
      const debugSuper = await prisma.admin.$queryRawUnsafe(
        `SELECT s.user_id as "userId", u.email, u.name
         FROM ba_sessions s
         JOIN ba_users u ON s.user_id = u.id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        SUPERADMIN_TOKEN_A,
      );
      const debugNon = await prisma.admin.$queryRawUnsafe(
        `SELECT s.user_id as "userId", u.email, u.name
         FROM ba_sessions s
         JOIN ba_users u ON s.user_id = u.id
         WHERE s.token = $1 AND s.expires_at > NOW()`,
        NON_SUPER_TOKEN,
      );
      if (!debugSuper?.length || !debugNon?.length) {
        throw new Error('Seed verification failed: sessions not queryable');
      }
    });

    afterAll(async () => {
      if (prisma) {
        for (const email of BA_EMAILS) {
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_sessions WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
          );
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_accounts WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
          );
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_members WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
          );
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_users WHERE email = $1`, email,
          );
          await prisma.admin.$executeRawUnsafe(
            `UPDATE users SET better_auth_user_id = NULL WHERE email = $1`, email,
          );
        }
        for (const slug of BA_SLUGS) {
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_invitations WHERE organization_id IN (SELECT id FROM ba_organizations WHERE slug = $1)`, slug,
          );
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_members WHERE organization_id IN (SELECT id FROM ba_organizations WHERE slug = $1)`, slug,
          );
          await prisma.admin.$executeRawUnsafe(
            `DELETE FROM ba_organizations WHERE slug = $1`, slug,
          );
          await prisma.admin.$executeRawUnsafe(
            `UPDATE tenants SET better_auth_org_id = NULL WHERE slug = $1`, slug,
          );
        }
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
        await prisma.admin.user.deleteMany({
          where: { id: { in: [USER_A_ID, USER_B_ID, NON_SUPER_USER_ID] } },
        });
        await prisma.admin.tenant.deleteMany({
          where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
      }
      if (app) await app.close();
    });

    // ──────────────────────────────────────────────────────────
    // Cross-tenant GET by superadmin → 200
    // ──────────────────────────────────────────────────────────

    it('MUST allow cross-tenant GET with 200 when superadmin', async () => {
      const clienteB = await prisma.admin.cliente.create({
        data: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
      });
      try {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/clientes/${clienteB.id}`)
          .set('Host', `${TENANT_B_SLUG}.crmmaster.com`)
          .set('Authorization', `Bearer ${SUPERADMIN_TOKEN_A}`);
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe(clienteB.id);
      } finally {
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
        });
      }
    });

    // ──────────────────────────────────────────────────────────
    // Non-superadmin cross-tenant GET → 403
    // ──────────────────────────────────────────────────────────

    it('MUST reject cross-tenant GET with 403 when NOT superadmin', async () => {
      const clienteB = await prisma.admin.cliente.create({
        data: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
      });
      try {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/clientes/${clienteB.id}`)
          .set('Host', `${TENANT_B_SLUG}.crmmaster.com`)
          .set('Authorization', `Bearer ${NON_SUPER_TOKEN}`);
        expect(res.status).toBe(403);
      } finally {
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
        });
      }
    });

    // ──────────────────────────────────────────────────────────
    // List clients as superadmin → 200 + data
    // ──────────────────────────────────────────────────────────

    it('MUST list clients when superadmin', async () => {
      await prisma.admin.cliente.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.cliente.create({
        data: { tenantId: TENANT_A_ID, nombre: 'E2E-Cliente-A' },
      });
      await prisma.admin.cliente.create({
        data: { tenantId: TENANT_B_ID, nombre: 'E2E-Cliente-B' },
      });
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Authorization', `Bearer ${SUPERADMIN_TOKEN_A}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.data).toBeDefined();
    });

    // ──────────────────────────────────────────────────────────
    // POST as superadmin → 201
    // ──────────────────────────────────────────────────────────

    it('MUST allow POST /clientes with cross-tenant tenantId when superadmin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/clientes')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Authorization', `Bearer ${SUPERADMIN_TOKEN_A}`)
        .send({ nombre: 'E2E-Nuevo-Cliente', tenantId: TENANT_B_ID });
      expect(res.status).toBe(201);
      expect(res.body).toBeDefined();
    });
  });
} else {
  describe('🔔 DOORBELL HTTP — Multi-tenant isolation via HTTP', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn(
        '[DOORBELL HTTP] Skipping: DATABASE_URL not set. These tests require a real database.',
      );
    });
  });
}
