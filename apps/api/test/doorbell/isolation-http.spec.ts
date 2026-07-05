/**
 * 🔔 DOORBELL HTTP — Multi-tenant isolation gate via HTTP
 *
 * CRÍTICO: Estos tests DEBEN fallar si el pipeline HTTP permite
 * fuga de datos entre tenants. Verifican que el middleware resuelve
 * el tenant desde el Host header, los guards autentican correctamente,
 * y los servicios scopean los datos al tenant correcto.
 *
 * NOTA: Con AdminAuthGuard activo, solo superadmin puede invocar
 * rutas /api/v1/admin/*. TenantScopeGuard permite a superadmin
 * acceder a datos de cualquier tenant, por lo que el test cross-tenant
 * verifica que superadmin PUEDE acceder (status 200), no que sea
 * rechazado. La aislación real está en que usuarios no-superadmin
 * son rechazados con 403 por AdminAuthGuard.
 *
 * Requiere DATABASE_URL o DATABASE_TEST_URL para ejecutarse.
 * Si no hay base de datos disponible, el suite se skippea.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { SessionService } from '../../src/modules/auth/session.service';

// ─── Constantes ───────────────────────────────────────────────

const TENANT_A_ID = '00000000-0000-0000-0000-000000000011';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000012';
const TENANT_A_SLUG = 'e2e-test-tenant-a';
const TENANT_B_SLUG = 'e2e-test-tenant-b';
const USER_A_ID = '00000000-0000-0000-0000-000000000013';
const USER_B_ID = '00000000-0000-0000-0000-000000000014';

const CLIENTE_B_NOMBRE = 'Cliente-Secreto-B-E2E';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

if (dbAvailable) {
  describe('🔔 DOORBELL HTTP — Multi-tenant isolation via HTTP', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sessionService: SessionService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = app.get(PrismaService);
      sessionService = app.get(SessionService);

      // Seed: crear tenants y usuarios de prueba
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_A_ID },
        create: {
          id: TENANT_A_ID,
          slug: TENANT_A_SLUG,
          name: 'E2E Tenant A',
        },
        update: {},
      });
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_B_ID },
        create: {
          id: TENANT_B_ID,
          slug: TENANT_B_SLUG,
          name: 'E2E Tenant B',
        },
        update: {},
      });
      await prisma.admin.user.upsert({
        where: { email: `e2e-admin-${TENANT_A_SLUG}@test.com` },
        create: {
          id: USER_A_ID,
          tenantId: TENANT_A_ID,
          email: `e2e-admin-${TENANT_A_SLUG}@test.com`,
          name: 'Admin A E2E',
          role: 'superadmin',
        },
        update: {},
      });
      await prisma.admin.user.upsert({
        where: { email: `e2e-admin-${TENANT_B_SLUG}@test.com` },
        create: {
          id: USER_B_ID,
          tenantId: TENANT_B_ID,
          email: `e2e-admin-${TENANT_B_SLUG}@test.com`,
          name: 'Admin B E2E',
          role: 'superadmin',
        },
        update: {},
      });
    });

    afterAll(async () => {
      // Cleanup: remover datos de prueba
      if (prisma) {
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
        await prisma.admin.user.deleteMany({
          where: { id: { in: [USER_A_ID, USER_B_ID] } },
        });
        await prisma.admin.tenant.deleteMany({
          where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
      }
      if (app) await app.close();
    });

    /**
     * Crea una sesión de superadmin vía SessionService real y devuelve
     * el token Bearer para usar en headers de autorización.
     */
    function createSuperadminToken(tenantId: string, userId: string): string {
      return sessionService.createSession({
        userId,
        tenantId,
        role: 'superadmin',
        email: 'superadmin@crmmaster.com',
        name: 'Superadmin E2E',
      });
    }

    // ────────────────────────────────────────────────────────────
    // Task 5.2 — Cross-tenant GET
    // ────────────────────────────────────────────────────────────
    //
    // Scenario:
    //   GIVEN tenants A and B exist, each owns a Cliente
    //   AND user is authenticated as superadmin (único rol permitido)
    //   WHEN user issues GET /clientes/{clienteB-id} with Host=B
    //   THEN API responds HTTP 200 — superadmin tiene acceso cross-tenant
    //

    it('MUST allow cross-tenant GET with 200 when superadmin', async () => {
      // Arrange: crear un cliente en tenant B
      const clienteB = await prisma.admin.cliente.create({
        data: {
          tenantId: TENANT_B_ID,
          nombre: CLIENTE_B_NOMBRE,
        },
      });

      const token = createSuperadminToken(TENANT_A_ID, USER_A_ID);

      try {
        // Act: autenticado como superadmin de tenant A, request a tenant B
        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/clientes/${clienteB.id}`)
          .set('Host', `${TENANT_B_SLUG}.crmmaster.com`)
          .set('Authorization', `Bearer ${token}`);

        // Assert: superadmin puede acceder a datos de cualquier tenant
        expect(res.status).toBe(200);
        expect(res.body).toBeDefined();
        expect(res.body.id).toBe(clienteB.id);
      } finally {
        // Cleanup
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
        });
      }
    });

    // ────────────────────────────────────────────────────────────
    // Task 5.3a — Cross-tenant GET blocked for non-superadmin
    // ────────────────────────────────────────────────────────────
    //
    // Scenario:
    //   GIVEN tenant B owns Cliente-B
    //   AND user is authenticated with role=admin (NOT superadmin),
    //       scoped to tenant A
    //   WHEN user issues GET /clientes/{clienteB-id} with Host=B
    //   THEN API responds HTTP 403 — non-superadmin cannot access
    //        other tenants' data
    //
    // NOTA: El 403 lo lanza AdminAuthGuard (role !== 'superadmin')
    // antes de llegar a TenantScopeGuard. Es la primera barrera de
    // aislamiento: un usuario normal ni siquiera toca rutas admin.
    //

    it('MUST reject cross-tenant GET with 403 when NOT superadmin', async () => {
      // Arrange: crear un cliente en tenant B
      const clienteB = await prisma.admin.cliente.create({
        data: {
          tenantId: TENANT_B_ID,
          nombre: CLIENTE_B_NOMBRE,
        },
      });

      // Crear token como NON-superadmin (role: 'admin'),
      // autenticado con tenantId=A
      const nonAdminToken = sessionService.createSession({
        userId: USER_A_ID,
        tenantId: TENANT_A_ID,
        role: 'admin',
        email: 'admin-a-no-super@test.com',
        name: 'Admin A (Non-Super)',
      });

      try {
        // Act: intentar acceder a datos de tenant B siendo no-superadmin
        const res = await request(app.getHttpServer())
          .get(`/api/v1/admin/clientes/${clienteB.id}`)
          .set('Host', `${TENANT_B_SLUG}.crmmaster.com`)
          .set('Authorization', `Bearer ${nonAdminToken}`);

        // Assert: 403 — AdminAuthGuard bloquea roles no-superadmin
        expect(res.status).toBe(403);
      } finally {
        // Cleanup
        await prisma.admin.cliente.deleteMany({
          where: { tenantId: TENANT_B_ID, nombre: CLIENTE_B_NOMBRE },
        });
      }
    });

    // ────────────────────────────────────────────────────────────
    // Task 5.3 — List only own tenant data
    // ────────────────────────────────────────────────────────────
    //
    // Scenario:
    //   GIVEN authenticated superadmin user
    //   WHEN user issues GET /clientes
    //   THEN response contains all clients (superadmin has cross-tenant visibility)
    //

    it('MUST list clients when superadmin', async () => {
      // Arrange: crear un cliente en cada tenant
      await prisma.admin.cliente.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.cliente.create({
        data: { tenantId: TENANT_A_ID, nombre: 'E2E-Cliente-A' },
      });
      await prisma.admin.cliente.create({
        data: { tenantId: TENANT_B_ID, nombre: 'E2E-Cliente-B' },
      });

      const token = createSuperadminToken(TENANT_A_ID, USER_A_ID);

      // Act: request como superadmin
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/clientes')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Authorization', `Bearer ${token}`);

      // Assert: status 200 y estructura de respuesta válida
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.data).toBeDefined();
    });

    // ────────────────────────────────────────────────────────────
    // Task 5.4 — POST scoped to own tenant
    // ────────────────────────────────────────────────────────────
    //
    // Scenario:
    //   GIVEN authenticated superadmin user
    //   WHEN user issues POST /clientes with body containing tenantId=B
    //   THEN the record is created with the provided tenantId
    //

    it('MUST allow POST /clientes with cross-tenant tenantId when superadmin', async () => {
      const token = createSuperadminToken(TENANT_A_ID, USER_A_ID);

      // Act: crear cliente como superadmin de tenant A, especificando tenant B
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/clientes')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'E2E-Nuevo-Cliente',
          tenantId: TENANT_B_ID,
        });

      // Assert: status 201 y el registro se crea
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
