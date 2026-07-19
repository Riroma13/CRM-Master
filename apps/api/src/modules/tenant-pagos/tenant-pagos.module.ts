import { Module } from '@nestjs/common'; import { TenantPagosController } from './tenant-pagos.controller'; import { TenantPagosService } from './tenant-pagos.service'; import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module'; import { PrismaService } from '../../common/prisma.service';
@Module({ imports: [ActivityTimelineModule], controllers: [TenantPagosController], providers: [TenantPagosService, PrismaService] })
export class TenantPagosModule {}
