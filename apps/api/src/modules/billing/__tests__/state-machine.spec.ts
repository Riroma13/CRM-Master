import {
  canTransition,
  isTerminal,
  isActive,
  assertValidTransition,
  TRANSITIONS,
} from '../subscription/state-machine';
import type { SubscriptionStatus } from '@shared/billing';

const ALL_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'pending',
  'active',
  'past_due',
  'grace_period',
  'suspended',
  'cancelled',
  'expired',
];

describe('State Machine', () => {
  describe('canTransition', () => {
    it('allows trialing → active', () => {
      expect(canTransition('trialing', 'active')).toBe(true);
    });

    it('allows trialing → cancelled', () => {
      expect(canTransition('trialing', 'cancelled')).toBe(true);
    });

    it('allows trialing → pending', () => {
      expect(canTransition('trialing', 'pending')).toBe(true);
    });

    it('allows pending → active', () => {
      expect(canTransition('pending', 'active')).toBe(true);
    });

    it('allows pending → trialing', () => {
      expect(canTransition('pending', 'trialing')).toBe(true);
    });

    it('allows pending → cancelled', () => {
      expect(canTransition('pending', 'cancelled')).toBe(true);
    });

    it('allows active → past_due', () => {
      expect(canTransition('active', 'past_due')).toBe(true);
    });

    it('allows active → cancelled', () => {
      expect(canTransition('active', 'cancelled')).toBe(true);
    });

    it('allows active → active (plan change)', () => {
      expect(canTransition('active', 'active')).toBe(true);
    });

    it('allows past_due → active', () => {
      expect(canTransition('past_due', 'active')).toBe(true);
    });

    it('allows past_due → cancelled', () => {
      expect(canTransition('past_due', 'cancelled')).toBe(true);
    });

    it('allows past_due → grace_period', () => {
      expect(canTransition('past_due', 'grace_period')).toBe(true);
    });

    it('allows grace_period → active', () => {
      expect(canTransition('grace_period', 'active')).toBe(true);
    });

    it('allows grace_period → expired', () => {
      expect(canTransition('grace_period', 'expired')).toBe(true);
    });

    it('allows grace_period → suspended', () => {
      expect(canTransition('grace_period', 'suspended')).toBe(true);
    });

    it('allows suspended → active', () => {
      expect(canTransition('suspended', 'active')).toBe(true);
    });

    it('allows suspended → expired', () => {
      expect(canTransition('suspended', 'expired')).toBe(true);
    });

    it('allows suspended → cancelled', () => {
      expect(canTransition('suspended', 'cancelled')).toBe(true);
    });
  });

  describe('illegal transitions', () => {
    it('rejects cancelled → anything', () => {
      for (const to of ALL_STATUSES) {
        if (to === 'cancelled') continue;
        expect(canTransition('cancelled', to)).toBe(false);
      }
    });

    it('rejects expired → anything', () => {
      for (const to of ALL_STATUSES) {
        if (to === 'expired') continue;
        expect(canTransition('expired', to)).toBe(false);
      }
    });

    it('rejects trialing → expired', () => {
      expect(canTransition('trialing', 'expired')).toBe(false);
    });

    it('rejects trialing → past_due', () => {
      expect(canTransition('trialing', 'past_due')).toBe(false);
    });

    it('rejects active → trialing', () => {
      expect(canTransition('active', 'trialing')).toBe(false);
    });

    it('rejects active → expired', () => {
      expect(canTransition('active', 'expired')).toBe(false);
    });

    it('rejects active → grace_period', () => {
      expect(canTransition('active', 'grace_period')).toBe(false);
    });

    it('rejects active → pending', () => {
      expect(canTransition('active', 'pending')).toBe(false);
    });

    it('rejects past_due → expired', () => {
      expect(canTransition('past_due', 'expired')).toBe(false);
    });

    it('rejects past_due → trialing', () => {
      expect(canTransition('past_due', 'trialing')).toBe(false);
    });

    it('rejects grace_period → cancelled', () => {
      expect(canTransition('grace_period', 'cancelled')).toBe(false);
    });

    it('rejects grace_period → past_due', () => {
      expect(canTransition('grace_period', 'past_due')).toBe(false);
    });

    it('rejects suspended → past_due', () => {
      expect(canTransition('suspended', 'past_due')).toBe(false);
    });

    it('rejects suspended → trialing', () => {
      expect(canTransition('suspended', 'trialing')).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('cancelled is terminal', () => {
      expect(isTerminal('cancelled')).toBe(true);
    });

    it('expired is terminal', () => {
      expect(isTerminal('expired')).toBe(true);
    });

    it('active is not terminal', () => {
      expect(isTerminal('active')).toBe(false);
    });

    it('trialing is not terminal', () => {
      expect(isTerminal('trialing')).toBe(false);
    });

    it('pending is not terminal', () => {
      expect(isTerminal('pending')).toBe(false);
    });

    it('past_due is not terminal', () => {
      expect(isTerminal('past_due')).toBe(false);
    });

    it('grace_period is not terminal', () => {
      expect(isTerminal('grace_period')).toBe(false);
    });

    it('suspended is not terminal', () => {
      expect(isTerminal('suspended')).toBe(false);
    });
  });

  describe('isActive', () => {
    it('active is active', () => {
      expect(isActive('active')).toBe(true);
    });

    it('trialing is active', () => {
      expect(isActive('trialing')).toBe(true);
    });

    it('cancelled is not active', () => {
      expect(isActive('cancelled')).toBe(false);
    });

    it('expired is not active', () => {
      expect(isActive('expired')).toBe(false);
    });
  });

  describe('assertValidTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() =>
        assertValidTransition('active', 'cancelled'),
      ).not.toThrow();
    });

    it('throws for invalid transition', () => {
      expect(() =>
        assertValidTransition('cancelled', 'active'),
      ).toThrow('Invalid subscription state transition: cancelled → active');
    });
  });

  describe('transition matrix completeness', () => {
    it('every status has an entry in TRANSITIONS', () => {
      for (const status of ALL_STATUSES) {
        expect(TRANSITIONS[status]).toBeDefined();
      }
    });

    it('every destination in TRANSITIONS is a valid status', () => {
      for (const [from, destinations] of Object.entries(TRANSITIONS)) {
        for (const to of destinations) {
          expect(ALL_STATUSES).toContain(to);
        }
      }
    });
  });
});
