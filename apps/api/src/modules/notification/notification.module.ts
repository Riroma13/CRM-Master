import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PreferenceService } from './preferences/preference.service';
import { RoutingEngine } from './routing/routing-engine';
import { BatchingEngine } from './batching/batching-engine';
import { DeliveryOrchestrator } from './delivery/delivery-orchestrator';
import { NotificationGuard } from './guards/notification.guard';
import { PreferenceGuard } from './guards/preference.guard';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PreferenceService,
    RoutingEngine,
    BatchingEngine,
    DeliveryOrchestrator,
    NotificationGuard,
    PreferenceGuard,
    PrismaService,
  ],
  exports: [
    NotificationService,
    PreferenceService,
    RoutingEngine,
    BatchingEngine,
    DeliveryOrchestrator,
  ],
})
export class NotificationModule {}
