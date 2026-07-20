import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AutomationController } from './automation.controller';
import { AutomationEngine } from './automation.service';
import { AutomationEventHandlers } from './automation.event-handlers';
import { SyncDispatcher } from './dispatchers/sync-dispatcher';
import { SecretStoreService } from './secret-store.service';
import { PromptSanitizerImpl } from './prompt-sanitizer';
import { ProviderRegistry } from './ai/provider-registry';
import { SendEmailAction } from './actions/send-email.action';
import { CreateTaskAction } from './actions/create-task.action';
import { WebhookAction } from './actions/webhook.action';
import { GenerateAIResponseAction } from './actions/generate-ai-response.action';
import { SummarizeAction } from './actions/summarize.action';
import { ClassifyTicketAction } from './actions/classify-ticket.action';

@Module({
  controllers: [AutomationController],
  providers: [
    AutomationEngine,
    AutomationEventHandlers,
    SyncDispatcher,
    SecretStoreService,
    PromptSanitizerImpl,
    ProviderRegistry,
    SendEmailAction,
    CreateTaskAction,
    WebhookAction,
    GenerateAIResponseAction,
    SummarizeAction,
    ClassifyTicketAction,
    PrismaService,
  ],
  exports: [
    AutomationEngine,
    SyncDispatcher,
    SecretStoreService,
    PromptSanitizerImpl,
    ProviderRegistry,
  ],
})
export class AutomationModule {}
