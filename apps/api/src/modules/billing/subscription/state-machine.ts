import type { SubscriptionStatus } from '@shared/billing';

export const TRANSITIONS: Record<string, string[]> = {
  trialing: ['active', 'cancelled', 'pending'],
  pending: ['trialing', 'active', 'cancelled'],
  active: ['past_due', 'cancelled', 'active'],
  past_due: ['active', 'cancelled', 'grace_period'],
  grace_period: ['active', 'expired', 'suspended'],
  suspended: ['active', 'expired', 'cancelled'],
  cancelled: [],
  expired: [],
  incomplete: ['active', 'cancelled'],
};

export function canTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertValidTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid subscription state transition: ${from} → ${to}`,
    );
  }
}

export function isTerminal(status: SubscriptionStatus): boolean {
  return status === 'cancelled' || status === 'expired';
}

export function isActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}
