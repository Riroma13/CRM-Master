import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { V1WorkflowsController } from '../v1/v1-workflows.controller';
import { WorkflowService } from '../../workflow/workflow.service';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { TokenService } from '../auth/token.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { QuotaService } from '../rate-limit/quota.service';
import { Reflector } from '@nestjs/core';

const UUID_WF = '00000000-0000-0000-0000-000000000001';
const AUTH = 'Bearer crm_live_test00000000000000000000000000000000000000000000000000000000';

describe('V1WorkflowsController', () => {
  let app: INestApplication;
  let mockWorkflowService: any;

  beforeEach(async () => {
    mockWorkflowService = {
      listInstances: jest.fn().mockResolvedValue({
        data: [
          {
            id: UUID_WF,
            name: 'Test Workflow',
            status: 'running',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T01:00:00Z'),
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      }),
      getInstance: jest.fn().mockResolvedValue({
        id: UUID_WF,
        name: 'Test Workflow',
        status: 'completed',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [V1WorkflowsController],
      providers: [
        TokenAuthGuard,
        ScopeGuard,
        RateLimitGuard,
        TokenService,
        RateLimitService,
        QuotaService,
        Reflector,
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: TokenService, useValue: { validateToken: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', scopes: ['workflows:read'], id: 'key-1' }) } },
        { provide: RateLimitService, useValue: { checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 99, resetAt: 9999999999 }) } },
        { provide: QuotaService, useValue: { checkQuota: jest.fn().mockResolvedValue({ allowed: true }), incrementUsage: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/public/workflows', () => {
    it('should return a paginated list of workflows', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('id', UUID_WF);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('status');
      expect(res.body.data[0]).toHaveProperty('createdAt');
      expect(res.body.data[0]).toHaveProperty('updatedAt');
      expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    it('should pass status filter to service', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1', status: 'running' })
        .expect(200);

      expect(mockWorkflowService.listInstances).toHaveBeenCalledWith('tenant-1', 'running', 1, 20);
    });

    it('should handle empty list', async () => {
      mockWorkflowService.listInstances.mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('GET /api/v1/public/workflows/:id', () => {
    it('should return a single workflow', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/workflows/${UUID_WF}`)
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', UUID_WF);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('status');
    });
  });
});

describe('V1WorkflowsController — auth failure', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [V1WorkflowsController],
      providers: [
        TokenAuthGuard,
        ScopeGuard,
        RateLimitGuard,
        TokenService,
        RateLimitService,
        QuotaService,
        Reflector,
        { provide: WorkflowService, useValue: { listInstances: jest.fn(), getInstance: jest.fn() } },
        { provide: TokenService, useValue: { validateToken: jest.fn().mockResolvedValue(null) } },
        { provide: RateLimitService, useValue: { checkRateLimit: jest.fn().mockReturnValue({ allowed: true }) } },
        { provide: QuotaService, useValue: { checkQuota: jest.fn().mockResolvedValue({ allowed: true }), incrementUsage: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 401 when auth guard fails', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', AUTH)
      .query({ tenantId: 'tenant-1' })
      .expect(401);
  });
});

describe('V1WorkflowsController — scope mismatch', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [V1WorkflowsController],
      providers: [
        TokenAuthGuard,
        ScopeGuard,
        RateLimitGuard,
        TokenService,
        RateLimitService,
        QuotaService,
        Reflector,
        { provide: WorkflowService, useValue: { listInstances: jest.fn(), getInstance: jest.fn() } },
        { provide: TokenService, useValue: { validateToken: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', scopes: ['documents:read'], id: 'key-1' }) } },
        { provide: RateLimitService, useValue: { checkRateLimit: jest.fn().mockReturnValue({ allowed: true }) } },
        { provide: QuotaService, useValue: { checkQuota: jest.fn().mockResolvedValue({ allowed: true }), incrementUsage: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 403 when scope is insufficient', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', AUTH)
      .query({ tenantId: 'tenant-1' })
      .expect(403);
  });
});
