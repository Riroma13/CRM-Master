// ─── JobStatus ──────────────────────────────────────────────────────────

export type JobStatus =
  | 'queued'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'dead_lettered';

// ─── JobPayload ─────────────────────────────────────────────────────────

export type JobPayload = Record<string, unknown>;

// ─── JobDefinitionDto ───────────────────────────────────────────────────

export interface JobDefinitionDto {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  concurrency: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── JobRunDto ──────────────────────────────────────────────────────────

export interface JobRunDto {
  id: string;
  tenantId: string;
  jobDefinitionId: string;
  status: JobStatus;
  payload: JobPayload;
  result?: JobPayload;
  error?: string;
  attempts: number;
  maxRetries: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  queueName: string;
  idempotencyKey?: string;
  createdAt: string;
}

// ─── JobScheduleDto ─────────────────────────────────────────────────────

export interface JobScheduleDto {
  id: string;
  tenantId: string;
  jobDefinitionId: string;
  cron: string;
  enabled: boolean;
  timezone: string;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
}
