import { z } from 'zod';

export const LifecycleTargetSchema = z.enum(['audit-events', 'document-trash']);
export type LifecycleTarget = z.infer<typeof LifecycleTargetSchema>;

const LifecycleScheduleSchema = z.object({
  schedule: z.string().min(1),
  enabled: z.boolean(),
}).strict();

export const AuditEventsLifecyclePolicySchema = LifecycleScheduleSchema.extend({
  target: z.literal('audit-events'),
});

export const DocumentTrashLifecyclePolicySchema = LifecycleScheduleSchema.extend({
  target: z.literal('document-trash'),
});

export const LifecyclePolicyInputSchema = z.discriminatedUnion('target', [
  AuditEventsLifecyclePolicySchema,
  DocumentTrashLifecyclePolicySchema,
]);
export type LifecyclePolicyInput = z.infer<typeof LifecyclePolicyInputSchema>;

export interface LifecycleExecutionContext {
  readonly tenantId: string;
  readonly actorId?: string;
  readonly organizationId?: string;
  readonly correlationId?: string;
  readonly idempotencyKey: string;
}

export const AUDIT_LIFECYCLE_TARGET_ADAPTER = Symbol('AUDIT_LIFECYCLE_TARGET_ADAPTER');
export const DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER = Symbol('DOCUMENT_TRASH_LIFECYCLE_TARGET_ADAPTER');

export interface LifecycleRunResult {
  readonly purgedCount: number;
}

export interface LifecycleTargetAdapter {
  readonly target: LifecycleTarget;
  execute(
    context: LifecycleExecutionContext,
    policy: LifecyclePolicyInput,
  ): Promise<LifecycleRunResult>;
}
