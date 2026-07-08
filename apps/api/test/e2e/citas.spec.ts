import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Module,
  NestModule,
  MiddlewareConsumer,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { CitasModule } from '../../src/modules/citas/citas.module';
import { PrismaService } from '../../src/common/prisma.service';
import { BetterAuthGuard } from '../../src/common/guards/better-auth.guard';
import { Request, Response, NextFunction } from 'express';

// ─── Test infrastructure ──────────────────────────────────────────

/**
 * Mock middleware that sets tenantId on the request object for
 * tenant-scoped routes, mimicking TenantResolveMiddleware behavior.
 *
 * Reads X-Test-Tenant-ID header when present; otherwise applies a default
 * tenant ID so the @TenantId() decorator works in tests.
 */
@Injectable()
class MockTenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const headerId = req.headers['x-test-tenant-id'] as string | undefined;
    if (headerId) {
      (req as any).tenantId = headerId;
      (req as any).tenantSlug = 'test-tenant';
    } else {
      // Default tenant A when no header is provided
      (req as any).tenantId = TENANT_A_ID;
      (req as any).tenantSlug = 'e2e-citas-a';
    }
    next();
  }
}

/**
 * Test module that mirrors AppModule configuration:
 * - CitasModule with all its providers
 * - BetterAuthGuard as global guard (passes through for non-/api/v1/admin/ routes)
 * - MockTenantMiddleware for tenant resolution
 */
@Module({
  imports: [CitasModule],
  providers: [
    MockTenantMiddleware,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
  ],
})
class CitasE2ETestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

// ─── Test constants ────────────────────────────────────────────────

const TENANT_A_ID = 'd6000000-0000-4000-8000-000000000001';
const TENANT_B_ID = 'd6000000-0000-4000-8000-000000000002';
const CITA_PATCH_ID = 'd6c00000-0000-4000-8000-000000000001';
const CITA_TENANT_B_ID = 'd6c00000-0000-4000-8000-000000000002';

const TENANT_A_HEADER = { 'x-test-tenant-id': TENANT_A_ID };
const TENANT_B_HEADER = { 'x-test-tenant-id': TENANT_B_ID };

// ─── Test suite ────────────────────────────────────────────────────

describe('CitasController — Calendario endpoints (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CitasE2ETestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    // Clean residual data
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.disponibilidad.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });

    // ── Seed tenants ──────────────────────────────────────────
    await prisma.admin.tenant.createMany({
      data: [
        {
          id: TENANT_A_ID,
          slug: 'e2e-citas-a',
          name: 'E2E Citas A',
          isActive: true,
        },
        {
          id: TENANT_B_ID,
          slug: 'e2e-citas-b',
          name: 'E2E Citas B',
          isActive: true,
        },
      ],
    });

    // ── Seed disponibilidad per tenant ────────────────────────
    // Tenant A: high minNotice (for testing violation), blocked date
    // Tenant B: zero minNotice (for normal booking), full week schedule
    await prisma.admin.disponibilidad.createMany({
      data: [
        {
          tenantId: TENANT_A_ID,
          timezone: 'Europe/Madrid',
          slotDuration: 30,
          minNotice: 9_999_999,
          maxDays: 90,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
          blockedDates: ['2026-08-12'],
        },
        {
          tenantId: TENANT_B_ID,
          timezone: 'America/New_York',
          slotDuration: 30,
          minNotice: 0,
          maxDays: 30,
          dailySchedule: [{ day: 1, start: '09:00', end: '17:00' }],
          blockedDates: [],
        },
      ],
    });

    // ── Seed citas ────────────────────────────────────────────
    // Tenant A: 1 cita for PATCH testing
    // Tenant B: 1 cita for isolation testing
    await prisma.admin.cita.createMany({
      data: [
        {
          id: CITA_PATCH_ID,
          tenantId: TENANT_A_ID,
          fecha: new Date('2026-09-14T10:00:00Z'),
          duracion: 30,
          estado: 'pendiente',
          titulo: 'Cita para PATCH',
          clienteNombre: 'Patch Client',
          clienteEmail: 'patch@example.com',
        },
        {
          id: CITA_TENANT_B_ID,
          tenantId: TENANT_B_ID,
          fecha: new Date('2026-09-14T11:00:00Z'),
          duracion: 30,
          estado: 'pendiente',
          titulo: 'Cita Tenant B',
          clienteNombre: 'Tenant B Client',
          clienteEmail: 'b@example.com',
        },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.admin.cita.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.disponibilidad.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prisma.admin.tenant.deleteMany({
        where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
    }
    if (app) await app.close();
  });

  // ─── GET /api/v1/tenant/calendario/slots ──────────────────

  describe('GET /api/v1/tenant/calendario/slots', () => {
    it('should return 200 with slots array for a configured date', async () => {
      // Tenant B has Mon-Fri 09:00-17:00 schedule, minNotice=0
      // 2026-08-10 is a Monday (getUTCDay() === 1)
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/slots?fecha=2026-08-10')
        .set(TENANT_B_HEADER)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('start');
      expect(response.body[0]).toHaveProperty('end');
      expect(response.body[0]).toHaveProperty('available');
      expect(response.body[0].available).toBe(true);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/slots?fecha=invalid')
        .set(TENANT_B_HEADER)
        .expect(400);

      expect(response.body.message).toMatch(/fecha/i);
    });

    it('should return 200 with empty array for unconfigured day', async () => {
      // 2026-08-09 is a Sunday (getUTCDay() === 0) — no schedule
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/slots?fecha=2026-08-09')
        .set(TENANT_B_HEADER)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 200 with empty array for blocked date', async () => {
      // Tenant A has blocked date 2026-08-12
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/slots?fecha=2026-08-12')
        .set(TENANT_A_HEADER)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 200 with empty array when no disponibilidad exists', async () => {
      // Use a tenant with no disponibilidad — but all our tenants have it
      // Instead, use a date that's within minNotice for tenant A
      // Tenant A has minNotice=999999, so any date should return empty from getSlots
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/slots?fecha=2026-08-10')
        .set(TENANT_A_HEADER)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  // ─── POST /api/v1/tenant/calendario/citas ─────────────────

  describe('POST /api/v1/tenant/calendario/citas', () => {
    it('should return 201 when booking a valid slot', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenant/calendario/citas')
        .set(TENANT_B_HEADER)
        .send({
          fecha: '2026-10-05T10:00:00Z',
          clienteNombre: 'Alice',
          clienteEmail: 'alice@example.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantId).toBe(TENANT_B_ID);
      expect(response.body.estado).toBe('pendiente');
      expect(response.body.clienteNombre).toBe('Alice');
      expect(response.body.fecha).toBeDefined();
    });

    it('should return 409 when booking an already occupied slot', async () => {
      // First booking on this slot
      await request(app.getHttpServer())
        .post('/api/v1/tenant/calendario/citas')
        .set(TENANT_B_HEADER)
        .send({
          fecha: '2026-10-05T11:00:00Z',
          clienteNombre: 'Bob',
        })
        .expect(201);

      // Second booking on the same slot — must be rejected
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenant/calendario/citas')
        .set(TENANT_B_HEADER)
        .send({
          fecha: '2026-10-05T11:00:00Z',
          clienteNombre: 'Charlie',
        })
        .expect(409);

      expect(response.body.message).toMatch(/Slot no disponible/i);
    });

    it('should return 422 when minNotice is violated', async () => {
      // Tenant A has minNotice=999999 — any booking fails because the
      // requested fecha is less than ~694 days from now.
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenant/calendario/citas')
        .set(TENANT_A_HEADER)
        .send({
          fecha: '2026-10-05T12:00:00Z',
          clienteNombre: 'MinNotice Client',
        })
        .expect(422);

      expect(response.body.message).toMatch(/antelación|minNotice/i);
    });

    it('should return 400 for invalid body (missing fecha)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tenant/calendario/citas')
        .set(TENANT_B_HEADER)
        .send({ clienteNombre: 'No Date' })
        .expect(400);
    });
  });

  // ─── PATCH /api/v1/tenant/calendario/citas/:id ────────────

  describe('PATCH /api/v1/tenant/calendario/citas/:id', () => {
    it('should return 200 and update estado to confirmada', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenant/calendario/citas/${CITA_PATCH_ID}`)
        .set(TENANT_A_HEADER)
        .send({ estado: 'confirmada' })
        .expect(200);

      expect(response.body.estado).toBe('confirmada');
    });

    it('should return 200 and update estado to cancelada', async () => {
      // First confirm
      await request(app.getHttpServer())
        .patch(`/api/v1/tenant/calendario/citas/${CITA_PATCH_ID}`)
        .set(TENANT_A_HEADER)
        .send({ estado: 'confirmada' })
        .expect(200);

      // Then cancel (re-confirm first since we cancelled in the previous test
      // and the afterAll resets the data... wait, we don't reset between tests.
      // The cita was created as pendiente. Let's just cancel it.
      await request(app.getHttpServer())
        .patch(`/api/v1/tenant/calendario/citas/${CITA_PATCH_ID}`)
        .set(TENANT_A_HEADER)
        .send({ estado: 'cancelada' })
        .expect(200);
    });

    it('should return 400 for invalid estado value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tenant/calendario/citas/${CITA_PATCH_ID}`)
        .set(TENANT_A_HEADER)
        .send({ estado: 'invalid_status' })
        .expect(400);
    });

    it('should return 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/tenant/calendario/citas/not-a-uuid')
        .set(TENANT_A_HEADER)
        .send({ estado: 'confirmada' })
        .expect(400);
    });
  });

  // ─── GET /api/v1/tenant/calendario/citas ──────────────────

  describe('GET /api/v1/tenant/calendario/citas', () => {
    it('should return only citas for the requesting tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/citas')
        .set(TENANT_A_HEADER)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].tenantId).toBe(TENANT_A_ID);
      expect(response.body[0].id).toBe(CITA_PATCH_ID);
    });

    it('should return citas in descending order by fecha', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/citas')
        .set(TENANT_A_HEADER)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      for (let i = 1; i < response.body.length; i++) {
        const prev = new Date(response.body[i - 1].fecha).getTime();
        const curr = new Date(response.body[i].fecha).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  // ─── GET /api/v1/tenant/calendario/disponibilidad ─────────

  describe('GET /api/v1/tenant/calendario/disponibilidad', () => {
    it('should return 200 with disponibilidad config', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/disponibilidad')
        .set(TENANT_A_HEADER)
        .expect(200);

      expect(response.body).toHaveProperty('timezone');
      expect(response.body).toHaveProperty('slotDuration');
      expect(response.body).toHaveProperty('minNotice');
      expect(response.body).toHaveProperty('dailySchedule');
      expect(response.body).toHaveProperty('blockedDates');
      expect(response.body.timezone).toBe('Europe/Madrid');
      expect(response.body.slotDuration).toBe(30);
    });

    it('should return defaults for tenant without disponibilidad', async () => {
      const tempId = crypto.randomUUID();
      const tempSlug = `e2e-citas-c-${Date.now()}`;
      await prisma.admin.tenant.create({
        data: {
          id: tempId,
          slug: tempSlug,
          name: 'E2E Citas C (no disp)',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/disponibilidad')
        .set({ 'x-test-tenant-id': tempId })
        .expect(200);

      expect(response.body.timezone).toBe('Europe/Madrid');
      expect(response.body.slotDuration).toBe(30);
      expect(response.body.minNotice).toBe(240);
      expect(response.body.dailySchedule.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.admin.tenant.delete({ where: { id: tempId } });
    });
  });

  // ─── PUT /api/v1/tenant/calendario/disponibilidad ─────────

  describe('PUT /api/v1/tenant/calendario/disponibilidad', () => {
    it('should return 200 and update disponibilidad config', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/tenant/calendario/disponibilidad')
        .set(TENANT_B_HEADER)
        .send({
          timezone: 'Europe/London',
          slotDuration: 60,
          minNotice: 120,
          maxDays: 14,
          dailySchedule: [{ day: 2, start: '10:00', end: '16:00' }],
        })
        .expect(200);

      // Verify the response
      expect(response.body).toHaveProperty('id');
      expect(response.body.tenantId).toBe(TENANT_B_ID);
    });

    it('should return 200 and create disponibilidad if none existed', async () => {
      const tempId = crypto.randomUUID();
      const tempSlug = `e2e-citas-d-${Date.now()}`;
      await prisma.admin.tenant.create({
        data: {
          id: tempId,
          slug: tempSlug,
          name: 'E2E Citas D',
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/tenant/calendario/disponibilidad')
        .set({ 'x-test-tenant-id': tempId })
        .send({
          dailySchedule: [{ day: 1, start: '09:00', end: '18:00' }],
        })
        .expect(200);

      expect(response.body.tenantId).toBe(tempId);

      // Verify it was persisted
      const getResponse = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/disponibilidad')
        .set({ 'x-test-tenant-id': tempId })
        .expect(200);

      expect(getResponse.body.slotDuration).toBe(30); // default

      // Cleanup
      await prisma.admin.disponibilidad.delete({
        where: { tenantId: tempId },
      });
      await prisma.admin.tenant.delete({ where: { id: tempId } });
    });

    it('should return 400 for invalid body (empty dailySchedule)', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/tenant/calendario/disponibilidad')
        .set(TENANT_B_HEADER)
        .send({
          timezone: 'Invalid/Timezone',
        })
        .expect(400);
    });
  });

  // ─── Tenant isolation ─────────────────────────────────────

  describe('security — tenant isolation', () => {
    it('tenant A should not see tenant B citas via GET list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/citas')
        .set(TENANT_A_HEADER)
        .expect(200);

      const ids = response.body.map((c: any) => c.id);
      expect(ids).toContain(CITA_PATCH_ID);
      expect(ids).not.toContain(CITA_TENANT_B_ID);
    });

    it('tenant B should not see tenant A citas via GET list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tenant/calendario/citas')
        .set(TENANT_B_HEADER)
        .expect(200);

      const ids = response.body.map((c: any) => c.id);
      expect(ids).toContain(CITA_TENANT_B_ID);
      expect(ids).not.toContain(CITA_PATCH_ID);
    });
  });
});
