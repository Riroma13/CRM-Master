import { Injectable, Logger } from '@nestjs/common';
import type { AutomationAction, ActionContext, ActionResult } from '../../../../../../packages/shared/src/automation';
import { ProviderRegistry } from '../ai/provider-registry';
import { PromptSanitizerImpl } from '../prompt-sanitizer';
import { SecretStoreService } from '../secret-store.service';
import * as crypto from 'crypto';

@Injectable()
export class GenerateAIResponseAction implements AutomationAction {
  readonly id = 'generate-ai-response';
  readonly name = 'Generate AI Response';
  readonly description = 'Generates a response using an AI provider';
  readonly timeout = 60000;
  readonly maxRetries = 2;
  readonly onFailure = 'ABORT' as const;

  private readonly logger = new Logger(GenerateAIResponseAction.name);

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

    const apiKey = await this.secretStore.get(context.tenantId, `${providerId}_api_key`);
    if (!apiKey) {
      return { success: false, error: `API key for "${providerId}" not configured`, durationMs: 0 };
    }

    const prompt = {
      system: (context.payload.systemPrompt as string) || 'You are a helpful CRM assistant.',
      messages: [{ role: 'user' as const, content: (context.payload.message as string) || '' }],
    };

    const validation = this.promptSanitizer.validate(prompt);
    if (!validation.valid) {
      return { success: false, error: `Prompt validation failed: ${validation.errors.join(', ')}`, durationMs: 0 };
    }

    const sanitizedPrompt = this.promptSanitizer.sanitize(prompt);
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${context.executionId}:${context.stepId}:${JSON.stringify(sanitizedPrompt)}`)
      .digest('hex');

    const start = Date.now();
    try {
      const response = await provider.generate(sanitizedPrompt, {
        idempotencyKey,
        timeout: this.timeout,
      });
      return { success: true, data: { content: response.content }, durationMs: Date.now() - start };
    } catch (err) {
      this.logger.error(`AI generation failed: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message, durationMs: Date.now() - start };
    }
  }

  isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('5') || msg.includes('rate_limit')) return true;
    return false;
  }
}
