import { z } from 'zod';

export const AuditEventQuerySchema = z.object({
  tenantId: z.string(),
  actorType: z.enum(['user', 'system', 'integration', 'workflow', 'admin', 'api']).optional(),
  actorId: z.string().optional(),
  resourceType: z.enum(['user', 'role', 'permission', 'tenant', 'configuration', 'workflow', 'notification', 'document', 'integration', 'automation', 'communication', 'auth', 'api']).optional(),
  resourceId: z.string().optional(),
  action: z.enum(['create', 'read', 'update', 'delete', 'login', 'logout', 'authenticate', 'authorize', 'deny', 'assign', 'revoke', 'start', 'complete', 'fail', 'export', 'import', 'purge']).optional(),
  outcome: z.enum(['success', 'failure', 'denied', 'error']).optional(),
  correlationId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type AuditEventQuery = z.infer<typeof AuditEventQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface IntegrityVerificationResult {
  valid: boolean;
  firstBrokenAt?: string;
  totalVerified: number;
}
