import { WorkflowNode } from './node-types';

export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  startNode: string;
  isPublished: boolean;
}
