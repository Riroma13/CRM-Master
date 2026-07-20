import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';

@Injectable()
export class WebhookAction implements AutomationAction {
  readonly id = 'webhook';
  readonly name = 'Execute Webhook';
  readonly description = 'Executes an HTTP webhook';
  readonly timeout = 30000;
  readonly maxRetries = 3;
  readonly onFailure = 'RETRY' as const;

  private readonly logger = new Logger(WebhookAction.name);

  async execute(context: ActionContext): Promise<ActionResult> {
    this.logger.log(`Executing webhook for execution ${context.executionId}`);
    return { success: true, durationMs: 0 };
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('5') || msg.includes('econnrefused')) return true;
    return false;
  }
}
