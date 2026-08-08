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
import {
  ACTIVITY_TIMELINE_DLQ_QUEUE,
  ACTIVITY_TIMELINE_INGESTION_QUEUE,
  getActivityTimelineRedisConnectionOptions,
} from './activity-timeline-queue.constants';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getActivityTimelineRedisConnectionOptions(),
    }),
    BullModule.registerQueue(
      {
        name: ACTIVITY_TIMELINE_INGESTION_QUEUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      },
      {
        name: ACTIVITY_TIMELINE_DLQ_QUEUE,
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
