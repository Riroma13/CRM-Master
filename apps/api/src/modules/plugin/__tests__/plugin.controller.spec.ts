import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PluginController } from '../plugin.controller';
import { PluginManagerService } from '../plugin-manager.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { PluginGuard } from '../guards/plugin.guard';

describe('PluginController', () => {
  let app: INestApplication;
  let mockManager: jest.Mocked<PluginManagerService>;
  let mockRegistry: jest.Mocked<PluginRegistryService>;

  const TENANT_ID = 'test-tenant-ctrl-001';
  const PLUGIN_ID = 'plg-ctrl-001';
  const mockPluginRecord = {
    id: PLUGIN_ID,
    tenantId: TENANT_ID,
    name: 'test-plugin',
    version: '1.0.0',
    manifest: { name: 'test-plugin', version: '1.0.0' },
    status: 'active',
    enabled: true,
    schemaVersion: 1,
    contentHash: 'abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
    hooks: [],
  };

  beforeAll(async () => {
    mockManager = {
      install: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      uninstall: jest.fn(),
    } as any;

    mockRegistry = {
      list: jest.fn(),
      get: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
      getByEventType: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        { provide: PluginManagerService, useValue: mockManager },
        { provide: PluginRegistryService, useValue: mockRegistry },
        PluginGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/plugins/install', () => {
    it('installs a plugin from uploaded package', async () => {
      mockManager.install.mockResolvedValue({ pluginId: PLUGIN_ID, status: 'active' });

      const buffer = Buffer.from('fake-package-content');
      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/install?tenantId=${TENANT_ID}`)
        .attach('package', buffer, 'plugin.tgz');

      expect(response.status).toBe(201);
      expect(response.body.pluginId).toBe(PLUGIN_ID);
      expect(response.body.status).toBe('active');
      expect(mockManager.install).toHaveBeenCalledWith(TENANT_ID, buffer);
    });

    it('returns 404 when no package file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/install?tenantId=${TENANT_ID}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/plugins/:id/activate', () => {
    it('activates a plugin', async () => {
      mockManager.activate.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/${PLUGIN_ID}/activate`)
        .send({ tenantId: TENANT_ID });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(mockManager.activate).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });
  });

  describe('POST /api/v1/plugins/:id/deactivate', () => {
    it('deactivates a plugin', async () => {
      mockManager.deactivate.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/${PLUGIN_ID}/deactivate`)
        .send({ tenantId: TENANT_ID });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(mockManager.deactivate).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });
  });

  describe('DELETE /api/v1/plugins/:id', () => {
    it('uninstalls a plugin', async () => {
      mockManager.uninstall.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/plugins/${PLUGIN_ID}`)
        .send({ tenantId: TENANT_ID });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(mockManager.uninstall).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });
  });

  describe('GET /api/v1/plugins', () => {
    it('lists all plugins for a tenant', async () => {
      mockRegistry.list.mockResolvedValue([mockPluginRecord]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/plugins')
        .query({ tenantId: TENANT_ID });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(PLUGIN_ID);
      expect(mockRegistry.list).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('GET /api/v1/plugins/:id', () => {
    it('gets plugin details', async () => {
      mockRegistry.get.mockResolvedValue(mockPluginRecord);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/plugins/${PLUGIN_ID}`)
        .query({ tenantId: TENANT_ID });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(PLUGIN_ID);
      expect(mockRegistry.get).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });

    it('returns 404 when plugin not found', async () => {
      mockRegistry.get.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/plugins/nonexistent`)
        .query({ tenantId: TENANT_ID });

      expect(response.status).toBe(404);
    });
  });

  describe('PluginGuard rejects requests without tenantId', () => {
    it('returns 403 when tenantId is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/plugins');

      expect(response.status).toBe(403);
    });
  });
});
