export interface ServiceTaskContext {
  instanceId: string;
  tenantId: string;
  nodeId: string;
  actionId: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ServiceTaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ServiceTaskGateway {
  execute(context: ServiceTaskContext): Promise<ServiceTaskResult>;
}
