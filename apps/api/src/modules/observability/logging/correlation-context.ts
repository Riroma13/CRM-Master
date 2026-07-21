import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationContext {
  correlationId: string;
  tenantId?: string;
}

export const correlationContext = new AsyncLocalStorage<CorrelationContext>();
