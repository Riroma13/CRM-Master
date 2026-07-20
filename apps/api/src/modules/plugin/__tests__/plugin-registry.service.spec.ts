import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';

describe('PluginRegistryService', () => {
  let service: PluginRegistryService;
  let mockPlugin: jest.Mocked<{
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }>;

  const TENANT_ID = 'test-tenant-reg-001';
  const PLUGIN_ID = 'plg-001';

  const validManifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'tester',
    extensionApi: 'v1' as const,
    eventTypes: ['workflow.completed', 'document.created'],
    permissions: ['storage:read' as const],
    allowedDomains: [],
    schemaVersion: 1,
  };

  const mockPluginRecord = {
    id: PLUGIN_ID,
    tenantId: TENANT_ID,
    name: 'test-plugin',
    version: '1.0.0',
    manifest: validManifest,
    status: 'active',
    enabled: true,
    schemaVersion: 1,
    contentHash: 'abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
    hooks: [
      { id: 'hook-1', tenantId: TENANT_ID, pluginId: PLUGIN_ID, eventType: 'workflow.completed', handler: 'onEvent', priority: 0 },
      { id: 'hook-2', tenantId: TENANT_ID, pluginId: PLUGIN_ID, eventType: 'document.created', handler: 'onEvent', priority: 0 },
    ],
  };

  beforeAll(async () => {
    mockPlugin = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockPrisma = {
      admin: {
        plugin: mockPlugin,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginRegistryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PluginRegistryService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates a plugin with hooks and returns id', async () => {
      mockPlugin.create.mockResolvedValue({ id: PLUGIN_ID });

      const result = await service.register(TENANT_ID, validManifest, 'abc123');

      expect(result.id).toBe(PLUGIN_ID);
      expect(mockPlugin.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'test-plugin',
          version: '1.0.0',
          manifest: validManifest,
          contentHash: 'abc123',
          schemaVersion: 1,
          hooks: {
            create: [
              { tenantId: TENANT_ID, eventType: 'workflow.completed', handler: 'onEvent', priority: 0 },
              { tenantId: TENANT_ID, eventType: 'document.created', handler: 'onEvent', priority: 0 },
            ],
          },
        },
      });
    });

    it('creates one hook per eventType', async () => {
      mockPlugin.create.mockResolvedValue({ id: PLUGIN_ID });

      const manifest = { ...validManifest, eventTypes: ['a', 'b', 'c'] };
      await service.register(TENANT_ID, manifest, 'hash');

      const createCall = mockPlugin.create.mock.calls[0][0];
      expect(createCall.data.hooks.create).toHaveLength(3);
    });
  });

  describe('get', () => {
    it('returns plugin with hooks when found', async () => {
      mockPlugin.findFirst.mockResolvedValue(mockPluginRecord);

      const result = await service.get(TENANT_ID, PLUGIN_ID);

      expect(result).toEqual(mockPluginRecord);
      expect(mockPlugin.findFirst).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID, tenantId: TENANT_ID },
        include: { hooks: true },
      });
    });

    it('returns null when not found', async () => {
      mockPlugin.findFirst.mockResolvedValue(null);

      const result = await service.get(TENANT_ID, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all plugins for tenant', async () => {
      mockPlugin.findMany.mockResolvedValue([mockPluginRecord]);

      const result = await service.list(TENANT_ID);

      expect(result).toHaveLength(1);
      expect(mockPlugin.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        include: { hooks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by status when provided', async () => {
      mockPlugin.findMany.mockResolvedValue([]);

      await service.list(TENANT_ID, 'active');

      expect(mockPlugin.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, status: 'active' },
        include: { hooks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns empty array when no plugins', async () => {
      mockPlugin.findMany.mockResolvedValue([]);

      const result = await service.list(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe('getByEventType', () => {
    it('returns active plugins subscribed to the event', async () => {
      mockPlugin.findMany.mockResolvedValue([mockPluginRecord]);

      const result = await service.getByEventType(TENANT_ID, 'workflow.completed');

      expect(result).toHaveLength(1);
      expect(mockPlugin.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          status: 'active',
          hooks: { some: { eventType: 'workflow.completed' } },
        },
        include: { hooks: true },
      });
    });

    it('returns empty when no plugins match event', async () => {
      mockPlugin.findMany.mockResolvedValue([]);

      const result = await service.getByEventType(TENANT_ID, 'unknown.event');
      expect(result).toEqual([]);
    });
  });

  describe('unregister', () => {
    it('deletes the plugin when found', async () => {
      mockPlugin.findFirst.mockResolvedValue({ id: PLUGIN_ID });

      await service.unregister(TENANT_ID, PLUGIN_ID);

      expect(mockPlugin.delete).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID },
      });
    });

    it('throws NotFoundException when plugin not found', async () => {
      mockPlugin.findFirst.mockResolvedValue(null);

      await expect(service.unregister(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Plugin not found',
      );
    });
  });
});
