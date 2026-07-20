import { z } from 'zod';
import type { Permission } from './plugin.types';

export const PermissionSchema = z.enum([
  'storage:read',
  'storage:write',
  'http:outbound',
  'events:emit',
]);

export const PluginManifestSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver'),
  description: z.string().min(1).max(1024),
  author: z.string().min(1).max(256),
  extensionApi: z.literal('v1'),
  eventTypes: z.array(z.string().min(1)).min(1, 'At least one event type required'),
  permissions: z.array(PermissionSchema).default([]),
  allowedDomains: z.array(z.string().url()).optional().default([]),
  schemaVersion: z.number().int().positive().optional().default(1),
});

export type PluginManifestInput = z.input<typeof PluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof PluginManifestSchema>;

export function validatePluginManifest(data: unknown): PluginManifestOutput {
  return PluginManifestSchema.parse(data);
}
