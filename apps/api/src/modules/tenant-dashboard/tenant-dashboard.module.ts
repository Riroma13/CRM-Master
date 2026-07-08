import { Module } from '@nestjs/common';
import { TenantDashboardController } from './tenant-dashboard.controller';
import { TenantDashboardService } from './tenant-dashboard.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantDashboardController],
  providers: [TenantDashboardService, PrismaService],
})
export class TenantDashboardModule {}
