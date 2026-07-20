import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { KnowledgeService } from '../knowledge.service';
import { ChunkingService } from '../ingestion/chunking.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { EmbeddingCache } from '../embeddings/embedding-cache';
import { IngestionService, ReindexService } from '../ingestion/ingestion.service';

describe('IngestionService', () => {
  let service: IngestionService;
  let knowledgeService: jest.Mocked<KnowledgeService>;
  let prisma: any;
  let dlqQueue: any;

  const validJobData = {
    tenantId: 'tenant-1',
    sourceType: 'document',
    sourceId: 'doc-1',
    content: 'Test content for ingestion.',
  };

  beforeEach(async () => {
    prisma = {
      admin: {
        kbSourceIndex: {
          upsert: jest.fn(),
        },
      },
    };

    dlqQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: KnowledgeService,
          useValue: {
            indexContent: jest.fn(),
            reindexSource: jest.fn(),
            deleteSource: jest.fn(),
          },
        },
        {
          provide: getQueueToken('kb:ingestion-dlq'),
          useValue: dlqQueue,
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    knowledgeService = module.get(KnowledgeService) as jest.Mocked<KnowledgeService>;
  });

  it('should process a valid ingestion job', async () => {
    knowledgeService.indexContent.mockResolvedValue({
      chunksCreated: 2,
      sourceId: 'doc-1',
      sourceType: 'document',
    });

    const job = {
      id: 'job-1',
      data: validJobData,
    } as any;

    const result = await service.process(job);

    expect(result.indexed).toBe(true);
    expect(knowledgeService.indexContent).toHaveBeenCalledWith(
      'tenant-1', 'document', 'doc-1', 'Test content for ingestion.', undefined,
    );
  });

  it('should send invalid jobs to DLQ', async () => {
    const job = {
      id: 'job-invalid',
      data: { tenantId: '' },
    } as any;

    const result = await service.process(job);

    expect(result.indexed).toBe(false);
    expect(dlqQueue.add).toHaveBeenCalledWith('invalid-job', expect.objectContaining({
      jobId: 'job-invalid',
    }));
  });

  it('should send failed jobs to DLQ and update source index', async () => {
    const error = new Error('Ingestion failed');
    knowledgeService.indexContent.mockRejectedValue(error);

    prisma.admin.kbSourceIndex.upsert.mockResolvedValue({ id: 'si-1' });

    const job = {
      id: 'job-fail',
      data: validJobData,
    } as any;

    await expect(service.process(job)).rejects.toThrow('Ingestion failed');

    expect(dlqQueue.add).toHaveBeenCalledWith('failed-ingestion', expect.objectContaining({
      jobId: 'job-fail',
    }));
    expect(prisma.admin.kbSourceIndex.upsert).toHaveBeenCalled();
    const upsertCall = prisma.admin.kbSourceIndex.upsert.mock.calls[0][0];
    expect(upsertCall.update.status).toBe('failed');
  });
});

describe('ReindexService', () => {
  let service: ReindexService;
  let knowledgeService: jest.Mocked<KnowledgeService>;
  let dlqQueue: any;

  const validJobData = {
    tenantId: 'tenant-1',
    sourceType: 'communication',
    sourceId: 'comm-1',
    content: 'Reindex content.',
  };

  beforeEach(async () => {
    dlqQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReindexService,
        {
          provide: KnowledgeService,
          useValue: {
            reindexSource: jest.fn(),
          },
        },
        {
          provide: getQueueToken('kb:ingestion-dlq'),
          useValue: dlqQueue,
        },
      ],
    }).compile();

    service = module.get<ReindexService>(ReindexService);
    knowledgeService = module.get(KnowledgeService) as jest.Mocked<KnowledgeService>;
  });

  it('should process a valid reindex job', async () => {
    knowledgeService.reindexSource.mockResolvedValue({
      chunksCreated: 3,
      sourceId: 'comm-1',
      sourceType: 'communication',
    });

    const job = {
      id: 'reindex-1',
      data: validJobData,
    } as any;

    const result = await service.process(job);

    expect(result.reindexed).toBe(true);
    expect(knowledgeService.reindexSource).toHaveBeenCalledWith(
      'tenant-1', 'communication', 'comm-1', 'Reindex content.', undefined,
    );
  });

  it('should send failed reindex jobs to DLQ', async () => {
    knowledgeService.reindexSource.mockRejectedValue(new Error('Reindex failed'));

    const job = {
      id: 'reindex-fail',
      data: validJobData,
    } as any;

    await expect(service.process(job)).rejects.toThrow('Reindex failed');

    expect(dlqQueue.add).toHaveBeenCalledWith('failed-reindex', expect.objectContaining({
      jobId: 'reindex-fail',
    }));
  });
});
