export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dlq';

export interface ConnectorConfig {
  id: string;
  tenantId: string;
  provider: string;
  name: string;
  authType: 'oauth' | 'api-key';
  isActive: boolean;
}

export interface ExecutionRecord {
  id: string;
  connectorId: string;
  tenantId: string;
  operation: string;
  status: ExecutionStatus;
  attempts: number;
  error?: string;
  dlq: boolean;
  createdAt: string;
}
