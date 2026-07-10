import { Module } from '@nestjs/common'; import { TenantPagosController } from './tenant-pagos.controller'; import { TenantPagosService } from './tenant-pagos.service'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantPagosController], providers: [TenantPagosService, PrismaService] })
export class TenantPagosModule {}
