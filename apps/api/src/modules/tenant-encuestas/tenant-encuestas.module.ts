import { Module } from '@nestjs/common'; import { TenantEncuestasController } from './tenant-encuestas.controller'; import { TenantEncuestasService } from './tenant-encuestas.service'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantEncuestasController], providers: [TenantEncuestasService, PrismaService] })
export class TenantEncuestasModule {}
