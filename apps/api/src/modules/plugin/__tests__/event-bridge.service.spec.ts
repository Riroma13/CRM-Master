import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma.service';
import { WorkerPoolService } from '../sandbox/worker-pool.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { EventBridgeService } from '../event-bridge/event-bridge.service';

describe('EventBridgeService', () => {
  let service: EventBridgeService;
  let mockRegistry: jest.Mocked<PluginRegistryService>;
  let mockWorkerPool: jest.Mocked<WorkerPoolService>;
  let mockPrisma: { admin: { pluginEvent: { create: jest.Mock } } };
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const TENANT_ID = 'test-tenant-eb-001';
  const EVENT_TYPE = 'workflow.completed';
  const PAYLOAD = { tenantId: TENANT_ID, orderId: 'ord-123' };

  const activePlugin = {
    id: 'plg-eb-001',
    tenantId: TENANT_ID,
    name: 'event-plugin',
    status: 'active',
    version: '1.0.0',
    manifest: { eventTypes: [EVENT_TYPE] },
    enabled: true,
    schemaVersion: 1,
    contentHash: 'abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    hooks: [{ id: 'hook-1', tenantId: TENANT_ID, pluginId: 'plg-eb-001', eventType: EVENT_TYPE, handler: 'onEvent', priority: 0 }],
  };

  beforeAll(async () => {
    mockRegistry = {
      getByEventType: jest.fn(),
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      unregister: jest.fn(),
    } as any;

    mockWorkerPool = {
      execute: jest.fn(),
      acquire: jest.fn(),
      release: jest.fn(),
      shutdown: jest.fn(),
      poolSize: 0,
      activeCount: 0,
    } as any;

    mockPrisma = {
      admin: {
        pluginEvent: {
          create: jest.fn(),
        },
      },
    };

    mockEventEmitter = {
      on: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBridgeService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PluginRegistryService, useValue: mockRegistry },
        { provide: WorkerPoolService, useValue: mockWorkerPool },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(EventBridgeService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onEvent', () => {
    it('dispatches to matching active plugins', async () => {
      mockRegistry.getByEventType.mockResolvedValue([activePlugin]);
      mockWorkerPool.execute.mockResolvedValue(undefined);

      await service.onEvent(EVENT_TYPE, TENANT_ID, PAYLOAD);

      expect(mockRegistry.getByEventType).toHaveBeenCalledWith(TENANT_ID, EVENT_TYPE);
      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        activePlugin.id,
        'onEvent',
        { eventType: EVENT_TYPE, tenantId: TENANT_ID, payload: PAYLOAD },
      );
      expect(mockPrisma.admin.pluginEvent.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          pluginId: activePlugin.id,
          eventType: EVENT_TYPE,
          payload: PAYLOAD,
        },
      });
    });

    it('is a no-op when no plugins match', async () => {
      mockRegistry.getByEventType.mockResolvedValue([]);

      await service.onEvent(EVENT_TYPE, TENANT_ID, PAYLOAD);

      expect(mockRegistry.getByEventType).toHaveBeenCalledWith(TENANT_ID, EVENT_TYPE);
      expect(mockWorkerPool.execute).not.toHaveBeenCalled();
      expect(mockPrisma.admin.pluginEvent.create).not.toHaveBeenCalled();
    });

    it('isolates errors — one failed plugin does not stop others', async () => {
      const pluginA = { ...activePlugin, id: 'plg-a', name: 'plugin-a' };
      const pluginB = { ...activePlugin, id: 'plg-b', name: 'plugin-b' };

      mockRegistry.getByEventType.mockResolvedValue([pluginA, pluginB]);
      mockWorkerPool.execute
        .mockRejectedValueOnce(new Error('Plugin A crashed'))
        .mockResolvedValueOnce(undefined);

      await service.onEvent(EVENT_TYPE, TENANT_ID, PAYLOAD);

      expect(mockWorkerPool.execute).toHaveBeenCalledTimes(2);
      expect(mockPrisma.admin.pluginEvent.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.admin.pluginEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ pluginId: 'plg-b' }),
      });
    });

    it('handles event delivery logging failure gracefully', async () => {
      mockRegistry.getByEventType.mockResolvedValue([activePlugin]);
      mockWorkerPool.execute.mockResolvedValue(undefined);
      mockPrisma.admin.pluginEvent.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.onEvent(EVENT_TYPE, TENANT_ID, PAYLOAD),
      ).resolves.toBeUndefined();
    });

    it('dispatches to multiple matching plugins', async () => {
      const pluginA = { ...activePlugin, id: 'plg-mult-1', name: 'multi-a' };
      const pluginB = { ...activePlugin, id: 'plg-mult-2', name: 'multi-b' };

      mockRegistry.getByEventType.mockResolvedValue([pluginA, pluginB]);
      mockWorkerPool.execute.mockResolvedValue(undefined);

      await service.onEvent(EVENT_TYPE, TENANT_ID, PAYLOAD);

      expect(mockWorkerPool.execute).toHaveBeenCalledTimes(2);
      expect(mockPrisma.admin.pluginEvent.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeToPlatformEvents', () => {
    it('subscribes to known platform events on init', () => {
      service.onModuleInit();
      expect(mockEventEmitter.on).toHaveBeenCalled();
      expect(mockEventEmitter.on.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
