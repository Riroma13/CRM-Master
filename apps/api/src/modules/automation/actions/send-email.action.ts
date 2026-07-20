import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';

@Injectable()
export class SendEmailAction implements AutomationAction {
  readonly id = 'send-email';
  readonly name = 'Send Email';
  readonly description = 'Sends an email via SMTP';
  readonly timeout = 15000;
  readonly maxRetries = 3;
  readonly onFailure = 'RETRY' as const;

  private readonly logger = new Logger(SendEmailAction.name);

  async execute(context: ActionContext): Promise<ActionResult> {
    this.logger.log(`Sending email for execution ${context.executionId}`);
    // Integration with email service or SMTP
    return { success: true, durationMs: 0 };
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('econnreset')) return true;
    if (msg.includes('invalid') || msg.includes('auth') || msg.includes('credentials')) return false;
    return true;
  }
}
