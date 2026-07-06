import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module, NestModule, MiddlewareConsumer, Injectable, NestMiddleware } from '@nestjs/common';
import * as request from 'supertest';
import { DashboardModule } from '../../src/modules/dashboard/dashboard.module';
import { ClientsModule } from '../../src/modules/clients/clients.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { PrismaService } from '../../src/common/prisma.service';
import { SessionService } from '../../src/modules/auth/session.service';
import { Request, Response, NextFunction } from 'express';

/**
 * Mock middleware that simulates TenantResolveMiddleware behavior for admin routes.
 * Sets isAdminRequest=true so TenantScopeGuard allows the request through.
 */
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
  providers: [MockTenantMiddleware],
})
class DashboardE2ETestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

describe('GET /api/v1/admin/dashboard (E2E)', () => {
  let app: INestApplication;
  let sessionService: SessionService;
  let prisma: PrismaService;

  const TENANT_A_ID = 'd3000000-0000-4000-8000-000000000001';
  const TENANT_B_ID = 'd3000000-0000-4000-8000-000000000002';
  const ALL_TENANT_IDS = [TENANT_A_ID, TENANT_B_ID];

  const CLIENT_IDS = [
    'd3c00001-0000-4000-8000-000000000001',
    'd3c00002-0000-4000-8000-000000000001',
    'd3c00003-0000-4000-8000-000000000001',
    'd3c00004-0000-4000-8000-000000000001',
  ];

  const TAREA_IDS = [
    'd3t00001-0000-4000-8000-000000000001',
    'd3t00002-0000-4000-8000-000000000001',
    'd3t00003-0000-4000-8000-000000000001',
    'd3t00004-0000-4000-8000-000000000001',
  ];

  let superadminToken: string;
  let tenantAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DashboardE2ETestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    sessionService = moduleFixture.get(SessionService);
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    // Create sessions
    superadminToken = sessionService.createSession({
      userId: 'e2e-dash-super',
      email: 'super@admin.com',
      name: 'Super Admin',
      tenantId: 'e2e-tenant',
      role: 'superadmin',
    });

    tenantAdminToken = sessionService.createSession({
      userId: 'e2e-dash-admin',
      email: 'admin@tenant.com',
      name: 'Tenant Admin',
      tenantId: TENANT_A_ID,
      role: 'admin',
    });

    // Clean all known E2E test tenant data — safe in test DB, no production risk.
    // This is required because parallel test suites (doorbell) create tenants
    // that would skew aggregate counts in dashboard metrics.
    await prisma.admin.tarea.deleteMany({});
    await prisma.admin.cliente.deleteMany({});
    await prisma.admin.tenant.deleteMany({});

    // Seed data: tenants, clients, tareas
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: 'e2e-dash-a', name: 'E2E Dashboard A', isActive: true },
        { id: TENANT_B_ID, slug: 'e2e-dash-b', name: 'E2E Dashboard B', isActive: true },
      ],
    });

    await prisma.admin.cliente.createMany({
      data: [
        { id: CLIENT_IDS[0], tenantId: TENANT_A_ID, nombre: 'Dash Client A1', saludGeneral: '🟢', estadoRelacion: 'Activo' },
        { id: CLIENT_IDS[1], tenantId: TENANT_A_ID, nombre: 'Dash Client A2', saludGeneral: '🟡', estadoRelacion: 'Activo' },
        { id: CLIENT_IDS[2], tenantId: TENANT_A_ID, nombre: 'Dash Client A3', saludGeneral: '🔴', estadoRelacion: 'Activo' },
        { id: CLIENT_IDS[3], tenantId: TENANT_B_ID, nombre: 'Dash Client B1', saludGeneral: '🟢', estadoRelacion: 'Activo' },
      ],
    });

    await prisma.admin.tarea.createMany({
      data: [
        { id: TAREA_IDS[0], tenantId: TENANT_A_ID, clienteId: CLIENT_IDS[0], titulo: 'Tarea Pendiente 1', estado: 'Pendiente' },
        { id: TAREA_IDS[1], tenantId: TENANT_A_ID, clienteId: CLIENT_IDS[1], titulo: 'Tarea Pendiente 2', estado: 'Pendiente' },
        { id: TAREA_IDS[2], tenantId: TENANT_B_ID, clienteId: CLIENT_IDS[3], titulo: 'Tarea Hecha', estado: 'Hecho' },
        { id: TAREA_IDS[3], tenantId: TENANT_B_ID, clienteId: CLIENT_IDS[3], titulo: 'Tarea Pendiente 3', estado: 'Pendiente' },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.admin.tarea.deleteMany({
        where: { id: { in: TAREA_IDS } },
      });
      await prisma.admin.cliente.deleteMany({
        where: { id: { in: CLIENT_IDS } },
      });
      await prisma.admin.tenant.deleteMany({
        where: { id: { in: ALL_TENANT_IDS } },
      });
    }
    if (app) await app.close();
  });

  it('GET /api/v1/admin/dashboard with superadmin token → 200 + correct metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('metrics');
    expect(response.body).toHaveProperty('ultimaActualizacion');
    expect(response.body.metrics).toEqual({
      totalClientes: 4,
      activos: 4,
      conIncidencias: 1, // 🟡
      criticos: 1,       // 🔴
      tareasPendientesGlobales: 3, // non-Hecho tareas
      tenantsActivos: 2,
    });
  });

  it('GET /api/v1/admin/dashboard without token → 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body.message).toMatch(/token|autenticación/i);
  });

  it('GET /api/v1/admin/dashboard with tenant-admin token → 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(403);

    expect(response.body).toHaveProperty('statusCode', 403);
    expect(response.body.message).toMatch(/superadmin/i);
    // Ensure no data leaked in response body
    expect(response.body).not.toHaveProperty('metrics');
  });
});
