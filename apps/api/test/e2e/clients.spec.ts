import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, NestModule, MiddlewareConsumer, Injectable, NestMiddleware } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import { ClientsModule } from '../../src/modules/clients/clients.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { PrismaService } from '../../src/common/prisma.service';
import { BetterAuthGuard } from '../../src/common/guards/better-auth.guard';
import { Request, Response, NextFunction } from 'express';

@Injectable()
class MockTenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const url = req.url || req.originalUrl || '';
    if (url.includes('/api/v1/admin')) {
      (req as any).isAdminRequest = true;
    }
    next();
  }
}

@Module({
  imports: [DashboardModule, ClientsModule, AuthModule],
  providers: [
    MockTenantMiddleware,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
  ],
})
class ClientsE2ETestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

describe('GET /api/v1/admin/clientes (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const TENANT_A_ID = 'd4000000-0000-4000-8000-000000000001';
  const TENANT_B_ID = 'd4000000-0000-4000-8000-000000000002';
  const ALL_TENANT_IDS = [TENANT_A_ID, TENANT_B_ID];

  const CLIENT_IDS = {
    garza: 'd4c00001-0000-4000-8000-000000000001',
    garciaC: 'd4c00002-0000-4000-8000-000000000001',
    lopez: 'd4c00003-0000-4000-8000-000000000001',
    perez: 'd4c00004-0000-4000-8000-000000000001',
    martinez: 'd4c00005-0000-4000-8000-000000000001',
    fernandez: 'd4c00006-0000-4000-8000-000000000001',
  };

  let superadminToken: string;
  let tenantAdminToken: string;

  async function createBaSession(baUserId: string, token: string): Promise<void> {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
      crypto.randomUUID(), baUserId, token, futureDate.toISOString(),
    );
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientsE2ETestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    // Clean only test-specific data
    const ALL_CLIENT_IDS = Object.values(CLIENT_IDS);
    await prisma.admin.tarea.deleteMany({});
    await prisma.admin.cliente.deleteMany({
      where: { id: { in: ALL_CLIENT_IDS } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: ALL_TENANT_IDS } },
    });

    // Seed tenants
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: 'e2e-clients-a', name: 'E2E Clients A', isActive: true },
        { id: TENANT_B_ID, slug: 'e2e-clients-b', name: 'E2E Clients B', isActive: true },
      ],
    });

    // Seed 6 clients across tenants
    await prisma.admin.cliente.createMany({
      data: [
        { id: CLIENT_IDS.garza, tenantId: TENANT_A_ID, nombre: 'Garza y Asociados', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal', 'VPS'] },
        { id: CLIENT_IDS.garciaC, tenantId: TENANT_B_ID, nombre: 'Garcia Consulting', saludGeneral: '🟡', estadoRelacion: 'Activo', tags: ['contable'] },
        { id: CLIENT_IDS.lopez, tenantId: TENANT_A_ID, nombre: 'Lopez Asociados', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal'] },
        { id: CLIENT_IDS.perez, tenantId: TENANT_A_ID, nombre: 'Perez Tech', saludGeneral: '🔴', estadoRelacion: 'Activo', tags: ['critico'] },
        { id: CLIENT_IDS.martinez, tenantId: TENANT_B_ID, nombre: 'Martinez SA', saludGeneral: '🟡', estadoRelacion: 'En pausa', tags: ['contable', 'factura'] },
        { id: CLIENT_IDS.fernandez, tenantId: TENANT_A_ID, nombre: 'Fernandez Global', saludGeneral: '🟢', estadoRelacion: 'Cerrado', tags: ['fiscal'] },
      ],
    });

    // Seed Better-Auth data for superadmin
    const superBaUserId = crypto.randomUUID();
    const adminBaUserId = crypto.randomUUID();

    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      superBaUserId, 'e2e-client-super@test.com', true, 'Super Admin',
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      adminBaUserId, 'e2e-client-admin@test.com', true, 'Tenant Admin',
    );

    // Create legacy users with betterAuthUserId linking
    await prisma.admin.user.upsert({
      where: { email: 'e2e-client-super@test.com' },
      create: {
        id: 'e2e-client-super-uuid',
        tenantId: TENANT_A_ID,
        email: 'e2e-client-super@test.com',
        name: 'Super Admin',
        role: 'superadmin',
        betterAuthUserId: superBaUserId,
      },
      update: {},
    });
    await prisma.admin.user.upsert({
      where: { email: 'e2e-client-admin@test.com' },
      create: {
        id: 'e2e-client-admin-uuid',
        tenantId: TENANT_A_ID,
        email: 'e2e-client-admin@test.com',
        name: 'Tenant Admin',
        role: 'admin',
        betterAuthUserId: adminBaUserId,
      },
      update: {},
    });

    // Create sessions in ba_sessions
    superadminToken = 'sess_e2e_clients_super_token';
    tenantAdminToken = 'sess_e2e_clients_admin_token';
    await createBaSession(superBaUserId, superadminToken);
    await createBaSession(adminBaUserId, tenantAdminToken);
  });

  afterAll(async () => {
    if (prisma) {
      // Cleanup ba data
      for (const email of ['e2e-client-super@test.com', 'e2e-client-admin@test.com']) {
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_sessions WHERE user_id IN (SELECT id FROM ba_users WHERE email = $1)`, email,
        );
        await prisma.admin.$executeRawUnsafe(
          `DELETE FROM ba_users WHERE email = $1`, email,
        );
        await prisma.admin.$executeRawUnsafe(
          `UPDATE users SET better_auth_user_id = NULL WHERE email = $1`, email,
        );
      }
      await prisma.admin.user.deleteMany({
        where: { id: { in: ['e2e-client-super-uuid', 'e2e-client-admin-uuid'] } },
      });
      const ALL_CLIENT_IDS = Object.values(CLIENT_IDS);
      await prisma.admin.tarea.deleteMany({});
      await prisma.admin.cliente.deleteMany({
        where: { id: { in: ALL_CLIENT_IDS } },
      });
      await prisma.admin.tenant.deleteMany({
        where: { id: { in: ALL_TENANT_IDS } },
      });
    }
    if (app) await app.close();
  });

  // ─── Basic superadmin access ────────────────────────────────

  describe('superadmin access', () => {
    it('GET /api/v1/admin/clientes with superadmin → 200 + pagination structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data.length).toBe(6);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 6,
        totalPages: 1,
      });
    });

    it('should return clients from all tenants (cross-tenant)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      const tenantSlugs = response.body.data.map((c: any) => c.tenant.slug);
      expect(tenantSlugs).toContain('e2e-clients-a');
      expect(tenantSlugs).toContain('e2e-clients-b');
    });
  });

  // ─── Pagination ─────────────────────────────────────────────

  describe('pagination', () => {
    it('should respect limit and page params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?limit=2&page=1')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(6);
    });

    it('should navigate to page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?limit=4&page=2')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  // ─── Search ─────────────────────────────────────────────────

  describe('search filter', () => {
    it('should filter by case-insensitive partial name match', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?search=gar')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      const names = response.body.data.map((c: any) => c.nombre);
      expect(names).toContain('Garza y Asociados');
      expect(names).toContain('Garcia Consulting');
    });

    it('should return empty data when no match', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?search=zzz')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  // ─── Salud filter ───────────────────────────────────────────

  describe('salud filter', () => {
    it('should filter by 🟢 saludGeneral', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?salud=%F0%9F%9F%A2')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(3);
      response.body.data.forEach((c: any) => {
        expect(c.saludGeneral).toBe('🟢');
      });
    });

    it('should filter by 🔴 saludGeneral', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?salud=%F0%9F%94%B4')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].saludGeneral).toBe('🔴');
    });
  });

  // ─── Tag filter ─────────────────────────────────────────────

  describe('tag filter', () => {
    it('should filter clients by tag', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?tag=fiscal')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(3);
      response.body.data.forEach((c: any) => {
        expect(c.tags).toContain('fiscal');
      });
    });
  });

  // ─── Filter composition ─────────────────────────────────────

  describe('filter composition', () => {
    it('should AND-combine search + salud + tag', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes?search=gar&salud=%F0%9F%9F%A2&tag=fiscal')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      // Garza y Asociados: 🟢, fiscal — matches
      // Garcia Consulting: 🟡 — ruled out by salud filter
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].nombre).toBe('Garza y Asociados');
    });
  });

  // ─── tenantId injection ────────────────────────────────────

  describe('tenantId injection ignored', () => {
    it('should ignore tenantId query param and return all tenants', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/clientes?tenantId=${TENANT_A_ID}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      // Should still return all 6 clients, not just those in TENANT_A
      expect(response.body.pagination.total).toBe(6);
      const tenantSlugs = response.body.data.map((c: any) => c.tenant.slug);
      expect(tenantSlugs).toContain('e2e-clients-a');
      expect(tenantSlugs).toContain('e2e-clients-b');
    });
  });

  // ─── Auth enforcement ───────────────────────────────────────

  describe('auth enforcement', () => {
    it('GET /api/v1/admin/clientes with tenant-admin → 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body.message).toMatch(/superadmin/i);
      expect(response.body).not.toHaveProperty('data');
    });

    it('GET /api/v1/admin/clientes without token → 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toMatch(/token|autenticación/i);
      expect(response.body).not.toHaveProperty('data');
    });
  });
});
