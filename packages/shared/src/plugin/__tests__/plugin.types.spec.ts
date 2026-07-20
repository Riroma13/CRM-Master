import { describe, it, expect } from 'vitest';
import type { PluginStatus, Permission, PluginManifest, PluginMetadata, EventEnvelope } from '../plugin.types';
import type { ExtensionAPIV1 } from '../extension-api-v1';
import { PluginManifestSchema, PermissionSchema, validatePluginManifest } from '../plugin-manifest.schema';

describe('Plugin types compile correctly', () => {
  it('PluginStatus accepts union values', () => {
    const statuses: PluginStatus[] = ['active', 'inactive', 'error'];
    expect(statuses).toHaveLength(3);
  });

  it('Permission accepts valid values', () => {
    const perms: Permission[] = [
      'storage:read',
      'storage:write',
      'http:outbound',
      'events:emit',
    ];
    expect(perms).toHaveLength(4);
  });

  it('PluginManifest valid shape', () => {
    const manifest: PluginManifest = {
      name: 'my-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'dev@example.com',
      extensionApi: 'v1',
      eventTypes: ['workflow.completed'],
      permissions: ['storage:read'],
    };
    expect(manifest.name).toBe('my-plugin');
    expect(manifest.extensionApi).toBe('v1');
  });

  it('PluginManifest with optional fields', () => {
    const manifest: PluginManifest = {
      name: 'full-plugin',
      version: '2.1.0',
      description: 'Full featured plugin',
      author: 'Acme Corp',
      extensionApi: 'v1',
      eventTypes: ['document.created', 'notification.sent'],
      permissions: ['storage:read', 'storage:write', 'http:outbound', 'events:emit'],
      allowedDomains: ['https://api.example.com'],
      schemaVersion: 2,
    };
    expect(manifest.allowedDomains).toHaveLength(1);
    expect(manifest.schemaVersion).toBe(2);
  });

  it('PluginMetadata valid shape', () => {
    const meta: PluginMetadata = {
      id: 'plg-1',
      tenantId: 'tenant-1',
      name: 'my-plugin',
      version: '1.0.0',
      manifest: {
        name: 'my-plugin',
        version: '1.0.0',
        description: 'desc',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: [],
      },
      status: 'active',
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    };
    expect(meta.id).toBe('plg-1');
    expect(meta.status).toBe('active');
  });

  it('PluginMetadata error status', () => {
    const meta: PluginMetadata = {
      id: 'plg-2',
      tenantId: 'tenant-1',
      name: 'broken-plugin',
      version: '1.0.0',
      manifest: {
        name: 'broken-plugin',
        version: '1.0.0',
        description: 'broken',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: [],
      },
      status: 'error',
      createdAt: '2026-07-20T12:00:00Z',
      updatedAt: '2026-07-20T12:00:00Z',
    };
    expect(meta.status).toBe('error');
  });

  it('EventEnvelope valid shape', () => {
    const event: EventEnvelope = {
      eventId: 'evt-1',
      eventType: 'workflow.completed',
      tenantId: 'tenant-1',
      timestamp: '2026-07-20T12:00:00Z',
      data: { workflowId: 'wf-1', status: 'completed' },
    };
    expect(event.eventId).toBeDefined();
    expect(event.data.workflowId).toBe('wf-1');
  });
});

describe('ExtensionAPIV1 type shape', () => {
  const mockApi: ExtensionAPIV1 = {
    storage: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
    emit: async () => {},
    http: { get: async () => ({ status: 200, data: null }), post: async () => ({ status: 200, data: null }) },
    log: { info: () => {}, warn: () => {}, error: () => {} },
  };

  it('Storage interface matches contract', () => {
    expect(typeof mockApi.storage.get).toBe('function');
    expect(typeof mockApi.storage.set).toBe('function');
    expect(typeof mockApi.storage.delete).toBe('function');
    expect(typeof mockApi.storage.list).toBe('function');
  });

  it('Http interface matches contract', () => {
    expect(typeof mockApi.http.get).toBe('function');
    expect(typeof mockApi.http.post).toBe('function');
  });

  it('Log interface matches contract', () => {
    expect(typeof mockApi.log.info).toBe('function');
    expect(typeof mockApi.log.warn).toBe('function');
    expect(typeof mockApi.log.error).toBe('function');
  });

  it('Emit function matches contract', () => {
    expect(typeof mockApi.emit).toBe('function');
  });
});

describe('PluginManifestSchema validation', () => {
  it('valid manifest passes', () => {
    const result = validatePluginManifest({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'dev@example.com',
      extensionApi: 'v1',
      eventTypes: ['workflow.completed'],
      permissions: ['storage:read'],
    });
    expect(result.name).toBe('my-plugin');
    expect(result.extensionApi).toBe('v1');
  });

  it('rejects missing name', () => {
    expect(() =>
      validatePluginManifest({
        version: '1.0.0',
        description: 'desc',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
      }),
    ).toThrow();
  });

  it('rejects invalid semver', () => {
    expect(() =>
      validatePluginManifest({
        name: 'my-plugin',
        version: 'not-semver',
        description: 'desc',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
      }),
    ).toThrow();
  });

  it('rejects wrong extensionApi version', () => {
    expect(() =>
      validatePluginManifest({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'desc',
        author: 'author',
        extensionApi: 'v2',
        eventTypes: ['workflow.completed'],
      }),
    ).toThrow();
  });

  it('rejects empty eventTypes', () => {
    expect(() =>
      validatePluginManifest({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'desc',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: [],
      }),
    ).toThrow();
  });

  it('rejects invalid permission', () => {
    expect(() =>
      validatePluginManifest({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'desc',
        author: 'author',
        extensionApi: 'v1',
        eventTypes: ['workflow.completed'],
        permissions: ['invalid:perm'],
      }),
    ).toThrow();
  });

  it('defaults permissions and allowedDomains', () => {
    const result = validatePluginManifest({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'desc',
      author: 'author',
      extensionApi: 'v1',
      eventTypes: ['workflow.completed'],
    });
    expect(result.permissions).toEqual([]);
    expect(result.allowedDomains).toEqual([]);
    expect(result.schemaVersion).toBe(1);
  });

  it('PermissionSchema validates all values', () => {
    expect(PermissionSchema.parse('storage:read')).toBe('storage:read');
    expect(PermissionSchema.parse('storage:write')).toBe('storage:write');
    expect(PermissionSchema.parse('http:outbound')).toBe('http:outbound');
    expect(PermissionSchema.parse('events:emit')).toBe('events:emit');
  });

  it('PermissionSchema rejects invalid value', () => {
    expect(() => PermissionSchema.parse('invalid')).toThrow();
  });
});
