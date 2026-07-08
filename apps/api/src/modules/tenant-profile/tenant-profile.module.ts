import { Module } from '@nestjs/common';
import { TenantProfileController } from './tenant-profile.controller';
import { TenantProfileService } from './tenant-profile.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantProfileController],
  providers: [TenantProfileService, PrismaService],
})
export class TenantProfileModule {}
