import type { V1WorkflowResponse } from '@shared/public-api';

export interface InternalWorkflow {
  id: string;
  name?: string;
  status: string;
  startedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

function toISO(value: Date | string | undefined | null, fallback: Date = new Date()): string {
  const resolved = value ?? fallback;
  if (typeof resolved === 'string') return resolved;
  return resolved.toISOString();
}

export function toV1(workflow: InternalWorkflow): V1WorkflowResponse {
  return {
    id: workflow.id,
    name: workflow.name ?? 'Unnamed Workflow',
    status: workflow.status,
    createdAt: toISO(workflow.createdAt ?? workflow.startedAt),
    updatedAt: toISO(workflow.updatedAt),
  };
}
