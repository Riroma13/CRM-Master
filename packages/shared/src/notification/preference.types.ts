import type { ChannelType, DigestFrequency } from './notification.types';

export interface QuietHours {
  start: string;
  end: string;
  timezone: string;
}

export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  category?: string;
  enabled: boolean;
  preferredChannels: ChannelType[];
  quietHours?: QuietHours;
  digestFrequency: DigestFrequency;
  timezone?: string;
  language?: string;
}
