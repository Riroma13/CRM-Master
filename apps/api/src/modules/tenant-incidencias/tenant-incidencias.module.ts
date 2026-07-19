import { Module } from '@nestjs/common';
import { TenantIncidenciasController } from './tenant-incidencias.controller';
import { TenantIncidenciasService } from './tenant-incidencias.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [ActivityTimelineModule],
  controllers: [TenantIncidenciasController],
  providers: [TenantIncidenciasService, PrismaService],
})
export class TenantIncidenciasModule {}
