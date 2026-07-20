import { Injectable, Logger } from '@nestjs/common';
import { ConnectorRegistry } from '../connectors/connector-registry';
import type { WebhookRequest } from '@shared/communication';

@Injectable()
export class WebhookConsumer {
  private readonly logger = new Logger(WebhookConsumer.name);

  constructor(private readonly registry: ConnectorRegistry) {}

  async handle(providerId: string, request: WebhookRequest): Promise<{ status: string }> {
    const connector = this.registry.get(providerId);
    if (!connector) return { status: 'provider_not_found' };

    if (connector.verifyWebhookSignature) {
      const valid = connector.verifyWebhookSignature(request);
      if (!valid) return { status: 'signature_invalid' };
    }

    this.logger.log(`Webhook processed for ${providerId}`);
    return { status: 'processed' };
  }
}
