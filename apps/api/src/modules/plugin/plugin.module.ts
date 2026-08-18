import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaService } from '../../common/prisma.service';
import { WorkerPoolService } from './sandbox/worker-pool.service';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { PluginValidatorService } from './plugin-validator.service';
import { PluginManagerService } from './plugin-manager.service';
import { EventBridgeService } from './event-bridge/event-bridge.service';
import { PluginController } from './plugin.controller';
import { PluginGuard } from './guards/plugin.guard';
import { IdentityOrganizationGuard } from '../identity/identity-organization.guard';

@Module({
  imports: [IdentityModule],
  controllers: [PluginController],
  providers: [
    PrismaService,
    WorkerPoolService,
    PluginRegistryService,
    PluginValidatorService,
    PluginManagerService,
    EventBridgeService,
    PluginGuard,
    IdentityOrganizationGuard,
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
