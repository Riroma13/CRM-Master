import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ActivityTimelineController } from './activity-timeline.controller';
import { ActivityTimelineService } from './activity-timeline.service';
import { ActivityTimelineProcessor } from './activity-timeline.processor';
import { EnricherRegistryService } from './enrichment/enricher-registry.service';
import { EntityNameEnricher } from './enrichment/entity-name-enricher';
import { ActorNameEnricher } from './enrichment/actor-name-enricher';
import { EventTypeRegistryService } from './event-type-registry.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
      },
    }),
    BullModule.registerQueue(
      {
        name: 'activity-timeline:ingestion',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: 'activity-timeline:dlq',
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: true,
        },
      },
    ),
  ],
  controllers: [ActivityTimelineController],
  providers: [
    ActivityTimelineService,
    ActivityTimelineProcessor,
    EnricherRegistryService,
    EntityNameEnricher,
    ActorNameEnricher,
    EventTypeRegistryService,
    PrismaService,
  ],
  exports: [ActivityTimelineService],
})
export class ActivityTimelineModule {}
