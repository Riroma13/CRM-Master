import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { WorkerPoolService } from './sandbox/worker-pool.service';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { PluginValidatorService } from './plugin-validator.service';
import { PluginManagerService } from './plugin-manager.service';
import { EventBridgeService } from './event-bridge/event-bridge.service';
import { PluginController } from './plugin.controller';
import { PluginGuard } from './guards/plugin.guard';

@Module({
  controllers: [PluginController],
  providers: [
    PrismaService,
    WorkerPoolService,
    PluginRegistryService,
    PluginValidatorService,
    PluginManagerService,
    EventBridgeService,
    PluginGuard,
  ],
  exports: [
    WorkerPoolService,
    PluginRegistryService,
    PluginValidatorService,
    PluginManagerService,
    EventBridgeService,
  ],
})
export class PluginModule {}
