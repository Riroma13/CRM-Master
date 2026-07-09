import { Module } from '@nestjs/common';
import { TenantRecursosController } from './tenant-recursos.controller';
import { TenantRecursosService } from './tenant-recursos.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantRecursosController],
  providers: [TenantRecursosService, PrismaService],
})
export class TenantRecursosModule {}
