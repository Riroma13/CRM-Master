import { Module } from '@nestjs/common';
import { TenantSistemasController } from './tenant-sistemas.controller';
import { TenantSistemasService } from './tenant-sistemas.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ActivityTimelineModule],
  controllers: [TenantSistemasController],
  providers: [TenantSistemasService, PrismaService],
})
export class TenantSistemasModule {}
