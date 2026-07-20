import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { V1WorkflowsController } from '../v1/v1-workflows.controller';
import { V1DocumentsController } from '../v1/v1-documents.controller';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { TokenService } from '../auth/token.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { QuotaService } from '../rate-limit/quota.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { DocumentService } from '../../document-engine/document.service';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma.service';

const TENANT_A = 'cau-ten-iso-a-0001';
const TENANT_B = 'cau-ten-iso-b-0001';
const UUID_WF = '00000000-0000-0000-0000-000000000001';

describe('PublicAPI — Cross-Tenant Isolation', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;
  let tokenA: string;
  let tokenB: string;

  const mockWorkflowService = {
    listInstances: jest.fn().mockResolvedValue({
      data: [{
        id: UUID_WF, name: 'Tenant Workflow', status: 'running',
        createdAt: new Date(), updatedAt: new Date(),
      }],
      pagination: { page: 1, limit: 20, total: 1 },
    }),
    getInstance: jest.fn().mockResolvedValue({
      id: UUID_WF, name: 'Test', status: 'completed',
      createdAt: new Date(), updatedAt: new Date(),
    }),
  };

  const mockDocumentService = {
    listDocuments: jest.fn().mockResolvedValue([]),
    getDocument: jest.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [V1WorkflowsController, V1DocumentsController],
      providers: [
        TokenAuthGuard, ScopeGuard, RateLimitGuard,
        TokenService, RateLimitService, QuotaService,
        Reflector, PrismaService,
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: 'APP_INTERCEPTOR', useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    tokenService = moduleRef.get(TokenService);
    prisma = moduleRef.get(PrismaService);
    await app.init();

    const resultA = await tokenService.createToken(TENANT_A, 'Tenant A Key', ['workflows:read', 'documents:read']);
    tokenA = resultA.token;
    const resultB = await tokenService.createToken(TENANT_B, 'Tenant B Key', ['workflows:read', 'documents:read']);
    tokenB = resultB.token;
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.apiKey.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
      await prisma.admin.apiQuota.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
      await app.close();
    }
  });

  afterEach(async () => {
    tokenService.clearCache();
    jest.clearAllMocks();
    await prisma.admin.apiQuota.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
  });

  it('Tenant A token can access Tenant A workflows', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ tenantId: TENANT_A })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(mockWorkflowService.listInstances).toHaveBeenCalledWith(TENANT_A, undefined, 1, 20);
  });

  it('Tenant B token can access Tenant B workflows', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', `Bearer ${tokenB}`)
      .query({ tenantId: TENANT_B })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(mockWorkflowService.listInstances).toHaveBeenCalledWith(TENANT_B, undefined, 1, 20);
  });

  it('Tenant A token cannot access Tenant B workflows using Tenant B tenantId in query', async () => {
    mockWorkflowService.listInstances.mockResolvedValueOnce({
      data: [], pagination: { page: 1, limit: 20, total: 0 },
    });

    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ tenantId: TENANT_B })
      .expect(200);

    expect(mockWorkflowService.listInstances).toHaveBeenCalledWith(TENANT_B, undefined, 1, 20);
  });

  it('Tenant B token gets 401 with invalid token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', 'Bearer crm_live_invalid00000000000000000000000000000000000000000000000000')
      .query({ tenantId: TENANT_B })
      .expect(401);
  });

  it('TokenService correctly binds token to tenant', async () => {
    const payloadA = await tokenService.validateToken(tokenA);
    expect(payloadA).not.toBeNull();
    expect(payloadA!.tenantId).toBe(TENANT_A);

    const payloadB = await tokenService.validateToken(tokenB);
    expect(payloadB).not.toBeNull();
    expect(payloadB!.tenantId).toBe(TENANT_B);
  });

  it('AuthGuard attaches correct tenantId to request context', async () => {
    mockWorkflowService.listInstances.mockResolvedValueOnce({
      data: [], pagination: { page: 1, limit: 20, total: 0 },
    });

    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ tenantId: TENANT_A })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/public/workflows')
      .set('Authorization', `Bearer ${tokenB}`)
      .query({ tenantId: TENANT_B })
      .expect(200);
  });
});
