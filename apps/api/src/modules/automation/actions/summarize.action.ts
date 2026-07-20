import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';
import { ProviderRegistry } from '../ai/provider-registry';
import { PromptSanitizerImpl } from '../prompt-sanitizer';
import { SecretStoreService } from '../secret-store.service';

@Injectable()
export class SummarizeAction implements AutomationAction {
  readonly id = 'summarize';
  readonly name = 'Summarize';
  readonly description = 'Summarizes text using an AI provider';
  readonly timeout = 60000;
  readonly maxRetries = 2;
  readonly onFailure = 'ABORT' as const;

  private readonly logger = new Logger(SummarizeAction.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly promptSanitizer: PromptSanitizerImpl,
    private readonly secretStore: SecretStoreService,
  ) {}

  async execute(context: ActionContext): Promise<ActionResult> {
    const providerId = (context.payload.provider as string) || 'openai';
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      return { success: false, error: `AI provider "${providerId}" not registered`, durationMs: 0 };
    }

    const text = (context.payload.text as string) || '';

    const sanitized = this.promptSanitizer.sanitize({
      system: 'Summarize the following text concisely.',
      messages: [{ role: 'user', content: text }],
    });

    const start = Date.now();
    try {
      const response = await provider.summarize(text, { model: context.payload.model as string });
      return { success: true, data: { summary: response.content }, durationMs: Date.now() - start };
    } catch (err) {
      return { success: false, error: (err as Error).message, durationMs: Date.now() - start };
    }
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('5') || msg.includes('rate_limit');
  }
}
