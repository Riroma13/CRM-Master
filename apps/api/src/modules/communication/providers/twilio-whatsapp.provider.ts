import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationProvider, SendMessageInput, SendResult, WebhookRequest } from '@shared/communication';
import * as crypto from 'crypto';

@Injectable()
export class TwilioWhatsAppProvider implements CommunicationProvider {
  readonly id = 'twilio-whatsapp';
  readonly name = 'Twilio WhatsApp';
  readonly channels = ['whatsapp'];
  private readonly logger = new Logger(TwilioWhatsAppProvider.name);

  async send(channel: string, message: SendMessageInput): Promise<SendResult> {
    this.logger.log(`Sending WhatsApp via Twilio to ${message.to}`);
    return { success: true, externalId: `tw-wa-${message.messageId}`, status: 'SENT' };
  }

  verifyWebhookSignature(request: WebhookRequest): boolean {
    const signature = request.headers['x-twilio-signature'];
    const url = request.headers['x-twilio-request-url'];
    if (!signature || !url) return false;

    try {
      const expected = crypto
        .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN || '')
        .update(url + (request.rawBody || ''))
        .digest('base64');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
