import { PermissionGuard, PermissionDeniedError } from './permission-guard';
import type { Permission, PluginManifest, ExtensionAPIV1 } from '@shared/plugin';

export class ExtensionAPIFactory {
  static create(
    tenantId: string,
    pluginId: string,
    manifest: Pick<PluginManifest, 'permissions' | 'allowedDomains'>,
  ): ExtensionAPIV1 {
    const guard = new PermissionGuard(manifest.permissions);
    const allowedDomains = manifest.allowedDomains ?? [];

    return {
      storage: {
        async get(key: string): Promise<unknown | null> {
          guard.require('storage:read');
          return null;
        },

        async set(key: string, value: unknown): Promise<void> {
          guard.require('storage:write');
        },

        async delete(key: string): Promise<void> {
          guard.require('storage:write');
        },

        async list(prefix?: string): Promise<string[]> {
          guard.require('storage:read');
          return [];
        },
      },

      async emit(eventType: string, payload: Record<string, unknown>): Promise<void> {
        guard.require('events:emit');
      },

      http: {
        async get(
          url: string,
          options?: Record<string, unknown>,
        ): Promise<{ status: number; data: unknown }> {
          guard.require('http:outbound');
          validateDomain(url, allowedDomains);
          return { status: 200, data: null };
        },

        async post(
          url: string,
          body: unknown,
          options?: Record<string, unknown>,
        ): Promise<{ status: number; data: unknown }> {
          guard.require('http:outbound');
          validateDomain(url, allowedDomains);
          return { status: 200, data: null };
        },
      },

      log: {
        info(message: string, meta?: Record<string, unknown>): void {},
        warn(message: string, meta?: Record<string, unknown>): void {},
        error(message: string, meta?: Record<string, unknown>): void {},
      },
    };
  }
}

export class DomainDeniedError extends Error {
  constructor(url: string, allowedDomains: string[]) {
    super(
      `Domain not allowed: ${url}. Allowed domains: ${allowedDomains.join(', ') || 'none'}`,
    );
    this.name = 'DomainDeniedError';
  }
}

function validateDomain(url: string, allowedDomains: string[]): void {
  if (allowedDomains.length === 0) {
    throw new DomainDeniedError(url, allowedDomains);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DomainDeniedError(url, allowedDomains);
  }

  const matches = allowedDomains.some(allowed => {
    const allowedUrl = new URL(allowed);
    return parsed.hostname === allowedUrl.hostname;
  });

  if (!matches) {
    throw new DomainDeniedError(url, allowedDomains);
  }
}
