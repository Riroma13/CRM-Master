import type { ChannelType, Priority, Severity } from './notification.types';

export interface RoutingRule {
  condition?: string;
  channel: ChannelType;
  priority?: Priority;
  fallbackChannels?: ChannelType[];
}

export interface NotificationTemplate {
  subject?: string;
  body: string;
  variables?: string[];
}

export interface NotificationDefinition {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  channels: ChannelType[];
  defaultPriority: Priority;
  defaultSeverity: Severity;
  routingRules: RoutingRule[];
  template?: NotificationTemplate;
  isPublished: boolean;
  bypassQuietHours?: boolean;
  version: number;
}
