import { Module } from '@nestjs/common'; import { TenantPlanesController } from './tenant-planes.controller'; import { PrismaService } from '../../common/prisma.service';
@Module({ controllers: [TenantPlanesController], providers: [PrismaService] })
export class TenantPlanesModule {}
