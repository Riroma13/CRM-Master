import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { CommunicationEventHandlers } from './communication.event-handlers';
import { ProviderRegistry } from './providers/provider-registry';
import { DatabaseChannelProviderConfigStore } from './providers/channel-provider-config-store';
import { ProviderSelectionStrategyImpl } from './providers/provider-selection';
import { InMemoryDeliveryQueue } from './queue/in-memory-delivery-queue';
import { DeliveryPipeline } from './delivery-pipeline.service';
import { RateLimiter } from './rate-limiter';
import { DeadLetterQueueService } from './dlq.service';
import { WebhookHandler } from './webhook-handler';
import { SecureTemplateRendererImpl } from './templates/secure-template-renderer';
import { VariableValidator } from './templates/variable-validator';
import { EmailSanitizer } from './sanitizers/email-sanitizer';
import { SmsSanitizer } from './sanitizers/sms-sanitizer';
import { WhatsappSanitizer } from './sanitizers/whatsapp-sanitizer';
import { SmtpProvider } from './providers/smtp.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { TwilioWhatsAppProvider } from './providers/twilio-whatsapp.provider';
import { WebhookCommunicationProvider } from './providers/webhook.provider';

@Module({
  controllers: [CommunicationController],
  providers: [
    PrismaService,
    CommunicationService,
    CommunicationEventHandlers,
    ProviderRegistry,
    DatabaseChannelProviderConfigStore,
    ProviderSelectionStrategyImpl,
    InMemoryDeliveryQueue,
    DeliveryPipeline,
    RateLimiter,
    DeadLetterQueueService,
    WebhookHandler,
    SecureTemplateRendererImpl,
    VariableValidator,
    EmailSanitizer,
    SmsSanitizer,
    WhatsappSanitizer,
    SmtpProvider,
    SendGridProvider,
    TwilioSmsProvider,
    TwilioWhatsAppProvider,
    WebhookCommunicationProvider,
  ],
  exports: [
    CommunicationService,
    ProviderRegistry,
    DeliveryPipeline,
    RateLimiter,
    DeadLetterQueueService,
    WebhookHandler,
  ],
})
export class CommunicationModule implements OnModuleInit {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly smtpProvider: SmtpProvider,
    private readonly sendGridProvider: SendGridProvider,
    private readonly twilioSmsProvider: TwilioSmsProvider,
    private readonly twilioWhatsAppProvider: TwilioWhatsAppProvider,
    private readonly webhookProvider: WebhookCommunicationProvider,
  ) {}

  onModuleInit() {
    this.providerRegistry.register(this.smtpProvider);
    this.providerRegistry.register(this.sendGridProvider);
    this.providerRegistry.register(this.twilioSmsProvider);
    this.providerRegistry.register(this.twilioWhatsAppProvider);
    this.providerRegistry.register(this.webhookProvider);
  }
}
