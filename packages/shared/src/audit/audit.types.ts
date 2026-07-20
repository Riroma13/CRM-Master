export type ActorType = 'user' | 'system' | 'integration' | 'workflow' | 'admin' | 'api';

export type ResourceType =
  | 'user' | 'role' | 'permission' | 'tenant' | 'configuration'
  | 'workflow' | 'notification' | 'document' | 'integration'
  | 'automation' | 'communication' | 'auth' | 'api';

export type Action =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'authenticate'
  | 'authorize' | 'deny'
  | 'assign' | 'revoke'
  | 'start' | 'complete' | 'fail'
  | 'export' | 'import' | 'purge';

export type Outcome = 'success' | 'failure' | 'denied' | 'error';

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorType: ActorType;
  actorId: string;
  actorName?: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  action: Action;
  outcome: Outcome;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}
