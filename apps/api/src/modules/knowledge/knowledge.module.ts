import { Global, Module, OnModuleInit, Injectable } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ChunkingService } from './ingestion/chunking.service';
import { EmbeddingCache } from './embeddings/embedding-cache';
import { EmbeddingService } from './embeddings/embedding.service';
import { KnowledgeService } from './knowledge.service';
import { IngestionService, ReindexService } from './ingestion/ingestion.service';
import { GarbageCollectorService } from './ingestion/garbage-collector.service';
import { PrismaService } from '../../common/prisma.service';
import { RetrievalEngine } from './retrieval/retrieval-engine';
import { GenerationEngine } from './generation/generation-engine';
import { ProviderRegistry } from '../automation/ai/provider-registry';

@Injectable()
class GarbageCollectorScheduler implements OnModuleInit {
  constructor(
    @InjectQueue('kb:garbage-collector') private readonly queue: Queue,
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
        name: 'kb:ingestion',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: 'kb:reindex',
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
      {
        name: 'kb:garbage-collector',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: 10,
        },
      },
      {
        name: 'kb:ingestion-dlq',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
    ),
  ],
  providers: [
    ChunkingService,
    EmbeddingCache,
    EmbeddingService,
    KnowledgeService,
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
    RetrievalEngine,
    GenerationEngine,
  ],
})
export class KnowledgeModule {}
