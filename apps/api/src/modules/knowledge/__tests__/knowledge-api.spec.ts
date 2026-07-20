import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { KnowledgeController } from '../knowledge.controller';
import { KnowledgeService } from '../knowledge.service';
import { RetrievalEngine } from '../retrieval/retrieval-engine';
import { GenerationEngine } from '../generation/generation-engine';
import { KnowledgeGuard } from '../guards/knowledge.guard';
import { PrismaService } from '../../../common/prisma.service';
import { APP_GUARD } from '@nestjs/core';

describe('KnowledgeController (integration)', () => {
  let app: INestApplication;
  let mockKnowledgeService: any;
  let mockRetrievalEngine: any;
  let mockGenerationEngine: any;
  let mockPrisma: any;

  const TENANT_ID = 'tenant-test-1';
  const SOURCE_TYPE = 'document';
  const SOURCE_ID = 'doc-1';

  beforeEach(async () => {
    mockKnowledgeService = {
      indexContent: jest.fn().mockResolvedValue({
        chunksCreated: 2,
        sourceId: SOURCE_ID,
        sourceType: SOURCE_TYPE,
      }),
      deleteSource: jest.fn().mockResolvedValue({ deletedChunks: 2 }),
      reindexSource: jest.fn().mockResolvedValue({
        chunksCreated: 2,
        sourceId: SOURCE_ID,
        sourceType: SOURCE_TYPE,
      }),
    };

    mockRetrievalEngine = {
      search: jest.fn().mockResolvedValue([
        {
          chunk: {
            id: 'chunk-1',
            tenantId: TENANT_ID,
            sourceType: SOURCE_TYPE,
            sourceId: SOURCE_ID,
            chunkIndex: 0,
            content: 'Relevant content about workflows.',
            contentHash: 'abc123',
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          score: 0.95,
        },
      ]),
    };

    mockGenerationEngine = {
      answer: jest.fn().mockResolvedValue({
        query: 'How many workflows failed yesterday?',
        answer: 'Based on the context, one workflow failed yesterday.',
        citations: [
          {
            sourceType: SOURCE_TYPE,
            sourceId: SOURCE_ID,
            content: 'Relevant content about workflows.',
            relevanceScore: 0.95,
          },
        ],
        generatedAt: new Date().toISOString(),
        model: 'openai',
      }),
    };

    mockPrisma = {
      admin: {
        kbSourceIndex: {
          findMany: jest.fn().mockResolvedValue([
            {
              sourceType: SOURCE_TYPE,
              sourceId: SOURCE_ID,
              tenantId: TENANT_ID,
              chunkCount: 2,
              status: 'indexed',
              lastIndexedAt: new Date(),
              error: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ count: 0 }]),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: RetrievalEngine, useValue: mockRetrievalEngine },
        { provide: GenerationEngine, useValue: mockGenerationEngine },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(KnowledgeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/knowledge/query', () => {
    it('should return answer with citations', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/query')
        .send({ query: 'How many workflows failed yesterday?', tenantId: TENANT_ID, topK: 5 })
        .expect(200);

      expect(res.body).toHaveProperty('answer');
      expect(res.body).toHaveProperty('citations');
      expect(res.body).toHaveProperty('model');
      expect(res.body).toHaveProperty('generatedAt');
      expect(res.body.citations).toHaveLength(1);
      expect(mockRetrievalEngine.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'How many workflows failed yesterday?' }),
      );
      expect(mockGenerationEngine.answer).toHaveBeenCalled();
    });

    it('should support optional filters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/query')
        .send({
          query: 'Find documents',
          tenantId: TENANT_ID,
          sourceTypes: ['document'],
          dateFrom: '2024-01-01T00:00:00.000Z',
          dateTo: '2024-12-31T23:59:59.000Z',
          topK: 3,
          includeChunks: true,
        })
        .expect(200);

      expect(res.body.answer).toBeDefined();
      expect(mockRetrievalEngine.search).toHaveBeenCalledWith(
        expect.objectContaining({ sourceTypes: ['document'], topK: 3 }),
      );
    });

    it('should reject empty query', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/query')
        .send({ query: '', tenantId: TENANT_ID })
        .expect(400);
    });
  });

  describe('POST /api/v1/knowledge/index', () => {
    it('should index content and return chunk count', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/knowledge/index')
        .send({ tenantId: TENANT_ID, sourceType: SOURCE_TYPE, sourceId: SOURCE_ID, content: 'Content to index for testing.' })
        .expect(201);

      expect(res.body).toHaveProperty('chunksCreated', 2);
      expect(res.body).toHaveProperty('sourceId', SOURCE_ID);
      expect(mockKnowledgeService.indexContent).toHaveBeenCalledWith(
        TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Content to index for testing.', undefined,
      );
    });

    it('should accept metadata', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/knowledge/index')
        .send({ tenantId: TENANT_ID, sourceType: SOURCE_TYPE, sourceId: SOURCE_ID, content: 'Content with metadata.', metadata: { category: 'reports' } })
        .expect(201);

      expect(mockKnowledgeService.indexContent).toHaveBeenCalledWith(
        TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Content with metadata.', { category: 'reports' },
      );
    });
  });

  describe('DELETE /api/v1/knowledge/sources/:sourceType/:sourceId', () => {
    it('should delete source chunks', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/knowledge/sources/${SOURCE_TYPE}/${SOURCE_ID}`)
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body).toHaveProperty('deletedChunks', 2);
      expect(mockKnowledgeService.deleteSource).toHaveBeenCalledWith(TENANT_ID, SOURCE_TYPE, SOURCE_ID);
    });
  });

  describe('POST /api/v1/knowledge/sources/:sourceType/:sourceId/reindex', () => {
    it('should reindex source', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/knowledge/sources/${SOURCE_TYPE}/${SOURCE_ID}/reindex`)
        .send({ tenantId: TENANT_ID, content: 'Reindexed content.' })
        .expect(201);

      expect(res.body).toHaveProperty('chunksCreated', 2);
      expect(mockKnowledgeService.reindexSource).toHaveBeenCalledWith(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Reindexed content.', undefined);
    });
  });

  describe('GET /api/v1/knowledge/sources', () => {
    it('should list indexed sources', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/knowledge/sources')
        .query({ tenantId: TENANT_ID })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('sourceType', SOURCE_TYPE);
      expect(res.body.data[0]).toHaveProperty('chunkCount', 2);
    });
  });

  describe('GET /api/v1/knowledge/health', () => {
    it('should return health status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/knowledge/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('queueDepths');
      expect(res.body).toHaveProperty('modelLoaded', true);
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.queueDepths).toHaveProperty('ingestion');
      expect(res.body.queueDepths).toHaveProperty('reindex');
      expect(res.body.queueDepths).toHaveProperty('garbageCollector');
    });
  });
});
