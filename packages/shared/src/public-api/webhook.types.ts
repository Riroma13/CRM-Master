export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
  active: boolean;
}

export interface WebhookEvent {
  id: string;
  deliveryId: string;
  eventType: string;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  deliveryId: string;
  status: string;
  responseCode?: number;
  createdAt: string;
}
