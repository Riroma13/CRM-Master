export interface WebhookRequest {
  headers: Record<string, string>;
  body: unknown;
  rawBody?: string;
}

export interface CommunicationProvider {
  readonly id: string;
  readonly name: string;
  readonly channels: string[];
  send(channel: string, message: SendMessageInput): Promise<SendResult>;
  verifyWebhookSignature(request: WebhookRequest): boolean;
}

export interface SendMessageInput {
  messageId: string;
  tenantId: string;
  channel: string;
  to: string | string[];
  subject?: string;
  body: string;
  templateId?: string;
  variables?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
  status: DeliveryStatusValue;
}

export type DeliveryStatusValue =
  | 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED'
  | 'BOUNCED' | 'FAILED' | 'CLICKED' | 'OPENED';

export interface DeliveryStatus {
  deliveryId: string;
  status: DeliveryStatusValue;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  webhookReceivedAt?: string;
  updatedAt: string;
}
