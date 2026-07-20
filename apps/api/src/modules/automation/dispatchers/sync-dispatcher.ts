import { Injectable, Logger } from '@nestjs/common';
import type { AutomationDispatcher, ExecutionContext, ActionContext, AutomationAction } from '../../../../../../packages/shared/src/automation';

/**
 * SyncDispatcher — implementación síncrona de AutomationDispatcher.
 *
 * Ejecuta el pipeline de acciones secuencialmente en el mismo proceso.
 * Cada acción declara su propia política de fallo (RETRY/CONTINUE/ABORT),
 * timeout y clasificación de errores retryables.
 *
 * Engine → Dispatcher → Pipeline (action loop)
 */
@Injectable()
export class SyncDispatcher implements AutomationDispatcher {
  private readonly logger = new Logger(SyncDispatcher.name);
  // Map of actionId → AutomationAction, injected by the module
  private actionRegistry: Map<string, AutomationAction> = new Map();

  setActionRegistry(registry: Map<string, AutomationAction>): void {
    this.actionRegistry = registry;
  }

  async dispatch(execution: ExecutionContext): Promise<void> {
    this.logger.log(`Pipeline started: ${execution.executionId} (${execution.actions.length} actions)`);

    for (let i = 0; i < execution.actions.length; i++) {
      const actionId = execution.actions[i];
      const action = this.actionRegistry.get(actionId);
      if (!action) {
        this.logger.warn(`Action ${actionId} not found in registry — skipping`);
        continue;
      }

      const stepId = `${execution.executionId}-${actionId}-${i}`;
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), action.timeout);

      const context: ActionContext = {
        executionId: execution.executionId,
        stepId,
        tenantId: execution.tenantId,
        trigger: execution.trigger,
        payload: execution.payload,
        metadata: {},
        signal: abortController.signal,
      };

      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < action.maxRetries) {
        attempt++;
        try {
          const result = await action.execute(context);
          clearTimeout(timeout);

          if (result.success) {
            this.logger.log(`Step ${stepId} completed (attempt ${attempt})`);
            break;
          }

          lastError = new Error(result.error || 'Unknown error');

          if (!action.isRetryable(lastError)) {
            this.logger.warn(`Step ${stepId} failed with non-retryable error: ${lastError.message}`);
            break;
          }

          if (attempt >= action.maxRetries) {
            this.logger.error(`Step ${stepId} exhausted retries (${action.maxRetries})`);
            break;
          }

          // Exponential backoff
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          this.logger.warn(`Step ${stepId} failed (attempt ${attempt}), retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
        } catch (err) {
          clearTimeout(timeout);
          lastError = err instanceof Error ? err : new Error(String(err));

          if (!action.isRetryable(lastError)) {
            this.logger.warn(`Step ${stepId} threw non-retryable error: ${lastError.message}`);
            break;
          }

          if (attempt >= action.maxRetries) {
            this.logger.error(`Step ${stepId} exhausted retries with exception`);
            break;
          }

          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }

      clearTimeout(timeout);

      // Apply failure policy
      if (lastError && !action.isRetryable(lastError) && action.onFailure === 'ABORT') {
        this.logger.warn(`Pipeline aborted at step ${stepId} (onFailure: ABORT)`);
        return;
      }
      // CONTINUE: just go to next action
      // RETRY + exhausted: already handled above, continue to next action
    }

    this.logger.log(`Pipeline completed: ${execution.executionId}`);
  }
}
