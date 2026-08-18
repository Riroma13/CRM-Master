import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import { WorkerPoolService } from '../sandbox/worker-pool.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { EventBridgeService } from '../event-bridge/event-bridge.service';
import { PLUGIN_EXECUTION_DISABLED } from '@shared/plugin/plugin.types';

describe('EventBridgeService', () => {
  it('fails closed before registry, worker, or delivery effects', async () => {
    const registry = { getByEventType: jest.fn() };
    const pool = { execute: jest.fn() };
    const prisma = { admin: { pluginEvent: { create: jest.fn() } } };
    const module = await Test.createTestingModule({
      providers: [EventBridgeService,
        { provide: EventEmitter2, useValue: { on: jest.fn() } },
        { provide: PluginRegistryService, useValue: registry },
        { provide: WorkerPoolService, useValue: pool },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = module.get(EventBridgeService);

    await expect(service.onEvent('workflow.completed', 'tenant-a', {})).rejects.toMatchObject({
      response: { code: PLUGIN_EXECUTION_DISABLED }, status: 409,
    });
    expect(registry.getByEventType).not.toHaveBeenCalled();
    expect(pool.execute).not.toHaveBeenCalled();
    expect(prisma.admin.pluginEvent.create).not.toHaveBeenCalled();
  });

  it('fails closed on direct dispatch before worker, lookup, delivery, or error logging', async () => {
    const registry = { getByEventType: jest.fn() };
    const pool = { execute: jest.fn() };
    const prisma = { admin: { pluginEvent: { create: jest.fn() } } };
    const module = await Test.createTestingModule({
      providers: [EventBridgeService,
        { provide: EventEmitter2, useValue: { on: jest.fn() } },
        { provide: PluginRegistryService, useValue: registry },
        { provide: WorkerPoolService, useValue: pool },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = module.get(EventBridgeService) as unknown as {
      dispatchToPlugin: (plugin: { id: string; name: string; tenantId: string }, envelope: {
        eventType: string;
        tenantId: string;
        payload: Record<string, unknown>;
      }) => Promise<void>;
      logger: { error: jest.Mock };
    };
    service.logger.error = jest.fn();

    await expect(service.dispatchToPlugin(
      { id: 'plugin-a', name: 'Plugin A', tenantId: 'tenant-a' },
      { eventType: 'workflow.completed', tenantId: 'tenant-a', payload: {} },
    )).rejects.toMatchObject({
      response: { code: PLUGIN_EXECUTION_DISABLED },
      status: 409,
    });
    expect(pool.execute).not.toHaveBeenCalled();
    expect(registry.getByEventType).not.toHaveBeenCalled();
    expect(prisma.admin.pluginEvent.create).not.toHaveBeenCalled();
    expect(service.logger.error).not.toHaveBeenCalled();
  });

  it('does not subscribe platform events while execution is disabled', async () => {
    const emitter = { on: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [EventBridgeService,
        { provide: EventEmitter2, useValue: emitter },
        { provide: PluginRegistryService, useValue: {} },
        { provide: WorkerPoolService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    module.get(EventBridgeService).onModuleInit();
    expect(emitter.on).not.toHaveBeenCalled();
  });
});
