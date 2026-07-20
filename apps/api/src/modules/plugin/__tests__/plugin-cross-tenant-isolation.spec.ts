import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';

describe('Plugin Cross-Tenant Isolation', () => {
  let registryA: PluginRegistryService;
  let registryB: PluginRegistryService;
  let mockPluginA: jest.Mocked<{
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }>;
  let mockPluginB: jest.Mocked<{
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  }>;

  const TENANT_A = 'tenant-a-iso-001';
  const TENANT_B = 'tenant-b-iso-001';
  const PLUGIN_ID_A = 'plg-a-iso-001';
  const PLUGIN_ID_B = 'plg-b-iso-001';

  const manifestA = {
    name: 'plugin-a',
    version: '1.0.0',
    description: 'Plugin for Tenant A',
    author: 'tester',
    extensionApi: 'v1' as const,
    eventTypes: ['workflow.completed'],
    permissions: ['storage:read' as const],
    allowedDomains: [],
    schemaVersion: 1,
  };

  const manifestB = {
    name: 'plugin-b',
    version: '1.0.0',
    description: 'Plugin for Tenant B',
    author: 'tester',
    extensionApi: 'v1' as const,
    eventTypes: ['workflow.completed'],
    permissions: ['storage:read' as const],
    allowedDomains: [],
    schemaVersion: 1,
  };

  beforeAll(async () => {
    mockPluginA = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockPluginB = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const moduleA: TestingModule = await Test.createTestingModule({
      providers: [
        PluginRegistryService,
        {
          provide: PrismaService,
          useValue: { admin: { plugin: mockPluginA } },
        },
      ],
    }).compile();

    const moduleB: TestingModule = await Test.createTestingModule({
      providers: [
        PluginRegistryService,
        {
          provide: PrismaService,
          useValue: { admin: { plugin: mockPluginB } },
        },
      ],
    }).compile();

    registryA = moduleA.get(PluginRegistryService);
    registryB = moduleB.get(PluginRegistryService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tenant A cannot access Tenant B plugin data', () => {
    it('get() scopes query by tenantId', async () => {
      mockPluginA.findFirst.mockResolvedValue(null);

      const result = await registryA.get(TENANT_A, PLUGIN_ID_B);

      expect(result).toBeNull();
      expect(mockPluginA.findFirst).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID_B, tenantId: TENANT_A },
        include: { hooks: true },
      });
    });

    it('list() only returns own tenant plugins', async () => {
      mockPluginA.findMany.mockResolvedValue([
        {
          id: PLUGIN_ID_A,
          tenantId: TENANT_A,
          name: 'plugin-a',
          status: 'active',
          manifest: manifestA,
          version: '1.0.0',
          enabled: true,
          schemaVersion: 1,
          contentHash: 'abc',
          createdAt: new Date(),
          updatedAt: new Date(),
          hooks: [],
        },
      ]);

      const result = await registryA.list(TENANT_A);

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe(TENANT_A);
      expect(mockPluginA.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A },
        include: { hooks: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('getByEventType() scopes by tenantId', async () => {
      mockPluginA.findMany.mockResolvedValue([]);

      const result = await registryA.getByEventType(TENANT_A, 'workflow.completed');

      expect(result).toHaveLength(0);
      expect(mockPluginA.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_A,
          status: 'active',
          hooks: { some: { eventType: 'workflow.completed' } },
        },
        include: { hooks: true },
      });
    });

    it('Tenant B cannot unregister Tenant A plugin', async () => {
      mockPluginB.findFirst.mockResolvedValue(null);

      await expect(
        registryB.unregister(TENANT_B, PLUGIN_ID_A),
      ).rejects.toThrow('Plugin not found');

      expect(mockPluginB.findFirst).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID_A, tenantId: TENANT_B },
        select: { id: true },
      });
    });

    it('register creates plugin scoped to the calling tenant', async () => {
      mockPluginA.create.mockResolvedValue({ id: PLUGIN_ID_A });

      await registryA.register(TENANT_A, manifestA, 'hash-a');

      expect(mockPluginA.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          name: 'plugin-a',
        }),
      });

      jest.clearAllMocks();

      mockPluginB.create.mockResolvedValue({ id: PLUGIN_ID_B });

      await registryB.register(TENANT_B, manifestB, 'hash-b');

      expect(mockPluginB.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_B,
          name: 'plugin-b',
        }),
      });
    });
  });
});
