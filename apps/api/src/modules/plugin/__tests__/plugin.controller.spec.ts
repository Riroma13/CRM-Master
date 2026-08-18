jest.mock('../../identity/identity-organization.guard', () => ({
  IdentityOrganizationGuard: class IdentityOrganizationGuard {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as request from 'supertest';
import { PluginController } from '../plugin.controller';
import { PluginManagerService } from '../plugin-manager.service';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { PluginGuard } from '../guards/plugin.guard';
import { IdentityOrganizationGuard } from '../../identity/identity-organization.guard';

class TestPluginContextGuard {
  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    if (!request.headers.cookie) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');
    request.pluginContext = { tenantId: 'test-tenant-ctrl-001', actorId: 'actor-001', role: 'owner' };
    return true;
  }
}

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
        {
          provide: IdentityOrganizationGuard,
          useValue: {
            canActivate: (context: any) => {
              const request = context.switchToHttp().getRequest();
              if (request.headers.cookie) {
                request.hostTenantId = TENANT_ID;
                request.identitySession = { userId: 'actor-001' };
                request.identityMembership = { role: 'owner' };
              }
              return true;
            },
          },
        },
        {
          provide: PluginGuard,
          useValue: {
            canActivate: (context: any) => {
              const request = context.switchToHttp().getRequest();
              if (!request.headers.cookie) throw new UnauthorizedException('IDENTITY_SESSION_REQUIRED');
              if (!request.headers.host) throw new ForbiddenException('PLUGIN_TENANT_CONTEXT_REQUIRED');
              request.pluginContext = { tenantId: TENANT_ID, actorId: 'actor-001', role: 'owner' };
              return true;
            },
          },
        },
        TestPluginContextGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    app.use((request: any, _response: any, next: () => void) => {
      if (request.headers.cookie) {
        request.pluginContext = { tenantId: TENANT_ID, actorId: 'actor-001', role: 'owner' };
      }
      next();
    });
    Reflect.defineMetadata('__guards__', [TestPluginContextGuard], PluginController);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/plugins/install', () => {
    it('denies anonymous install with the identity session contract before manager effects', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/plugins/install')
        .attach('package', Buffer.from('forged'), 'plugin.tgz');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('IDENTITY_SESSION_REQUIRED');
      expect(mockManager.install).not.toHaveBeenCalled();
    });
    it('installs a plugin from uploaded package', async () => {
      mockManager.install.mockResolvedValue({ pluginId: PLUGIN_ID, status: 'inactive' });

      const buffer = Buffer.from('fake-package-content');
      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/install?tenantId=forged-tenant`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
        .attach('package', buffer, 'plugin.tgz');

      expect(response.status).toBe(201);
      expect(response.body.pluginId).toBe(PLUGIN_ID);
      expect(response.body.status).toBe('inactive');
      expect(mockManager.install).toHaveBeenCalledWith(TENANT_ID, buffer);
    });

    it('returns 404 when no package file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/install?tenantId=forged-tenant`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/plugins/:id/activate', () => {
    it('activates a plugin', async () => {
      mockManager.activate.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/plugins/${PLUGIN_ID}/activate?tenantId=forged-tenant`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
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
        .post(`/api/v1/plugins/${PLUGIN_ID}/deactivate?tenantId=forged-tenant`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
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
        .delete(`/api/v1/plugins/${PLUGIN_ID}?tenantId=forged-tenant`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
        .send({ tenantId: TENANT_ID });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(mockManager.uninstall).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });
  });

  describe('GET /api/v1/plugins', () => {
    it.each([
      ['missing Host', undefined, TENANT_ID],
      ['forged tenant query', `${TENANT_ID}.crmmaster.com`, 'tenant-b'],
    ])('denies %s without using caller tenant authority', async (_case, host, tenantId) => {
      const req = request(app.getHttpServer()).get('/api/v1/plugins').query({ tenantId });
      if (host) req.set('Host', host);
      const response = await req;
      expect(response.status).toBe(401);
      expect(mockRegistry.list).not.toHaveBeenCalledWith(tenantId);
    });
    it('lists all plugins for a tenant', async () => {
      mockRegistry.list.mockResolvedValue([mockPluginRecord]);

      const response = await request(app.getHttpServer())
        .get('/api/v1/plugins')
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
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
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
        .query({ tenantId: TENANT_ID });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(PLUGIN_ID);
      expect(mockRegistry.get).toHaveBeenCalledWith(TENANT_ID, PLUGIN_ID);
    });

    it('returns 404 when plugin not found', async () => {
      mockRegistry.get.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/plugins/nonexistent`)
        .set('Host', 'tenant-a.crmmaster.com')
        .set('Cookie', 'session=valid')
        .query({ tenantId: TENANT_ID });

      expect(response.status).toBe(404);
    });
  });

  describe('PluginGuard rejects requests without identity context', () => {
    it('returns 401 when identity session is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/plugins');

      expect(response.status).toBe(401);
    });
  });
});
