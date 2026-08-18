export const PLUGIN_EXECUTION_DISABLED = 'PLUGIN_EXECUTION_DISABLED' as const;

export type PluginStatus = 'active' | 'inactive' | 'error';

export type Permission = 'storage:read' | 'storage:write' | 'http:outbound' | 'events:emit';

export interface TrustedPluginContext {
  tenantId: string;
  actorId: string;
  role: 'owner' | 'admin';
}

export interface PluginExecutionDisabledContract {
  code: typeof PLUGIN_EXECUTION_DISABLED;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  extensionApi: string;
  eventTypes: string[];
  permissions: Permission[];
  allowedDomains?: string[];
  schemaVersion?: number;
}

export interface PluginMetadata {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  manifest: PluginManifest;
  status: PluginStatus;
  enabled: false;
  createdAt: string;
  updatedAt: string;
}

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
