import { Module } from '@nestjs/common';
import { TenantWebhooksController } from './tenant-webhooks.controller';
import { TenantWebhooksService } from './tenant-webhooks.service';
import { WebhookTriggerService } from './webhook-trigger.service';
import { PrismaService } from '../../common/prisma.service';

@Module({ controllers: [TenantWebhooksController], providers: [TenantWebhooksService, WebhookTriggerService, PrismaService], exports: [WebhookTriggerService] })
export class TenantWebhooksModule {}
