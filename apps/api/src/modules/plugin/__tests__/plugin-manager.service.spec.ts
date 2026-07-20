import { Test, TestingModule } from '@nestjs/testing';
import * as zlib from 'zlib';
import * as path from 'path';
import { PrismaService } from '../../../common/prisma.service';
import { PluginValidatorService } from '../plugin-validator.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { PluginManagerService } from '../plugin-manager.service';

const TENANT_ID = 'test-tenant-mgr-001';
const PLUGIN_ID = 'plg-manager-001';

function createValidTgz(manifestOverrides: Record<string, unknown> = {}): Buffer {
  const manifest = {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'tester',
    extensionApi: 'v1',
    eventTypes: ['workflow.completed'],
    permissions: ['storage:read'],
    ...manifestOverrides,
  };

  const manifestJson = JSON.stringify(manifest);
  const manifestBuffer = Buffer.from(manifestJson, 'utf-8');

  const header = Buffer.alloc(512);
  header.write('manifest.json', 0, 100, 'utf-8');
  const sizeOctal = manifestBuffer.length.toString(8).padStart(11, '0');
  header.write(sizeOctal, 124, 12, 'utf-8');
  header[156] = 0x30;

  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
  header.write(checksumStr, 148, 8, 'utf-8');

  const paddedSize = Math.ceil(manifestBuffer.length / 512) * 512;
  const paddedContent = Buffer.alloc(paddedSize, 0);
  manifestBuffer.copy(paddedContent);

  const archive = Buffer.concat([header, paddedContent]);
  const header2 = Buffer.alloc(512, 0);
  const fullTar = Buffer.concat([archive, header2]);

  return zlib.gzipSync(fullTar);
}

describe('PluginManagerService', () => {
  let service: PluginManagerService;
  let mockValidator: jest.Mocked<PluginValidatorService>;
  let mockRegistry: jest.Mocked<PluginRegistryService>;
  let mockPrisma: { admin: { plugin: { update: jest.Mock } } };

  beforeAll(async () => {
    mockValidator = {
      validatePackage: jest.fn(),
      validateManifest: jest.fn(),
      checkName: jest.fn(),
    } as any;

    mockRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      getByEventType: jest.fn(),
      unregister: jest.fn(),
    } as any;

    mockPrisma = {
      admin: {
        plugin: {
          update: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginManagerService,
        { provide: PluginValidatorService, useValue: mockValidator },
        { provide: PluginRegistryService, useValue: mockRegistry },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PluginManagerService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('install', () => {
    const validTgz = createValidTgz();

    it('installs a valid plugin package', async () => {
      mockValidator.validatePackage.mockReturnValue(undefined);
      mockValidator.validateManifest.mockReturnValue({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'tester',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: ['storage:read'],
        allowedDomains: [],
        schemaVersion: 1,
      });
      mockValidator.checkName.mockResolvedValue(undefined);
      mockRegistry.register.mockResolvedValue({ id: PLUGIN_ID });

      const result = await service.install(TENANT_ID, validTgz);

      expect(result.pluginId).toBe(PLUGIN_ID);
      expect(result.status).toBe('active');

      expect(mockValidator.validatePackage).toHaveBeenCalledWith(validTgz);
      expect(mockValidator.validateManifest).toHaveBeenCalled();
      expect(mockValidator.checkName).toHaveBeenCalledWith(TENANT_ID, 'test-plugin');
      expect(mockRegistry.register).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ name: 'test-plugin' }),
        expect.any(String),
      );
    });

    it('rejects package that fails validation', async () => {
      mockValidator.validatePackage.mockImplementation(() => {
        throw new Error('Invalid package format');
      });

      await expect(service.install(TENANT_ID, Buffer.from([]))).rejects.toThrow(
        'Invalid package format',
      );
      expect(mockRegistry.register).not.toHaveBeenCalled();
    });

    it('rejects duplicate plugin name', async () => {
      mockValidator.validatePackage.mockReturnValue(undefined);
      mockValidator.validateManifest.mockReturnValue({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'tester',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: ['storage:read'],
        allowedDomains: [],
        schemaVersion: 1,
      });
      mockValidator.checkName.mockRejectedValue(new Error('already installed'));

      const tgz = createValidTgz();
      await expect(service.install(TENANT_ID, tgz)).rejects.toThrow('already installed');
      expect(mockRegistry.register).not.toHaveBeenCalled();
    });

    it('rejects package without manifest.json', async () => {
      const badTgz = zlib.gzipSync(Buffer.alloc(1024, 0));

      mockValidator.validatePackage.mockReturnValue(undefined);

      await expect(service.install(TENANT_ID, badTgz)).rejects.toThrow(
        'manifest.json not found',
      );
    });

    it('computes contentHash from package buffer', async () => {
      mockValidator.validatePackage.mockReturnValue(undefined);
      mockValidator.validateManifest.mockReturnValue({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'tester',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: ['storage:read'],
        allowedDomains: [],
        schemaVersion: 1,
      });
      mockValidator.checkName.mockResolvedValue(undefined);
      mockRegistry.register.mockResolvedValue({ id: PLUGIN_ID });

      const tgz = createValidTgz();
      await service.install(TENANT_ID, tgz);

      const crypto = require('crypto');
      const expectedHash = crypto.createHash('sha256').update(tgz).digest('hex');
      expect(mockRegistry.register).toHaveBeenCalledWith(
        TENANT_ID,
        expect.anything(),
        expectedHash,
      );
    });
  });

  describe('activate', () => {
    it('sets plugin status to active', async () => {
      mockRegistry.get.mockResolvedValue({ id: PLUGIN_ID });
      mockPrisma.admin.plugin.update.mockResolvedValue({});

      await service.activate(TENANT_ID, PLUGIN_ID);

      expect(mockRegistry.get).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
      expect(mockPrisma.admin.plugin.update).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID },
        data: { status: 'active' },
      });
    });

    it('throws when plugin not found', async () => {
      mockRegistry.get.mockResolvedValue(null);

      await expect(service.activate(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Plugin not found',
      );
    });
  });

  describe('deactivate', () => {
    it('sets plugin status to inactive', async () => {
      mockRegistry.get.mockResolvedValue({ id: PLUGIN_ID });
      mockPrisma.admin.plugin.update.mockResolvedValue({});

      await service.deactivate(TENANT_ID, PLUGIN_ID);

      expect(mockPrisma.admin.plugin.update).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID },
        data: { status: 'inactive' },
      });
    });

    it('throws when plugin not found', async () => {
      mockRegistry.get.mockResolvedValue(null);

      await expect(service.deactivate(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Plugin not found',
      );
    });
  });

  describe('uninstall', () => {
    it('deactivates, removes files, and unregisters plugin', async () => {
      mockRegistry.get.mockResolvedValue({ id: PLUGIN_ID });
      mockPrisma.admin.plugin.update.mockResolvedValue({});
      mockRegistry.unregister.mockResolvedValue(undefined);

      const fs = jest.requireActual('fs');
      const pluginDir = path.join(process.cwd(), 'data', 'plugins', TENANT_ID, PLUGIN_ID);
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'package'), 'test-content');

      await service.uninstall(TENANT_ID, PLUGIN_ID);

      expect(mockPrisma.admin.plugin.update).toHaveBeenCalledWith({
        where: { id: PLUGIN_ID },
        data: { status: 'inactive' },
      });
      expect(mockRegistry.unregister).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
      expect(fs.existsSync(pluginDir)).toBe(false);
    });

    it('handles missing plugin directory gracefully', async () => {
      mockRegistry.get.mockResolvedValue({ id: PLUGIN_ID });
      mockPrisma.admin.plugin.update.mockResolvedValue({});
      mockRegistry.unregister.mockResolvedValue(undefined);

      await expect(
        service.uninstall(TENANT_ID, 'plg-no-dir'),
      ).resolves.toBeUndefined();
    });
  });
});
