import { Module } from '@nestjs/common';
import { ActivityTimelineController } from './activity-timeline.controller';
import { ActivityTimelineService } from './activity-timeline.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ActivityTimelineController],
  providers: [ActivityTimelineService, PrismaService],
  exports: [ActivityTimelineService],
})
export class ActivityTimelineModule {}
