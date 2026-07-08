import { Module } from '@nestjs/common';
import { TenantNotificacionesController } from './tenant-notificaciones.controller';
import { TenantNotificacionesService } from './tenant-notificaciones.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TenantNotificacionesController],
  providers: [TenantNotificacionesService, PrismaService],
})
export class TenantNotificacionesModule {}
