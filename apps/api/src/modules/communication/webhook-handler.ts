import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { CommunicationProvider, WebhookRequest } from "@shared/communication";
import { ProviderRegistry } from './providers/provider-registry';

@Injectable()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(private readonly providerRegistry: ProviderRegistry) {}

  async handle(providerId: string, request: WebhookRequest): Promise<void> {
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new NotFoundException(`Provider "${providerId}" not found`);
    }

    const isValid = provider.verifyWebhookSignature(request);
    if (!isValid) {
      throw new UnauthorizedException(`Invalid webhook signature for provider "${providerId}"`);
    }

    this.logger.log(`Valid webhook received from ${providerId}`);
    // Delivery status update logic would follow here
  }
}
