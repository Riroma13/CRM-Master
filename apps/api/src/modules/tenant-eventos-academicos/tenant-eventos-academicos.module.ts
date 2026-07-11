import { Module } from '@nestjs/common'; import { TenantEventosAcademicosController } from './tenant-eventos-academicos.controller'; import { TenantEventosAcademicosService } from './tenant-eventos-academicos.service'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantEventosAcademicosController], providers: [TenantEventosAcademicosService, PrismaService] })
export class TenantEventosAcademicosModule {}
