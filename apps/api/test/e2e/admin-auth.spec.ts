import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module, Injectable, NestMiddleware } from '@nestjs/common';
import * as request from 'supertest';
import { AdminAuthGuard } from '../../src/common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../src/common/guards/tenant-scope.guard';
import { SessionService } from '../../src/modules/auth/session.service';
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
 * Uses the REAL guards (AdminAuthGuard + TenantScopeGuard) via @UseGuards.
 */
@Controller('api/v1/admin/test')
@UseGuards(AdminAuthGuard, TenantScopeGuard)
class TestAdminController {
  @Get()
  getTest() {
    return { message: 'authenticated' };
  }
}

@Module({
  controllers: [TestAdminController],
  providers: [SessionService, MockTenantMiddleware],
})
class TestAdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockTenantMiddleware).forRoutes('*');
  }
}

/**
 * E2E test: verifies that admin routes with @UseGuards(AdminAuthGuard, TenantScopeGuard)
 * reject unauthenticated requests with 401.
 *
 * This uses a real NestJS HTTP server with supertest, proving the guards
 * are enforced at the HTTP level — not just unit-tested with mocks.
 */
describe('Admin Auth E2E — @UseGuards enforcement', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAdminModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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
    const sessionService = app.get(SessionService);
    const token = sessionService.createSession({
      userId: 'user-1',
      tenantId: 'tenant-1',
      role: 'superadmin',
      email: 'admin@test.com',
      name: 'Admin User',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({ message: 'authenticated' });
  });

  it('GET /api/v1/admin/test with valid non-superadmin session → 403', async () => {
    const sessionService = app.get(SessionService);
    const token = sessionService.createSession({
      userId: 'user-2',
      tenantId: 'tenant-1',
      role: 'viewer',
      email: 'viewer@test.com',
      name: 'Viewer User',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toHaveProperty('statusCode', 403);
    expect(response.body.message).toMatch(/superadmin/i);
  });
});
