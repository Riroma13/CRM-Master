/**
 * E2E test: Auth login flow via AuthController.
 *
 * Verifies that the login endpoint returns valid tokens for
 * correct credentials and rejects invalid ones.
 *
 * NOTE: The login endpoint generates session tokens stored in
 * ba_sessions (Better-Auth sessions table). These tokens can be
 * validated by BetterAuthGuard for subsequent requests.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_SLUG = 'e2e-auth-login-tenant';
const TENANT_ID = 'f0000000-0000-4000-8000-000000000001';
const USER_ID = 'f0000000-0000-4000-8000-000000000002';
const TENANT_ADMIN_ID = 'f0000000-0000-4000-8000-000000000003';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

if (dbAvailable) {
  describe('POST /api/v1/auth/login (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      process.env.BETTER_AUTH_URL = 'http://localhost:3000';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = moduleFixture.get(PrismaService);

      // Clean & seed test data
      await prisma.admin.user.deleteMany({ where: { id: USER_ID } });
      await prisma.admin.tenant.deleteMany({ where: { id: TENANT_ID } });

      await prisma.admin.tenant.upsert({
        where: { id: TENANT_ID },
        create: {
          id: TENANT_ID,
          slug: TENANT_SLUG,
          name: 'E2E Auth Login Tenant',
          isActive: true,
        },
        update: {},
      });

      await prisma.admin.user.upsert({
        where: { email: 'e2e-auth-login@test.com' },
        create: {
          id: USER_ID,
          tenantId: TENANT_ID,
          email: 'e2e-auth-login@test.com',
          name: 'E2E Auth User',
          role: 'superadmin',
          isActive: true,
        },
        update: {},
      });

      // Seed a tenant-admin user for role-specific login tests
      await prisma.admin.user.upsert({
        where: { email: 'e2e-tenant-admin@test.com' },
        create: {
          id: TENANT_ADMIN_ID,
          tenantId: TENANT_ID,
          email: 'e2e-tenant-admin@test.com',
          name: 'E2E Tenant Admin',
          role: 'admin',
          isActive: true,
        },
        update: {},
      });
    });

    afterAll(async () => {
      if (prisma) {
        await prisma.admin.user.deleteMany({
          where: { id: { in: [USER_ID, TENANT_ADMIN_ID] } },
        });
        await prisma.admin.tenant.deleteMany({ where: { id: TENANT_ID } });
      }
      if (app) await app.close();
    });

    it('MUST return 200 + token for valid superadmin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ email: 'e2e-auth-login@test.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('session');
      expect(res.body.session).toHaveProperty('token');
      expect(typeof res.body.session.token).toBe('string');
      expect(res.body.session.token).toMatch(/^sess_/);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('e2e-auth-login@test.com');
      expect(res.body.user.role).toBe('superadmin');
      expect(res.body).toHaveProperty('tenant');
      expect(res.body.tenant.slug).toBe(TENANT_SLUG);
    });

    it('MUST return 401 for invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ email: 'e2e-auth-login@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('statusCode', 401);
    });

    it('MUST return 401 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ email: 'nonexistent@test.com', password: 'password' });

      expect(res.status).toBe(401);
    });

    it('MUST return 404 for non-existent tenant slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', 'nonexistent.crmmaster.com')
        .send({ email: 'e2e-auth-login@test.com', password: 'password' });

      expect(res.status).toBe(404);
    });

    it('MUST return 200 + token for valid tenant-admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ email: 'e2e-tenant-admin@test.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('session');
      expect(res.body.session).toHaveProperty('token');
      expect(typeof res.body.session.token).toBe('string');
      expect(res.body.session.token).toMatch(/^sess_/);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('e2e-tenant-admin@test.com');
      expect(res.body.user.role).toBe('admin');
      expect(res.body).toHaveProperty('tenant');
      expect(res.body.tenant.slug).toBe(TENANT_SLUG);
    });

    it('MUST return 401 for tenant-admin from wrong tenant', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Host', 'other-tenant.crmmaster.com')
        .send({ email: 'e2e-tenant-admin@test.com', password: 'password' });

      expect(res.status).toBe(404);
    });
  });
} else {
  describe('POST /api/v1/auth/login (E2E)', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn('[AUTH LOGIN] Skipping: DATABASE_URL not set.');
    });
  });
}
