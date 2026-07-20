// ─── Plan ─────────────────────────────────────────────────────────────

export type BillingPeriod = 'monthly' | 'yearly';

export type LimitType = 'hard' | 'soft';

export interface PlanLimit {
  metric: string;
  limit: number;
  overagePrice?: number;
  type: LimitType;
  warningThresholds?: number[];
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  pricingModel: string;
  limits: PlanLimit[];
  features: string[];
  trialDays: number;
  active: boolean;
}

// ─── Subscription ────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'trialing'
  | 'pending'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  pendingPlanId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelledAt?: string;
  gracePeriodEnd?: string;
  suspendedUntil?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// ─── Usage ───────────────────────────────────────────────────────────

export interface UsageMeter {
  id: string;
  tenantId: string;
  metric: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  overage: number;
  isFinalized: boolean;
}

// ─── Plan Limit Enforcement ──────────────────────────────────────────

export interface CheckLimitResult {
  allowed: boolean;
  metric: string;
  current: number;
  limit: number;
  remaining: number;
  type: LimitType;
}

// ─── Invoice ─────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'unpaid' | 'finalized' | 'paid' | 'failed' | 'void';

export interface InvoiceLine {
  description: string;
  amount: number;
  quantity?: number;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  planSnapshot?: unknown;
  subtotal: number;
  total: number;
  stripeInvoiceId?: string;
  paidAt?: string;
  dueDate: string;
}

// ─── StripeWebhookEvent ─────────────────────────────────────────────

export type WebhookEventStatus = 'pending' | 'processed' | 'failed' | 'ignored';

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: unknown;
  status: WebhookEventStatus;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
}

// ─── MeteringCollector ──────────────────────────────────────────────

export interface MeteringCollector {
  readonly metric: string;
  readonly limitType: LimitType;
  collect(tenantId: string, periodStart: Date, periodEnd: Date): Promise<number>;
}

// ─── PricingStrategy ────────────────────────────────────────────────

export interface PricingStrategy {
  calculate(plan: Plan, usage: UsageMeter[]): Promise<InvoiceLine[]>;
}
