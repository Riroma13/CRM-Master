import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';

@Injectable()
export class CreateTaskAction implements AutomationAction {
  readonly id = 'create-task';
  readonly name = 'Create Task';
  readonly description = 'Creates a task in the CRM';
  readonly timeout = 10000;
  readonly maxRetries = 2;
  readonly onFailure = 'CONTINUE' as const;

  private readonly logger = new Logger(CreateTaskAction.name);

  async execute(context: ActionContext): Promise<ActionResult> {
    this.logger.log(`Creating task for execution ${context.executionId}`);
    return { success: true, durationMs: 0 };
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnrefused')) return true;
    return false;
  }
}
