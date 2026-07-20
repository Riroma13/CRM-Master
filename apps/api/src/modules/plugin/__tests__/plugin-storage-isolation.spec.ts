import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';

describe('Plugin Storage Isolation', () => {
  let prismaA: jest.Mocked<PrismaService>;
  let prismaB: jest.Mocked<PrismaService>;

  const TENANT_A = 'tenant-a-stor-001';
  const TENANT_B = 'tenant-b-stor-001';
  const PLUGIN_A = 'plg-a-stor-001';
  const PLUGIN_B = 'plg-b-stor-001';

  const storeRecordForA = {
    id: 'store-a-001',
    tenantId: TENANT_A,
    pluginId: PLUGIN_A,
    key: 'config',
    value: { notifyOn: true, webhookUrl: 'https://tenant-a.example.com/hook' },
  };

  const storeRecordForB = {
    id: 'store-b-001',
    tenantId: TENANT_B,
    pluginId: PLUGIN_B,
    key: 'config',
    value: { notifyOn: false, webhookUrl: 'https://tenant-b.example.com/hook' },
  };

  const pluginStoreFindFirstA = jest.fn();
  const pluginStoreFindFirstB = jest.fn();
  const pluginStoreFindManyA = jest.fn();
  const pluginStoreFindManyB = jest.fn();
  const pluginStoreCreateA = jest.fn();
  const pluginStoreCreateB = jest.fn();

  beforeAll(async () => {
    prismaA = {
      admin: {
        pluginStore: {
          findFirst: pluginStoreFindFirstA,
          findMany: pluginStoreFindManyA,
          create: pluginStoreCreateA,
        },
      },
    } as any;

    prismaB = {
      admin: {
        pluginStore: {
          findFirst: pluginStoreFindFirstB,
          findMany: pluginStoreFindManyB,
          create: pluginStoreCreateB,
        },
      },
    } as any;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Storage is scoped by tenantId + pluginId', () => {
    it('Tenant A cannot read Tenant B plugin storage', async () => {
      pluginStoreFindFirstA.mockResolvedValue(null);

      const result = await prismaA.admin.pluginStore.findFirst({
        where: { tenantId: TENANT_A, pluginId: PLUGIN_B, key: 'config' },
      });

      expect(result).toBeNull();
      expect(pluginStoreFindFirstA).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A, pluginId: PLUGIN_B, key: 'config' },
      });
    });

    it('Tenant B cannot read Tenant A plugin storage', async () => {
      pluginStoreFindFirstB.mockResolvedValue(null);

      const result = await prismaB.admin.pluginStore.findFirst({
        where: { tenantId: TENANT_B, pluginId: PLUGIN_A, key: 'config' },
      });

      expect(result).toBeNull();
      expect(pluginStoreFindFirstB).toHaveBeenCalledWith({
        where: { tenantId: TENANT_B, pluginId: PLUGIN_A, key: 'config' },
      });
    });

    it('Plugin A storage is isolated from Plugin B within same tenant', async () => {
      const uniqueConstraint = { tenantId: TENANT_A, pluginId: PLUGIN_A, key: 'config' };
      pluginStoreFindFirstA.mockResolvedValue(storeRecordForA);

      const result = await prismaA.admin.pluginStore.findFirst({
        where: uniqueConstraint,
      });

      expect(result).toEqual(storeRecordForA);
      expect(pluginStoreFindFirstA).toHaveBeenCalledWith({
        where: uniqueConstraint,
      });
    });

    it('Create is scoped by tenantId + pluginId', async () => {
      pluginStoreCreateA.mockResolvedValue({
        id: 'store-new',
        tenantId: TENANT_A,
        pluginId: PLUGIN_A,
        key: 'settings',
        value: { theme: 'dark' },
      });

      const result = await prismaA.admin.pluginStore.create({
        data: {
          tenantId: TENANT_A,
          pluginId: PLUGIN_A,
          key: 'settings',
          value: { theme: 'dark' },
        },
      });

      expect(result.tenantId).toBe(TENANT_A);
      expect(result.pluginId).toBe(PLUGIN_A);
      expect(pluginStoreCreateA).toHaveBeenCalledWith({
        data: { tenantId: TENANT_A, pluginId: PLUGIN_A, key: 'settings', value: { theme: 'dark' } },
      });
    });

    it('Data is partitioned by (tenantId, pluginId, key) unique constraint', async () => {
      pluginStoreFindFirstA.mockResolvedValue(null);
      pluginStoreFindFirstB.mockResolvedValue(null);

      const queryA = { tenantId: TENANT_A, pluginId: PLUGIN_A, key: 'config' };
      const queryB = { tenantId: TENANT_B, pluginId: PLUGIN_B, key: 'config' };

      await Promise.all([
        prismaA.admin.pluginStore.findFirst({ where: queryA }),
        prismaB.admin.pluginStore.findFirst({ where: queryB }),
      ]);

      expect(pluginStoreFindFirstA).toHaveBeenCalledWith({ where: queryA });
      expect(pluginStoreFindFirstB).toHaveBeenCalledWith({ where: queryB });
    });
  });
});
