/**
 * E2E test: Client self-registration → login flow.
 *
 * Verifies that a new client can register and then immediately log in
 * with the same credentials (auto-activate).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_SLUG = 'e2e-register-tenant';
const TENANT_ID = 'e0000000-0000-4000-8000-000000000001';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

if (dbAvailable) {
  describe('POST /api/v1/client/auth/register (E2E)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = moduleFixture.get(PrismaService);

      // Ensure test tenant exists
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_ID },
        create: {
          id: TENANT_ID,
          slug: TENANT_SLUG,
          name: 'E2E Register Tenant',
          isActive: true,
        },
        update: {},
      });
    });

    afterAll(async () => {
      // Clean up test data
      if (prisma) {
        await prisma.admin.clientUser.deleteMany({
          where: { tenantId: TENANT_ID },
        });
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: TENANT_ID },
        });
        await prisma.admin.tenant.deleteMany({ where: { id: TENANT_ID } });
      }
      if (app) await app.close();
    });

    it('POST /api/v1/client/auth/register — 201 + creates Cliente + ClientUser', async () => {
      const email = `e2e-register-${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({
          nombre: 'E2E Test User',
          email,
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('clientUser');
      expect(res.body.clientUser).toHaveProperty('id');
      expect(res.body.clientUser.email).toBe(email);
      expect(res.body.clientUser.nombre).toBe('E2E Test User');
      // Should NOT return passwordHash or telefono
      expect(res.body.clientUser).not.toHaveProperty('passwordHash');
      expect(res.body.clientUser).not.toHaveProperty('telefono');
    });

    it('POST /api/v1/client/auth/register — auto-activated user can login', async () => {
      const email = `e2e-login-after-register-${Date.now()}@test.com`;
      // Register
      await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({
          nombre: 'Login Test',
          email,
          password: 'password123',
        })
        .expect(201);

      // Login with same credentials
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/client/auth/login')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ email, password: 'password123' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('clientUser');
      expect(loginRes.body.clientUser.email).toBe(email);
      // Should get a cookie
      expect(loginRes.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/v1/client/auth/register — 409 duplicate email (same tenant)', async () => {
      const email = `e2e-dup-same-${Date.now()}@test.com`;
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ nombre: 'First', email, password: 'password123' })
        .expect(201);

      // Duplicate
      const res = await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({ nombre: 'Duplicate', email, password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('POST /api/v1/client/auth/register — 403 when tenantId missing', async () => {
      const email = `e2e-no-tenant-${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        // No Host header → no tenant resolution
        .send({ nombre: 'No Tenant', email, password: 'password123' });

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/client/auth/register — 400 for weak password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/client/auth/register')
        .set('Host', `${TENANT_SLUG}.crmmaster.com`)
        .send({
          nombre: 'Weak Password',
          email: `e2e-weak-${Date.now()}@test.com`,
          password: 'short',
        });

      expect(res.status).toBe(400);
    });
  });
} else {
  describe('POST /api/v1/client/auth/register (E2E)', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn('[REGISTER] Skipping E2E: DATABASE_URL not set.');
    });
  });
}
