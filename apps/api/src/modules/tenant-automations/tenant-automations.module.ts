import { Module } from '@nestjs/common'; import { AutomationsController } from './automations.controller'; import { AutomationsService } from './automations.service'; import { PrismaService } from '../../common/prisma.service'; import { NotificationsService } from '../notifications/notifications.service'; import { WebhookTriggerService } from '../tenant-webhooks/webhook-trigger.service';
@Module({ controllers: [AutomationsController], providers: [AutomationsService, PrismaService, NotificationsService, WebhookTriggerService] })
export class TenantAutomationsModule {}
