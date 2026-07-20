export type NotificationStatus =
  | 'pending' | 'scheduled' | 'queued' | 'delivered'
  | 'failed' | 'cancelled' | 'expired' | 'read' | 'batched';

export type ChannelType = 'email' | 'sms' | 'push' | 'in-app' | 'webhook';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export type DigestFrequency = 'never' | 'daily' | 'weekly' | 'custom';
