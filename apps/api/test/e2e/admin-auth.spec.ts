import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module, Injectable, NestMiddleware } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import { BetterAuthGuard } from '../../src/common/guards/better-auth.guard';
import { TenantScopeGuard } from '../../src/common/guards/tenant-scope.guard';
import { PrismaService } from '../../src/common/prisma.service';
import { UseGuards, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Mock middleware that simulates TenantResolveMiddleware behavior for admin routes.
 * In the real app, TenantResolveMiddleware sets isAdminRequest=true when there's
 * no subdomain or a reserved slug. Here we simulate that for /api/v1/admin/* routes.
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

/**
 * Minimal test controller to verify guard behavior on admin routes.
 * Uses BetterAuthGuard via APP_GUARD + TenantScopeGuard via @UseGuards.
 */
@Controller('api/v1/admin/test')
@UseGuards(TenantScopeGuard)
class TestAdminController {
  @Get()
  getTest() {
    return { message: 'authenticated' };
  }
}

@Module({
  controllers: [TestAdminController],
  providers: [
    MockTenantMiddleware,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: BetterAuthGuard,
    },
  ],
})
class TestAdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

/**
 * E2E test: verifies that admin routes enforce BetterAuthGuard + TenantScopeGuard
 * properly, rejecting unauthenticated requests with 401 and non-superadmin with 403.
 *
 * This uses a real NestJS HTTP server with supertest, proving the guards
 * are enforced at the HTTP level — not just unit-tested with mocks.
 */
describe('Admin Auth E2E — Guard enforcement', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const SUPER_BA_USER_ID = crypto.randomUUID();
  const ADMIN_BA_USER_ID = crypto.randomUUID();
  const SUPER_TOKEN = 'sess_e2e_admin_test_super_token';
  const ADMIN_TOKEN = 'sess_e2e_admin_test_admin_token';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAdminModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    await app.init();

    // Seed BA users for test session tokens
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      SUPER_BA_USER_ID, 'e2e-admin-test-super@test.com', true, 'Super Admin',
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ADMIN_BA_USER_ID, 'e2e-admin-test-admin@test.com', true, 'Tenant Admin',
    );

    // Create legacy users with betterAuthUserId linking
    await prisma.admin.user.upsert({
      where: { email: 'e2e-admin-test-super@test.com' },
      create: {
        id: 'e2e-admin-test-super-uuid',
        tenantId: '00000000-0000-0000-0000-000000000001',
        email: 'e2e-admin-test-super@test.com',
        name: 'Super Admin',
        role: 'superadmin',
        betterAuthUserId: SUPER_BA_USER_ID,
        isActive: true,
      },
      update: {},
    });
    await prisma.admin.user.upsert({
      where: { email: 'e2e-admin-test-admin@test.com' },
      create: {
        id: 'e2e-admin-test-admin-uuid',
        tenantId: '00000000-0000-0000-0000-000000000001',
        email: 'e2e-admin-test-admin@test.com',
        name: 'Tenant Admin',
        role: 'admin',
        betterAuthUserId: ADMIN_BA_USER_ID,
        isActive: true,
      },
      update: {},
    });

    // Create sessions in ba_sessions
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
      crypto.randomUUID(), SUPER_BA_USER_ID, SUPER_TOKEN, futureDate.toISOString(),
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4::timestamp, NOW(), NOW())`,
      crypto.randomUUID(), ADMIN_BA_USER_ID, ADMIN_TOKEN, futureDate.toISOString(),
    );
  });

  afterAll(async () => {
    if (prisma) {
      for (const email of ['e2e-admin-test-super@test.com', 'e2e-admin-test-admin@test.com']) {
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
        where: { id: { in: ['e2e-admin-test-super-uuid', 'e2e-admin-test-admin-uuid'] } },
      });
    }
    if (app) await app.close();
  });

  it('GET /api/v1/admin/test without token → 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body.message).toMatch(/token|autenticación/i);
  });

  it('GET /api/v1/admin/test with invalid token → 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', 'Bearer invalid_token_12345')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body.message).toMatch(/inválido|expirado/i);
  });

  it('GET /api/v1/admin/test with Basic auth (not Bearer) → 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .expect(401);

    expect(response.body).toHaveProperty('statusCode', 401);
  });

  it('GET /api/v1/admin/test with valid superadmin session → 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', `Bearer ${SUPER_TOKEN}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'authenticated' });
  });

  it('GET /api/v1/admin/test with valid non-superadmin session → 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .expect(403);

    expect(response.body).toHaveProperty('statusCode', 403);
    expect(response.body.message).toMatch(/superadmin/i);
  });
});
