import { Module } from '@nestjs/common';
import { TenantSistemasController } from './tenant-sistemas.controller';
import { TenantSistemasService } from './tenant-sistemas.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantSistemasController],
  providers: [TenantSistemasService, PrismaService],
})
export class TenantSistemasModule {}
