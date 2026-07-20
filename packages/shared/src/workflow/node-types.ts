export type NodeType =
  | 'start' | 'end' | 'service-task' | 'user-task'
  | 'decision' | 'parallel-split' | 'parallel-join'
  | 'timer' | 'event-wait' | 'sub-workflow' | 'compensation';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config?: Record<string, unknown>;
  next?: string[];
  defaultNext?: string;
  conditions?: Array<{ expression: string; next: string }>;
  compensation?: string;
  timeout?: number;
}
