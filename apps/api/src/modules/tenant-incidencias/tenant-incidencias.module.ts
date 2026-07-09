import { Module } from '@nestjs/common';
import { TenantIncidenciasController } from './tenant-incidencias.controller';
import { TenantIncidenciasService } from './tenant-incidencias.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantIncidenciasController],
  providers: [TenantIncidenciasService, PrismaService],
})
export class TenantIncidenciasModule {}
