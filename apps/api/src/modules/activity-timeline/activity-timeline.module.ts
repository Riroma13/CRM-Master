import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ActivityTimelineController } from './activity-timeline.controller';
import { ActivityTimelineService } from './activity-timeline.service';
import { ActivityTimelineProcessor } from './activity-timeline.processor';
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
  providers: [ActivityTimelineService, ActivityTimelineProcessor, PrismaService],
  exports: [ActivityTimelineService],
})
export class ActivityTimelineModule {}
