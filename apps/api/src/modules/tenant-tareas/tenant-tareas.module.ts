import { Module } from '@nestjs/common';
import { TenantTareasController } from './tenant-tareas.controller';
import { TenantTareasService } from './tenant-tareas.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantTareasController],
  providers: [TenantTareasService, PrismaService],
})
export class TenantTareasModule {}
