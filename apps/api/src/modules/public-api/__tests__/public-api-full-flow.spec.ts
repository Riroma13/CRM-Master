import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { V1WorkflowsController } from '../v1/v1-workflows.controller';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { TokenService } from '../auth/token.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { QuotaService } from '../rate-limit/quota.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma.service';

const TENANT_ID = 'cau-ten-flow-0001';
const UUID_WF = '00000000-0000-0000-0000-000000000001';

describe('PublicAPI — Full Flow Integration', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let rateLimitService: RateLimitService;
  let quotaService: QuotaService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;
  let createdToken: string;
  let createdTokenId: string;

  const mockWorkflowService = {
    listInstances: jest.fn().mockResolvedValue({
      data: [{ id: UUID_WF, name: 'Test Flow WF', status: 'running', createdAt: new Date(), updatedAt: new Date() }],
      pagination: { page: 1, limit: 20, total: 1 },
    }),
    getInstance: jest.fn().mockResolvedValue({ id: UUID_WF, name: 'Test', status: 'completed', createdAt: new Date(), updatedAt: new Date() }),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [V1WorkflowsController],
      providers: [
        TokenAuthGuard, ScopeGuard, RateLimitGuard,
        TokenService, RateLimitService, QuotaService,
        Reflector, PrismaService,
        { provide: WorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    tokenService = moduleRef.get(TokenService);
    rateLimitService = moduleRef.get(RateLimitService);
    quotaService = moduleRef.get(QuotaService);
    prisma = moduleRef.get(PrismaService);
    await app.init();

    // Create token for full flow
    const result = await tokenService.createToken(TENANT_ID, 'Full Flow Key', ['workflows:read']);
    createdToken = result.token;
    createdTokenId = result.id;
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.apiKey.deleteMany({ where: { tenantId: TENANT_ID } });
      await prisma.admin.apiQuota.deleteMany({ where: { tenantId: TENANT_ID } });
      await app.close();
    }
  });

  afterEach(async () => {
    tokenService.clearCache();
    rateLimitService.clearCache();
    jest.clearAllMocks();
    await prisma.admin.apiQuota.deleteMany({ where: { tenantId: TENANT_ID } });

    // Recreate token if it was revoked
    const stored = await prisma.admin.apiKey.findUnique({ where: { id: createdTokenId } });
    if (!stored || !stored.active) {
      const result = await tokenService.createToken(TENANT_ID, 'Full Flow Key', ['workflows:read']);
      createdToken = result.token;
      createdTokenId = result.id;
    }
  });

  describe('Step 1: Valid authentication', () => {
    it('authenticates with valid token and returns workflows', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('id', UUID_WF);
    });
  });

  describe('Step 2: Rate limit exceeded', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      // Exhaust the rate limit for this key+route (match Express route path)
      for (let i = 0; i < 100; i++) {
        rateLimitService.checkRateLimit(createdTokenId, 'GET', '/api/v1/public/workflows');
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(429);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/rate limit/i);
    });

    it('returns error with retryAfter information', async () => {
      for (let i = 0; i < 100; i++) {
        rateLimitService.checkRateLimit(createdTokenId, 'GET', '/api/v1/public/workflows');
      }

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(429);

      expect(res.body).toHaveProperty('retryAfter');
      expect(typeof res.body.retryAfter).toBe('number');
    });
  });

  describe('Step 3: Quota exceeded', () => {
    it('returns 429 when monthly quota is exceeded', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Set quota to 0 remaining
      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 1, usedThisMonth: 1, month: currentMonth },
        update: { monthlyLimit: 1, usedThisMonth: 1, month: currentMonth },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(429);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/quota/i);
    });
  });

  describe('Step 4: Token revocation', () => {
    beforeEach(async () => {
      // Ensure token is active before testing revocation
      const stored = await prisma.admin.apiKey.findUnique({ where: { id: createdTokenId } });
      if (!stored || !stored.active) {
        const result = await tokenService.createToken(TENANT_ID, 'Full Flow Key', ['workflows:read']);
        createdToken = result.token;
        createdTokenId = result.id;
      }
    });

    it('revokes the token and subsequent requests fail with 401', async () => {
      // Verify token works before revoke
      await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      // Revoke
      await tokenService.revokeToken(createdTokenId);

      // Token should no longer work
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${createdToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(401);

      expect(res.body.message).toMatch(/token/i);
    });
  });
});
