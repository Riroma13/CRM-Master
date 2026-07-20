export interface ExecutionContext {
  executionId: string;
  tenantId: string;
  ruleId: string;
  trigger: string;
  actions: string[];
  payload: Record<string, unknown>;
}

export interface AutomationDispatcher {
  dispatch(execution: ExecutionContext): Promise<void>;
}
