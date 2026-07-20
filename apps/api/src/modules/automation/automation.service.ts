import { Injectable, Logger } from '@nestjs/common';
import { SyncDispatcher } from './dispatchers/sync-dispatcher';
import { getTriggersByEvent } from '../../../../../packages/shared/src/automation';
import type { ExecutionContext } from '../../../../../packages/shared/src/automation';

/**
 * AutomationEngine — orquestador central del AI Automation Hub.
 *
 * Responsabilidades:
 * - Evaluar triggers y encontrar reglas activas.
 * - Verificar límite de concurrencia por tenant.
 * - Crear ExecutionContext y delegar en AutomationDispatcher.
 *
 * Dependencias:
 * - AutomationDispatcher (SyncDispatcher v1, BullMQDispatcher v2)
 * - TriggerRegistry (event → triggers)
 *
 * NO depende de acciones concretas ni de proveedores de IA.
 */
@Injectable()
export class AutomationEngine {
  private readonly logger = new Logger(AutomationEngine.name);
  private readonly tenantConcurrency = new Map<string, number>();

  // Default max concurrent executions per tenant
  private readonly defaultMaxConcurrent = 5;

  constructor(private readonly dispatcher: SyncDispatcher) {}

  /**
   * Evaluates a domain event and dispatches matching automation rules.
   */
  async evaluate(eventType: string, tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const triggers = getTriggersByEvent(eventType);
    if (triggers.length === 0) {
      this.logger.debug(`No triggers found for event: ${eventType}`);
      return;
    }

    if (!this.canExecute(tenantId)) {
      this.logger.warn(`Tenant ${tenantId} at concurrency limit — throttling execution`);
      return;
    }

    this.incrementConcurrency(tenantId);

    try {
      for (const trigger of triggers) {
        const executionId = crypto.randomUUID();
        const context: ExecutionContext = {
          executionId,
          tenantId,
          ruleId: `${trigger.id}-auto`,
          trigger: trigger.id,
          actions: [],  // resolved from rules in a full implementation
          payload,
        };

        this.logger.log(`Dispatching trigger ${trigger.id} (execution ${executionId})`);
        await this.dispatcher.dispatch(context);
      }
    } finally {
      this.decrementConcurrency(tenantId);
    }
  }

  /**
   * Verifica si el tenant puede ejecutar más automatizaciones.
   */
  canExecute(tenantId: string): boolean {
    const current = this.tenantConcurrency.get(tenantId) ?? 0;
    return current < this.defaultMaxConcurrent;
  }

  private incrementConcurrency(tenantId: string): void {
    const current = this.tenantConcurrency.get(tenantId) ?? 0;
    this.tenantConcurrency.set(tenantId, current + 1);
  }

  private decrementConcurrency(tenantId: string): void {
    const current = this.tenantConcurrency.get(tenantId) ?? 0;
    if (current <= 1) {
      this.tenantConcurrency.delete(tenantId);
    } else {
      this.tenantConcurrency.set(tenantId, current - 1);
    }
  }

  getConcurrency(tenantId: string): number {
    return this.tenantConcurrency.get(tenantId) ?? 0;
  }
}
