import { NodeType } from './node-types';
import { ServiceTaskContext, ServiceTaskResult } from './service-task-gateway';

export interface NodeExecutor<TConfig = Record<string, unknown>> {
  readonly type: NodeType;
  execute(context: WorkflowExecutionContext, config: TConfig): Promise<WorkflowExecutionResult>;
}

export interface WorkflowExecutionContext {
  instanceId: string;
  tenantId: string;
  nodeId: string;
  variables: Record<string, unknown>;
  correlationId?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  nextNodes?: string[];
  variables?: Record<string, unknown>;
  status?: 'completed' | 'suspended' | 'failed';
  error?: string;
}

export type NodeExecutorRegistry = Map<NodeType, NodeExecutor>;
