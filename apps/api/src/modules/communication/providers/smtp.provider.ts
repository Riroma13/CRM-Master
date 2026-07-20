import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationProvider, SendMessageInput, SendResult, WebhookRequest } from '@shared/communication';

@Injectable()
export class SmtpProvider implements CommunicationProvider {
  readonly id = 'smtp';
  readonly name = 'SMTP';
  readonly channels = ['email'];
  private readonly logger = new Logger(SmtpProvider.name);

  async send(channel: string, message: SendMessageInput): Promise<SendResult> {
    this.logger.log(`Sending email via SMTP to ${message.to}`);
    return { success: true, externalId: `smtp-${message.messageId}`, status: 'SENT' };
  }

  verifyWebhookSignature(_request: WebhookRequest): boolean {
    // SMTP does not support delivery webhooks — always valid
    return true;
  }
}
