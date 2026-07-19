import { Module } from '@nestjs/common';
import { TenantPresupuestosController } from './tenant-presupuestos.controller';
import { TenantPresupuestosService } from './tenant-presupuestos.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { PrismaService } from '../../common/prisma.service';

@Module({ imports: [ActivityTimelineModule], controllers: [TenantPresupuestosController], providers: [TenantPresupuestosService, PrismaService] })
export class TenantPresupuestosModule {}
