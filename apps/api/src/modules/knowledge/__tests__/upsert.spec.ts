import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { ChunkingService } from '../ingestion/chunking.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { EmbeddingCache } from '../embeddings/embedding-cache';
import { KnowledgeService } from '../knowledge.service';

describe('KnowledgeService UPSERT behavior', () => {
  let service: KnowledgeService;
  let prisma: any;
  let chunkingService: jest.Mocked<ChunkingService>;
  let embeddingService: jest.Mocked<EmbeddingService>;

  const TENANT_ID = 'tenant-upsert-1';
  const SOURCE_TYPE = 'document' as const;
  const SOURCE_ID = 'doc-upsert-1';

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

  it('should create new chunks via raw SQL UPSERT when no existing chunk', async () => {
    const chunks = ['New chunk content.'];
    const hash = 'new-content-hash';

    prisma.admin.kbChunk.findFirst.mockResolvedValue(null);
    prisma.admin.$executeRawUnsafe.mockResolvedValue(undefined);
    prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-new' });
    embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
    jest.spyOn(chunkingService, 'generateContentHash').mockReturnValue(hash);

    await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'New chunk content.');

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const sqlCall = prisma.admin.$executeRawUnsafe.mock.calls[0];
    expect(sqlCall[0]).toContain('INSERT INTO kb_chunks');
    expect(sqlCall[0]).toContain('ON CONFLICT');
    expect(sqlCall[0]).toContain('DO UPDATE SET');
    expect(sqlCall[1]).toBe(TENANT_ID);
    expect(sqlCall[2]).toBe(SOURCE_TYPE);
    expect(sqlCall[3]).toBe(SOURCE_ID);
    expect(sqlCall[4]).toBe(0);
    expect(sqlCall[5]).toBe('New chunk content.');
    expect(sqlCall[6]).toBe(hash);
    expect(sqlCall[8]).toContain('0.1,0.2,0.3');
  });

  it('should update existing chunk when content changes', async () => {
    const chunks = ['Updated content.'];
    const oldHash = 'old-hash';
    const newHash = 'new-hash';

    prisma.admin.kbChunk.findFirst.mockResolvedValue({
      id: 'existing-chunk',
      contentHash: oldHash,
    });
    prisma.admin.$executeRawUnsafe.mockResolvedValue(undefined);
    prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-updated' });
    embeddingService.generateEmbedding.mockResolvedValue([0.4, 0.5, 0.6]);
    jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
    jest.spyOn(chunkingService, 'generateContentHash').mockReturnValue(newHash);

    await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Updated content.');

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(1);
  });

  it('should skip embedding computation when contentHash matches existing', async () => {
    const chunks = ['Same content.'];
    const hash = 'matching-hash';

    prisma.admin.kbChunk.findFirst.mockResolvedValue({
      id: 'chunk-id',
      contentHash: hash,
    });
    prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-skip' });
    jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
    jest.spyOn(chunkingService, 'generateContentHash').mockReturnValue(hash);

    await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Same content.');

    expect(embeddingService.generateEmbedding).not.toHaveBeenCalled();
    expect(prisma.admin.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('should handle multiple chunks with mixed hash matches', async () => {
    const chunks = ['Changed chunk.', 'Unchanged chunk.', 'New chunk.'];
    const hashes = ['hash-a', 'hash-b', 'hash-c'];

    prisma.admin.kbChunk.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'c2', contentHash: 'hash-b' })
      .mockResolvedValueOnce(null);
    prisma.admin.$executeRawUnsafe.mockResolvedValue(undefined);
    prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-mixed' });
    embeddingService.generateEmbedding
      .mockResolvedValueOnce([0.1])
      .mockResolvedValueOnce([0.3]);
    jest.spyOn(chunkingService, 'chunk').mockResolvedValue(chunks);
    jest.spyOn(chunkingService, 'generateContentHash')
      .mockReturnValueOnce(hashes[0])
      .mockReturnValueOnce(hashes[1])
      .mockReturnValueOnce(hashes[2]);

    await service.indexContent(TENANT_ID, SOURCE_TYPE, SOURCE_ID, 'Mixed content.');

    expect(prisma.admin.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(embeddingService.generateEmbedding).toHaveBeenCalledTimes(2);
  });
});
