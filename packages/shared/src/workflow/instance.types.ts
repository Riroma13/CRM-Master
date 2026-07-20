export type InstanceStatus = 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled' | 'compensated';

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  tenantId: string;
  status: InstanceStatus;
  correlationId?: string;
  version: number;
}
