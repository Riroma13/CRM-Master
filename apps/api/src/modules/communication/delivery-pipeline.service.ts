import { Injectable, Logger } from '@nestjs/common';
import type { SendMessageInput } from "@shared/communication";
import { ProviderRegistry } from './providers/provider-registry';
import { ProviderSelectionStrategyImpl } from './providers/provider-selection';

@Injectable()
export class DeliveryPipeline {
  private readonly logger = new Logger(DeliveryPipeline.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly providerSelection: ProviderSelectionStrategyImpl,
  ) {}

  async deliver(message: SendMessageInput): Promise<void> {
    const provider = await this.providerSelection.select(message.channel, message.tenantId);
    if (!provider) {
      this.logger.warn(`No provider found for channel ${message.channel} (tenant ${message.tenantId})`);
      return;
    }

    this.logger.log(`Delivering message ${message.messageId} via ${provider.id}/${message.channel}`);
    // Steps: render → sanitize → rate limit → send → retry → record → DLQ
    // Full pipeline implementation spans multiple providers
  }
}
