import type { ChannelType, Priority } from './notification.types';
import type { NotificationDefinition } from './definition.types';
import type { NotificationPreference } from './preference.types';

export interface NotificationInstanceRef {
  id: string;
  tenantId: string;
  definitionId: string;
  userId: string;
  status: string;
  channel?: string;
  priority: Priority;
  severity: string;
  content?: Record<string, unknown>;
  contentSnapshot?: Record<string, unknown>;
  idempotencyKey?: string;
  correlationId?: string;
  scheduledAt?: string;
  expiresAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  version: number;
}

export interface RoutingContext {
  notification: NotificationInstanceRef;
  definition: NotificationDefinition;
  preferences: NotificationPreference[];
  tenantId: string;
  userId: string;
}

export interface RoutingResult {
  channel: ChannelType;
  fallbackChannels: ChannelType[];
  priority: Priority;
  delay?: number;
  bypassQuietHours: boolean;
}

export interface RoutingStrategy {
  route(context: RoutingContext): Promise<RoutingResult>;
}

export interface BatchPolicy {
  shouldBatch(notification: NotificationInstanceRef): boolean;
  getBatchKey(notification: NotificationInstanceRef): string;
  getDigestSchedule(): string;
}

export interface DeliveryRequest {
  notificationId: string;
  tenantId: string;
  userId: string;
  channel: ChannelType;
  content: Record<string, unknown>;
  idempotencyKey: string;
  priority: Priority;
}

export interface DeliveryReceipt {
  notificationId: string;
  channel: ChannelType;
  status: 'delivered' | 'failed' | 'bounced';
  deliveredAt: string;
  providerMessageId?: string;
  error?: string;
}
