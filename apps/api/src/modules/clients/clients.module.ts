import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ActivityTimelineModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
