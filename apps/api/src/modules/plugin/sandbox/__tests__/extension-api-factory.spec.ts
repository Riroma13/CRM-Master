import { ExtensionAPIFactory, DomainDeniedError } from '../extension-api.factory';
import { PermissionDeniedError } from '../permission-guard';

const TENANT_ID = 'tenant-1';
const PLUGIN_ID = 'plg-1';

describe('ExtensionAPIFactory', () => {
  describe('storage', () => {
    it('get throws PermissionDeniedError without storage:read', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['http:outbound'],
        allowedDomains: [],
      });
      await expect(api.storage.get('key')).rejects.toThrow(PermissionDeniedError);
    });

    it('set throws PermissionDeniedError without storage:write', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['storage:read'],
        allowedDomains: [],
      });
      await expect(api.storage.set('key', 'val')).rejects.toThrow(PermissionDeniedError);
    });

    it('delete throws PermissionDeniedError without storage:write', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['storage:read'],
        allowedDomains: [],
      });
      await expect(api.storage.delete('key')).rejects.toThrow(PermissionDeniedError);
    });

    it('list throws PermissionDeniedError without storage:read', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: [],
        allowedDomains: [],
      });
      await expect(api.storage.list()).rejects.toThrow(PermissionDeniedError);
    });

    it('succeeds with correct permissions', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['storage:read', 'storage:write'],
        allowedDomains: [],
      });
      await expect(api.storage.get('key')).resolves.toBeNull();
      await expect(api.storage.set('key', 'val')).resolves.toBeUndefined();
      await expect(api.storage.delete('key')).resolves.toBeUndefined();
      await expect(api.storage.list()).resolves.toEqual([]);
    });
  });

  describe('http', () => {
    it('get throws PermissionDeniedError without http:outbound', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: [],
        allowedDomains: [],
      });
      await expect(api.http.get('https://example.com/api')).rejects.toThrow(
        PermissionDeniedError,
      );
    });

    it('post throws PermissionDeniedError without http:outbound', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: [],
        allowedDomains: [],
      });
      await expect(api.http.post('https://example.com/api', {})).rejects.toThrow(
        PermissionDeniedError,
      );
    });

    it('throws DomainDeniedError for URL outside allowedDomains', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['http:outbound'],
        allowedDomains: ['https://api.example.com'],
      });
      await expect(api.http.get('https://evil.com/hack')).rejects.toThrow(DomainDeniedError);
    });

    it('succeeds for URL matching allowedDomains', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['http:outbound'],
        allowedDomains: ['https://api.example.com'],
      });
      const result = await api.http.get('https://api.example.com/v1/data');
      expect(result.status).toBe(200);
    });

    it('throws DomainDeniedError when allowedDomains is empty', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['http:outbound'],
        allowedDomains: [],
      });
      await expect(api.http.get('https://example.com')).rejects.toThrow(DomainDeniedError);
    });
  });

  describe('emit', () => {
    it('throws PermissionDeniedError without events:emit', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: [],
        allowedDomains: [],
      });
      await expect(api.emit('order.synced', {})).rejects.toThrow(PermissionDeniedError);
    });

    it('succeeds with events:emit permission', async () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: ['events:emit'],
        allowedDomains: [],
      });
      await expect(api.emit('order.synced', {})).resolves.toBeUndefined();
    });
  });

  describe('log', () => {
    it('does not throw without any permissions', () => {
      const api = ExtensionAPIFactory.create(TENANT_ID, PLUGIN_ID, {
        permissions: [],
        allowedDomains: [],
      });
      expect(() => api.log.info('test')).not.toThrow();
      expect(() => api.log.warn('test')).not.toThrow();
      expect(() => api.log.error('test')).not.toThrow();
    });
  });
});
