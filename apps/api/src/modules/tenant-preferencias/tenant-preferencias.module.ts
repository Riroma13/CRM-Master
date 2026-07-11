import { Module } from '@nestjs/common'; import { TenantPreferenciasController } from './tenant-preferencias.controller'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantPreferenciasController], providers: [PrismaService] })
export class TenantPreferenciasModule {}
