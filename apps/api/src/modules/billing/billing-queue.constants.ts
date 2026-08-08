export const BILLING_QUEUE_NAMES = {
  METERING: 'billing-metering',
  INVOICE: 'billing-invoice',
  STRIPE_WEBHOOKS: 'billing-stripe-webhooks',
} as const;

export const BILLING_QUEUE_IDENTITIES = Object.values(BILLING_QUEUE_NAMES);
