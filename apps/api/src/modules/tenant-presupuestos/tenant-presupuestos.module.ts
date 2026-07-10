import { Module } from '@nestjs/common';
import { TenantPresupuestosController } from './tenant-presupuestos.controller';
import { TenantPresupuestosService } from './tenant-presupuestos.service';
import { PrismaService } from '../../common/prisma.service';

@Module({ controllers: [TenantPresupuestosController], providers: [TenantPresupuestosService, PrismaService] })
export class TenantPresupuestosModule {}
