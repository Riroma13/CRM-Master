import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationProvider, SendMessageInput, SendResult, WebhookRequest } from '@shared/communication';
import * as crypto from 'crypto';

@Injectable()
export class SendGridProvider implements CommunicationProvider {
  readonly id = 'sendgrid';
  readonly name = 'SendGrid';
  readonly channels = ['email'];
  private readonly logger = new Logger(SendGridProvider.name);

  async send(channel: string, message: SendMessageInput): Promise<SendResult> {
    this.logger.log(`Sending email via SendGrid to ${message.to}`);
    return { success: true, externalId: `sg-${message.messageId}`, status: 'SENT' };
  }

  verifyWebhookSignature(request: WebhookRequest): boolean {
    const signature = request.headers['x-twilio-email-event-webhook-signature'];
    const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'];
    if (!signature || !timestamp) return false;

    try {
      const payload = `${timestamp}${JSON.stringify(request.body)}`;
      const expected = crypto
        .createHmac('sha256', process.env.SENDGRID_WEBHOOK_SECRET || '')
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
