import { Global, Module, OnModuleInit, Injectable } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChunkingService } from './ingestion/chunking.service';
import { EmbeddingCache } from './embeddings/embedding-cache';
import { EmbeddingService } from './embeddings/embedding.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeGuard } from './guards/knowledge.guard';
import { IngestionService, ReindexService } from './ingestion/ingestion.service';
import { GarbageCollectorService } from './ingestion/garbage-collector.service';
import { PrismaService } from '../../common/prisma.service';
import { RetrievalEngine } from './retrieval/retrieval-engine';
import { GenerationEngine } from './generation/generation-engine';
import { ProviderRegistry } from '../automation/ai/provider-registry';
import { KNOWLEDGE_QUEUE_NAMES } from './knowledge-queue.constants';

@Injectable()
class GarbageCollectorScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(KNOWLEDGE_QUEUE_NAMES.GARBAGE_COLLECTOR) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    const existing = await this.queue.getJobScheduler('daily-gc');
    if (!existing) {
      await this.queue.upsertJobScheduler(
        'daily-gc',
        { pattern: '0 0 * * *' },
        {
          name: 'collect',
          data: { dryRun: true },
          opts: { attempts: 1, removeOnComplete: true },
        },
      );
    }
  }
}

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: KNOWLEDGE_QUEUE_NAMES.INGESTION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: KNOWLEDGE_QUEUE_NAMES.REINDEX,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
      {
        name: KNOWLEDGE_QUEUE_NAMES.GARBAGE_COLLECTOR,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: 10,
        },
      },
      {
        name: KNOWLEDGE_QUEUE_NAMES.DLQ,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
    ),
  ],
  controllers: [KnowledgeController],
  providers: [
    ChunkingService,
    EmbeddingCache,
    EmbeddingService,
    KnowledgeService,
    KnowledgeGuard,
    IngestionService,
    ReindexService,
    GarbageCollectorService,
    GarbageCollectorScheduler,
    PrismaService,
    RetrievalEngine,
    GenerationEngine,
    ProviderRegistry,
  ],
  exports: [
    ChunkingService,
    EmbeddingCache,
    EmbeddingService,
    KnowledgeService,
    KnowledgeGuard,
    RetrievalEngine,
    GenerationEngine,
  ],
})
export class KnowledgeModule {}
