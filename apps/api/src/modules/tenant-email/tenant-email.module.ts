import { Module } from '@nestjs/common'; import { TenantEmailController } from './tenant-email.controller'; import { NotificationsService } from '../notifications/notifications.service'; import { PrismaService } from '../../common/prisma.service'; import { CommunicationsService } from '../communications/communications.service';
@Module({ controllers: [TenantEmailController], providers: [NotificationsService, PrismaService, CommunicationsService] })
export class TenantEmailModule {}
