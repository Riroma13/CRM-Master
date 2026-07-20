import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';
import { ProviderRegistry } from '../ai/provider-registry';
import { PromptSanitizerImpl } from '../prompt-sanitizer';

@Injectable()
export class ClassifyTicketAction implements AutomationAction {
  readonly id = 'classify-ticket';
  readonly name = 'Classify Ticket';
  readonly description = 'Classifies a support ticket using AI';
  readonly timeout = 30000;
  readonly maxRetries = 2;
  readonly onFailure = 'CONTINUE' as const;

  private readonly logger = new Logger(ClassifyTicketAction.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly promptSanitizer: PromptSanitizerImpl,
  ) {}

  async execute(context: ActionContext): Promise<ActionResult> {
    const providerId = (context.payload.provider as string) || 'openai';
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      return { success: false, error: `AI provider "${providerId}" not registered`, durationMs: 0 };
    }

    const input = (context.payload.ticketDescription as string) || '';
    const categories = (context.payload.categories as string[]) || ['bug', 'feature', 'support', 'billing'];

    const sanitized = this.promptSanitizer.sanitize({
      system: 'Classify the following ticket into one of the provided categories.',
      messages: [{ role: 'user', content: input }],
    });

    const start = Date.now();
    try {
      const result = await provider.classify(input, categories, { model: context.payload.model as string });
      return { success: true, data: { category: result.category, confidence: result.confidence }, durationMs: Date.now() - start };
    } catch (err) {
      return { success: false, error: (err as Error).message, durationMs: Date.now() - start };
    }
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('5');
  }
}
