import { Module } from '@nestjs/common';
import { TenantClientesController } from './tenant-clientes.controller';
import { TenantClientesService } from './tenant-clientes.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantClientesController],
  providers: [TenantClientesService, PrismaService],
  exports: [TenantClientesService],
})
export class TenantClientesModule {}
