import { z } from 'zod';

export const Severity = z.enum(['info', 'warning', 'error', 'critical']);
export type Severity = z.infer<typeof Severity>;

export const Category = z.enum(['crm', 'scheduling', 'communication', 'automation', 'auth']);
export type Category = z.infer<typeof Category>;

export const ActivityEventEnvelopeSchema = z.object({
  eventType: z.string(),
  tenantId: z.string(),
  clienteId: z.string().optional(),
  entityType: z.string(),
  entityId: z.string().optional(),
  actor: z.string(),
  sourceModule: z.string(),
  severity: Severity,
  category: Category,
  payload: z.record(z.unknown()).default({}),
});

export type ActivityEventEnvelope = z.infer<typeof ActivityEventEnvelopeSchema>;
