import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { PluginValidatorService } from '../plugin-validator.service';

describe('PluginValidatorService', () => {
  let service: PluginValidatorService;
  let prisma: jest.Mocked<PrismaService>;

  const TENANT_ID = 'test-tenant-001';

  beforeAll(async () => {
    const mockPrisma = {
      admin: {
        plugin: {
          findFirst: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PluginValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PluginValidatorService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePackage', () => {
    it('accepts a valid tgz buffer', () => {
      const tgz = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(() => service.validatePackage(tgz)).not.toThrow();
    });

    it('accepts a valid zip buffer', () => {
      const zip = Buffer.alloc(30);
      zip.writeUInt32LE(0x04034b50, 0);
      expect(() => service.validatePackage(zip)).not.toThrow();
    });

    it('rejects buffer with unknown format', () => {
      const buffer = Buffer.from('not-a-valid-package');
      expect(() => service.validatePackage(buffer)).toThrow('Invalid package format');
    });

    it('rejects empty buffer', () => {
      const buffer = Buffer.alloc(0);
      expect(() => service.validatePackage(buffer)).toThrow('Invalid package format');
    });

    it('rejects package exceeding 10MB', () => {
      const size = 10 * 1024 * 1024 + 1;
      const buffer = Buffer.alloc(size);
      buffer[0] = 0x1f;
      buffer[1] = 0x8b;
      expect(() => service.validatePackage(buffer)).toThrow('exceeds maximum size');
    });

    it('accepts package exactly at 10MB', () => {
      const size = 10 * 1024 * 1024;
      const buffer = Buffer.alloc(size);
      buffer[0] = 0x1f;
      buffer[1] = 0x8b;
      expect(() => service.validatePackage(buffer)).not.toThrow();
    });
  });

  describe('validateManifest', () => {
    it('accepts a valid manifest', () => {
      const manifest = {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'test',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: ['storage:read'],
      };
      const result = service.validateManifest(manifest);
      expect(result.name).toBe('my-plugin');
      expect(result.version).toBe('1.0.0');
    });

    it('rejects manifest missing required fields', () => {
      const manifest = { name: 'my-plugin' };
      expect(() => service.validateManifest(manifest)).toThrow();
    });

    it('rejects manifest with invalid semver', () => {
      const manifest = {
        name: 'my-plugin',
        version: 'not-semver',
        description: 'A test plugin',
        author: 'test',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
      };
      expect(() => service.validateManifest(manifest)).toThrow();
    });

    it('rejects manifest with empty eventTypes', () => {
      const manifest = {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'test',
        extensionApi: 'v1',
        eventTypes: [],
      };
      expect(() => service.validateManifest(manifest)).toThrow();
    });

    it('rejects manifest with wrong extensionApi version', () => {
      const manifest = {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'test',
        extensionApi: 'v2',
        eventTypes: ['workflow.completed'],
      };
      expect(() => service.validateManifest(manifest)).toThrow();
    });

    it('sets default values for optional fields', () => {
      const manifest = {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: 'test',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
      };
      const result = service.validateManifest(manifest);
      expect(result.permissions).toEqual([]);
      expect(result.allowedDomains).toEqual([]);
      expect(result.schemaVersion).toBe(1);
    });
  });

  describe('checkName', () => {
    it('resolves when name is available', async () => {
      (prisma.admin.plugin.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.checkName(TENANT_ID, 'new-plugin')).resolves.toBeUndefined();
    });

    it('rejects when name is already taken', async () => {
      (prisma.admin.plugin.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(service.checkName(TENANT_ID, 'existing-plugin')).rejects.toThrow(
        'is already installed',
      );
    });

    it('scopes uniqueness check to the given tenant', async () => {
      (prisma.admin.plugin.findFirst as jest.Mock).mockResolvedValue(null);

      await service.checkName(TENANT_ID, 'my-plugin');

      expect(prisma.admin.plugin.findFirst).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, name: 'my-plugin' },
        select: { id: true },
      });
    });
  });
});
