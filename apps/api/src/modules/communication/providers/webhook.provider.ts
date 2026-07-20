import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationProvider, SendMessageInput, SendResult, WebhookRequest } from '@shared/communication';
import * as crypto from 'crypto';

@Injectable()
export class WebhookCommunicationProvider implements CommunicationProvider {
  readonly id = 'webhook';
  readonly name = 'Webhook';
  readonly channels = ['webhook'];
  private readonly logger = new Logger(WebhookCommunicationProvider.name);

  async send(channel: string, message: SendMessageInput): Promise<SendResult> {
    this.logger.log(`Sending webhook to ${message.to}`);
    try {
      const response = await fetch(message.to as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((message as any).payload || message.body),
      });
      return {
        success: response.ok,
        externalId: `wh-${message.messageId}`,
        status: response.ok ? 'SENT' : 'FAILED',
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message, status: 'FAILED' };
    }
  }

  verifyWebhookSignature(request: WebhookRequest): boolean {
    const signature = request.headers['x-webhook-signature'];
    if (!signature) return false;

    try {
      const expected = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET || '')
        .update(JSON.stringify(request.body))
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
