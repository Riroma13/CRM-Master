import { Test, TestingModule } from '@nestjs/testing';
import { RetrievalEngine } from '../retrieval/retrieval-engine';
import { PrismaService } from '../../../common/prisma.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import type { KbQuery } from '@shared/knowledge';

describe('RetrievalEngine', () => {
  let engine: RetrievalEngine;
  let prisma: any;
  let embeddingService: jest.Mocked<EmbeddingService>;

  const TENANT_ID = 'tenant-test-1';

  function makeQuery(overrides: Partial<KbQuery> = {}): KbQuery {
    return {
      query: 'test query',
      tenantId: TENANT_ID,
      topK: 5,
      ...overrides,
    };
  }

  function makeRow(overrides: Record<string, any> = {}) {
    return {
      id: 'chunk-1',
      tenant_id: TENANT_ID,
      source_type: 'document',
      source_id: 'doc-1',
      chunk_index: 0,
      content: 'Test content',
      content_hash: 'abc123',
      metadata: {},
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
      distance: 0.1,
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      admin: {
        $queryRawUnsafe: jest.fn(),
      },
    };

    embeddingService = {
      generateEmbedding: jest.fn(),
      generateEmbeddings: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalEngine,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingService, useValue: embeddingService },
      ],
    }).compile();

    engine = module.get<RetrievalEngine>(RetrievalEngine);
  });

  describe('search', () => {
    it('should perform KNN search with tenant filtering', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([makeRow()]);

      const results = await engine.search(makeQuery());

      expect(results).toHaveLength(1);
      expect(results[0].chunk.tenantId).toBe(TENANT_ID);
      expect(results[0].chunk.sourceId).toBe('doc-1');
      expect(results[0].score).toBeCloseTo(0.9, 5);
      expect(prisma.admin.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('should filter by sourceTypes', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      await engine.search(
        makeQuery({ sourceTypes: ['document', 'workflow'] }),
      );

      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('source_type IN');
    });

    it('should filter by sourceIds', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      await engine.search(makeQuery({ sourceIds: ['doc-1', 'doc-2'] }));

      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('source_id IN');
    });

    it('should filter by date range', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      await engine.search(
        makeQuery({
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        }),
      );

      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('created_at >=');
      expect(sql).toContain('created_at <=');
    });

    it('should return empty array when no results', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      const results = await engine.search(makeQuery());

      expect(results).toHaveLength(0);
    });

    it('should respect topK parameter', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      const rows = Array.from({ length: 10 }, (_, i) =>
        makeRow({ id: `chunk-${i}`, distance: 0.1 + i * 0.05 }),
      );
      prisma.admin.$queryRawUnsafe.mockResolvedValue(rows);

      const results = await engine.search(makeQuery({ topK: 3 }));

      expect(results).toHaveLength(10);
      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('LIMIT 3');
    });

    it('should enforce tenant isolation via WHERE clause', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      await engine.search(makeQuery());

      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('tenant_id = $1');
    });
  });

  describe('hybridSearch', () => {
    it('should combine vector and keyword scores', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([
        makeRow({ distance: 0.1, keyword_score: 0.8 }),
      ]);

      const results = await engine.hybridSearch(makeQuery());

      expect(results).toHaveLength(1);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should use ts_rank for keyword scoring', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      await engine.hybridSearch(makeQuery());

      const sql = prisma.admin.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('ts_rank');
      expect(sql).toContain('plainto_tsquery');
    });

    it('should return empty array when no results', async () => {
      embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      prisma.admin.$queryRawUnsafe.mockResolvedValue([]);

      const results = await engine.hybridSearch(makeQuery());

      expect(results).toHaveLength(0);
    });
  });
});
