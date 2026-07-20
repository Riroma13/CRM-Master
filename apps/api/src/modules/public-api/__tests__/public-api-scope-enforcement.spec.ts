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

const TENANT_ID = 'cau-ten-scope-0001';
const UUID_WF = '00000000-0000-0000-0000-000000000001';
const UUID_DOC = '00000000-0000-0000-0000-000000000002';

describe('PublicAPI — Scope Enforcement', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const mockWorkflowService = {
    listInstances: jest.fn().mockResolvedValue({
      data: [{ id: UUID_WF, name: 'Test WF', status: 'running', createdAt: new Date(), updatedAt: new Date() }],
      pagination: { page: 1, limit: 20, total: 1 },
    }),
    getInstance: jest.fn().mockResolvedValue({ id: UUID_WF, name: 'Test', status: 'completed', createdAt: new Date(), updatedAt: new Date() }),
  };

  const mockDocumentService = {
    listDocuments: jest.fn().mockResolvedValue([{ id: UUID_DOC, title: 'Test Doc', status: 'active', createdAt: new Date(), updatedAt: new Date() }]),
    getDocument: jest.fn().mockResolvedValue({ id: UUID_DOC, title: 'Test', status: 'active', createdAt: new Date(), updatedAt: new Date() }),
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
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    tokenService = moduleRef.get(TokenService);
    prisma = moduleRef.get(PrismaService);
    await app.init();
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
    jest.clearAllMocks();
    await prisma.admin.apiQuota.deleteMany({ where: { tenantId: TENANT_ID } });
  });

  describe('workflows:read token', () => {
    let readOnlyToken: string;

    beforeAll(async () => {
      const result = await tokenService.createToken(TENANT_ID, 'Read Only', ['workflows:read']);
      readOnlyToken = result.token;
    });

    it('can access workflows endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('CANNOT access documents endpoint (requires documents:read)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(403);
    });
  });

  describe('documents:read token', () => {
    let docOnlyToken: string;

    beforeAll(async () => {
      const result = await tokenService.createToken(TENANT_ID, 'Docs Only', ['documents:read']);
      docOnlyToken = result.token;
    });

    it('can access documents endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', `Bearer ${docOnlyToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('CANNOT access workflows endpoint (requires workflows:read)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${docOnlyToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(403);
    });
  });

  describe('*:admin token (wildcard)', () => {
    let adminToken: string;

    beforeAll(async () => {
      const result = await tokenService.createToken(TENANT_ID, 'Admin Key', ['*:admin']);
      adminToken = result.token;
    });

    it('can access workflows endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('can access documents endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('*:read token (wildcard read)', () => {
    let readAllToken: string;

    beforeAll(async () => {
      const result = await tokenService.createToken(TENANT_ID, 'Read All', ['*:read']);
      readAllToken = result.token;
    });

    it('can access workflows endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Authorization', `Bearer ${readAllToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('can access documents endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', `Bearer ${readAllToken}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('no token', () => {
    it('returns 401 without Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .expect(401);
    });
  });
});
