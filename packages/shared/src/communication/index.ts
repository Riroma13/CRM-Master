export type { CommunicationProvider, WebhookRequest, SendMessageInput, SendResult, DeliveryStatusValue, DeliveryStatus } from './provider.interface';
export type { CommunicationChannel } from './channel.interface';
export type { ChannelProviderConfig, ChannelProviderConfigStore, ProviderSelectionStrategy } from './provider-selection';
export type { DeliveryQueue } from './delivery-queue';
export type { CompiledTemplate, TemplateRenderer, SecureTemplateRenderer } from './template-renderer';
export type { ChannelOutputSanitizer } from './output-sanitizer';
export { SendMessageSchema, CreateTemplateSchema, UpdateTemplateSchema, TemplateListQuery, DeliveryQuery } from './dto';
export type { TemplateDefinition } from './dto';
