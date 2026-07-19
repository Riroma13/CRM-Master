import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ActivityTimelineModule],
  controllers: [EventosController],
  providers: [EventosService, PrismaService],
})
export class EventosModule {}
