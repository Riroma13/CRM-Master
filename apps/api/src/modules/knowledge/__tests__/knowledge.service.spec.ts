import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { ChunkingService } from '../ingestion/chunking.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { EmbeddingCache } from '../embeddings/embedding-cache';
import { KnowledgeService } from '../knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let prisma: any;
  let chunkingService: jest.Mocked<ChunkingService>;
  let embeddingService: jest.Mocked<EmbeddingService>;

  const TENANT_ID = 'tenant-test-1';
  const SOURCE_TYPE = 'document' as const;
  const SOURCE_ID = 'doc-1';
  const CONTENT = 'This is test content for indexing.';

  beforeEach(async () => {
    prisma = {
      admin: {
        kbChunk: {
          findFirst: jest.fn(),
          deleteMany: jest.fn(),
        },
        kbSourceIndex: {
          upsert: jest.fn(),
          deleteMany: jest.fn(),
        },
        $executeRawUnsafe: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        ChunkingService,
        EmbeddingCache,
        {
          provide: EmbeddingService,
          useValue: { generateEmbedding: jest.fn(), generateEmbeddings: jest.fn() },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    chunkingService = module.get(ChunkingService) as jest.Mocked<ChunkingService>;
    embeddingService = module.get(EmbeddingService) as jest.Mocked<EmbeddingService>;
  });

  describe('indexContent', () => {
    it('should chunk content and upsert chunks', async () => {
      const chunks = ['Chunk 1 content.', 'Chunk 2 content.'];
      const hash1 = 'aaa';
      const hash2 = 'bbb';

      prisma.admin.kbChunk.findFirst.mockResolvedValue(null);
      prisma.admin.$executeRawUnsafe.mockResolvedValue(undefined);
      prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-1' });
      embeddingService.generateEmbedding
        .mockResolvedValueOnce([0.1, 0.2])
        .mockResolvedValueOnce([0.3, 0.4]);

      jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
      jest.spyOn(chunkingService, 'generateContentHash')
        .mockReturnValueOnce(hash1)
        .mockReturnValueOnce(hash2);

      const result = await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, CONTENT);

      expect(result.chunksCreated).toBe(2);
      expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(prisma.admin.kbSourceIndex.upsert).toHaveBeenCalledTimes(1);
    });

    it('should skip chunk when contentHash matches', async () => {
      const chunks = ['Existing chunk content.'];
      const hash = 'existing-hash';

      prisma.admin.kbChunk.findFirst.mockResolvedValue({
        id: 'existing-chunk',
        contentHash: hash,
      });
      prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-1' });

      jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
      jest.spyOn(chunkingService, 'generateContentHash').mockReturnValue(hash);

      const result = await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, CONTENT);

      expect(result.chunksCreated).toBe(1);
      expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
      expect(prisma.admin.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should skip empty content', async () => {
      jest.spyOn(chunkingService, 'chunk').mockResolvedValue([]);

      const result = await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, '');

      expect(result.chunksCreated).toBe(0);
      expect(prisma.admin.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe('deleteSource', () => {
    it('should delete all chunks and source index for source', async () => {
      prisma.admin.kbChunk.deleteMany.mockResolvedValue({ count: 5 });
      prisma.admin.kbSourceIndex.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.deleteSource(TENANT_ID, SOURCE_TYPE, SOURCE_ID);

      expect(result.deletedChunks).toBe(5);
      expect(prisma.admin.kbChunk.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, sourceType: SOURCE_TYPE, sourceId: SOURCE_ID },
      });
      expect(prisma.admin.kbSourceIndex.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, sourceType: SOURCE_TYPE, sourceId: SOURCE_ID },
      });
    });

    it('should return zero when no chunks exist', async () => {
      prisma.admin.kbChunk.deleteMany.mockResolvedValue({ count: 0 });
      prisma.admin.kbSourceIndex.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteSource(TENANT_ID, SOURCE_TYPE, SOURCE_ID);

      expect(result.deletedChunks).toBe(0);
    });
  });

  describe('reindexSource', () => {
    it('should delete and reindex source', async () => {
      const chunks = ['Reindexed chunk.'];
      const hash = 'reindex-hash';

      prisma.admin.kbChunk.findFirst.mockResolvedValue(null);
      prisma.admin.kbChunk.deleteMany.mockResolvedValue({ count: 3 });
      prisma.admin.kbSourceIndex.deleteMany.mockResolvedValue({ count: 1 });
      prisma.admin.$executeRawUnsafe.mockResolvedValue(undefined);
      prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-2' });
      embeddingService.generateEmbedding.mockResolvedValue([0.5, 0.6]);

      jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
      jest.spyOn(chunkingService, 'generateContentHash').mockReturnValue(hash);

      const result = await service.reindexSource(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'New content');

      expect(result.chunksCreated).toBe(1);
      expect(prisma.admin.kbChunk.deleteMany).toHaveBeenCalled();
      expect(prisma.admin.kbSourceIndex.deleteMany).toHaveBeenCalled();
    });
  });
});
