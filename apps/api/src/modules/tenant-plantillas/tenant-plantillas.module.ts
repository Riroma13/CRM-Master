import { Module } from '@nestjs/common'; import { TenantPlantillasController } from './tenant-plantillas.controller'; import { TenantPlantillasService } from './tenant-plantillas.service'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantPlantillasController], providers: [TenantPlantillasService, PrismaService] })
export class TenantPlantillasModule {}
