import { Module } from '@nestjs/common';
import { TenantHealthController } from './tenant-health.controller';
import { TenantHealthService } from './tenant-health.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantHealthController],
  providers: [TenantHealthService, PrismaService],
})
export class TenantHealthModule {}
