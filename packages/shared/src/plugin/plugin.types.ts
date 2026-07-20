export type PluginStatus = 'active' | 'inactive' | 'error';

export type Permission = 'storage:read' | 'storage:write' | 'http:outbound' | 'events:emit';

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
