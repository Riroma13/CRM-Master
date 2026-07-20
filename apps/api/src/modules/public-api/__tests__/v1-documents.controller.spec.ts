import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { V1DocumentsController } from '../v1/v1-documents.controller';
import { DocumentService } from '../../document-engine/document.service';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { TokenService } from '../auth/token.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { QuotaService } from '../rate-limit/quota.service';
import { Reflector } from '@nestjs/core';

const DOC_ID = '00000000-0000-0000-0000-000000000002';
const AUTH = 'Bearer crm_live_test00000000000000000000000000000000000000000000000000000000';

describe('V1DocumentsController', () => {
  let app: INestApplication;
  let mockDocumentService: any;

  beforeEach(async () => {
    mockDocumentService = {
      listDocuments: jest.fn().mockResolvedValue([
        {
          id: DOC_ID,
          title: 'Test Document',
          status: 'active',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T01:00:00Z'),
        },
      ]),
      getDocument: jest.fn().mockResolvedValue({
        id: DOC_ID,
        title: 'Test Document',
        status: 'active',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T01:00:00Z'),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [V1DocumentsController],
      providers: [
        TokenAuthGuard,
        ScopeGuard,
        RateLimitGuard,
        TokenService,
        RateLimitService,
        QuotaService,
        Reflector,
        { provide: DocumentService, useValue: mockDocumentService },
        { provide: TokenService, useValue: { validateToken: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', scopes: ['documents:read'], id: 'key-1' }) } },
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

  describe('GET /api/v1/public/documents', () => {
    it('should return a list of documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('id', DOC_ID);
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('status');
      expect(res.body.data[0]).toHaveProperty('createdAt');
      expect(res.body.data[0]).toHaveProperty('updatedAt');
    });

    it('should pass folderId filter to service', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1', folderId: 'folder-1' })
        .expect(200);

      expect(mockDocumentService.listDocuments).toHaveBeenCalledWith('tenant-1', 'folder-1');
    });

    it('should handle empty list', async () => {
      mockDocumentService.listDocuments.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/public/documents/:id', () => {
    it('should return a single document', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/public/documents/${DOC_ID}`)
        .set('Authorization', AUTH)
        .query({ tenantId: 'tenant-1' })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id', DOC_ID);
      expect(res.body.data).toHaveProperty('title');
      expect(res.body.data).toHaveProperty('status');
    });
  });
});

describe('V1DocumentsController — auth failure', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [V1DocumentsController],
      providers: [
        TokenAuthGuard,
        ScopeGuard,
        RateLimitGuard,
        TokenService,
        RateLimitService,
        QuotaService,
        Reflector,
        { provide: DocumentService, useValue: { listDocuments: jest.fn(), getDocument: jest.fn() } },
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
      .get('/api/v1/public/documents')
      .set('Authorization', AUTH)
      .query({ tenantId: 'tenant-1' })
      .expect(401);
  });
});
