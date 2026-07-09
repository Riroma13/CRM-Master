import { Module } from '@nestjs/common';
import { TenantModulesController } from './tenant-modules.controller';
import { TenantModulesService } from './tenant-modules.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantModulesController],
  providers: [TenantModulesService, PrismaService],
})
export class TenantModulesModule {}
