export type FailurePolicy = 'RETRY' | 'CONTINUE' | 'ABORT';

export interface ActionContext {
  executionId: string;
  stepId: string;
  tenantId: string;
  trigger: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ActionResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface AutomationAction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly timeout: number;
  readonly maxRetries: number;
  readonly onFailure: FailurePolicy;
  execute(context: ActionContext): Promise<ActionResult>;
  isRetryable(error: Error): boolean;
}
