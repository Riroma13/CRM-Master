import { ConvertTrialSaga, type SagaContext } from '../subscription/convert-trial.saga';
import { StripeGateway } from '../payment/stripe-gateway';
import { StripeCircuitBreaker } from '../payment/stripe-circuit-breaker';
import { SubscriptionEngine } from '../subscription/subscription-engine';
import { PlanCatalogService } from '../plan/plan-catalog.service';

const mockStripeGateway = {
  createCustomer: jest.fn(),
  attachPaymentMethod: jest.fn(),
  createSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  deleteCustomer: jest.fn(),
  detachPaymentMethod: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  updateSubscription: jest.fn(),
} as any;

const mockSubscriptionEngine = {
  updateSubscriptionWithStripeIds: jest.fn(),
  updateStatus: jest.fn(),
  createSubscription: jest.fn(),
  getSubscription: jest.fn(),
  changePlan: jest.fn(),
  cancelSubscription: jest.fn(),
  getPlanPrice: jest.fn(),
} as any;

const mockPlanCatalogService = {
  getPlan: jest.fn(),
  listPlans: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
} as any;

describe('ConvertTrialSaga', () => {
  let saga: ConvertTrialSaga;
  let context: SagaContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripeGateway.createCustomer.mockResolvedValue({
      id: 'cus_123',
      email: 'tenant@example.com',
    });
    mockStripeGateway.attachPaymentMethod.mockResolvedValue({
      id: 'pm_123',
      customer: 'cus_123',
    });
    mockStripeGateway.createSubscription.mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
    });
    mockSubscriptionEngine.updateSubscriptionWithStripeIds.mockResolvedValue({
      tenantId: 'tenant-001',
      planId: 'plan-pro-001',
      status: 'active',
    } as any);

    saga = new ConvertTrialSaga(
      mockStripeGateway,
      mockSubscriptionEngine,
      mockPlanCatalogService,
    );
    context = {
      tenantId: 'tenant-001',
      planId: 'plan-pro-001',
      email: 'tenant@example.com',
      priceId: 'price_pro',
      stripeCustomerId: 'cus_123',
      paymentMethodId: 'pm_123',
    };
  });

  describe('execute - success path', () => {
    it('completes all 4 steps successfully', async () => {
      const result = await saga.execute(context);

      expect(result.success).toBe(true);
      expect(result.failedStep).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('returns context with stripe IDs on success', async () => {
      const ctx: SagaContext = {
        tenantId: 'tenant-001',
        planId: 'plan-pro-001',
        email: 'tenant@example.com',
        priceId: 'price_pro',
      };

      const result = await saga.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.context.tenantId).toBe('tenant-001');
    });
  });

  describe('execute - failure path', () => {
    it('fails at step 1 if createStripeCustomer fails', async () => {
      jest.spyOn(saga, 'stepCreateStripeCustomer').mockResolvedValue({
        success: false,
        error: 'Stripe API error',
      });

      const result = await saga.execute(context);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe(1);
      expect(result.error).toContain('Stripe API error');
    });

    it('runs compensation when step 2 fails', async () => {
      jest.spyOn(saga, 'stepAttachPaymentMethod').mockResolvedValue({
        success: false,
        error: 'Payment method invalid',
      });
      const compSpy = jest.spyOn(saga, 'compDeleteStripeCustomer');

      const result = await saga.execute(context);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe(2);
      expect(compSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-001' }),
      );
    });

    it('runs compensation when step 3 fails', async () => {
      jest.spyOn(saga, 'stepCreateStripeSubscription').mockResolvedValue({
        success: false,
        error: 'Subscription creation failed',
      });
      const compSpy = jest.spyOn(saga, 'compDeleteStripeCustomer');

      const result = await saga.execute(context);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe(3);
      expect(compSpy).toHaveBeenCalled();
    });

    it('runs all compensations when step 4 fails', async () => {
      jest.spyOn(saga, 'stepUpdateInHouseSubscription').mockResolvedValue({
        success: false,
        error: 'DB error',
      });
      const compCancel = jest.spyOn(saga, 'compCancelStripeSubscription');
      const compDelete = jest.spyOn(saga, 'compDeleteStripeCustomer');
      const compRevert = jest.spyOn(saga, 'compRevertToTrialing');

      const result = await saga.execute(context);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe(4);
      expect(compCancel).toHaveBeenCalled();
      expect(compDelete).toHaveBeenCalled();
      expect(compRevert).toHaveBeenCalled();
    });
  });

  describe('compensating actions', () => {
    it('compDeleteStripeCustomer does nothing when no customer ID', async () => {
      const ctx: SagaContext = { tenantId: 'tenant-001', planId: 'plan-pro-001', email: '', priceId: '' };
      await expect(
        saga.compDeleteStripeCustomer(ctx),
      ).resolves.not.toThrow();
    });

    it('compDetachPaymentMethod does nothing when no payment method ID', async () => {
      const ctx: SagaContext = { tenantId: 'tenant-001', planId: 'plan-pro-001', email: '', priceId: '' };
      await expect(
        saga.compDetachPaymentMethod(ctx),
      ).resolves.not.toThrow();
    });

    it('compCancelStripeSubscription does nothing when no subscription ID', async () => {
      const ctx: SagaContext = { tenantId: 'tenant-001', planId: 'plan-pro-001', email: '', priceId: '' };
      await expect(
        saga.compCancelStripeSubscription(ctx),
      ).resolves.not.toThrow();
    });
  });

  describe('each saga step', () => {
    it('stepCreateStripeCustomer returns success', async () => {
      mockStripeGateway.createCustomer.mockResolvedValue({
        id: 'cus_new',
        email: 'tenant@example.com',
      });

      const result = await saga.stepCreateStripeCustomer(context);
      expect(result.success).toBe(true);
    });

    it('stepAttachPaymentMethod returns success', async () => {
      mockStripeGateway.attachPaymentMethod.mockResolvedValue({
        id: 'pm_123',
        customer: 'cus_123',
      });

      const result = await saga.stepAttachPaymentMethod(context);
      expect(result.success).toBe(true);
    });

    it('stepCreateStripeSubscription returns success', async () => {
      mockPlanCatalogService.getPlan.mockResolvedValue({ trialDays: 14 });
      mockStripeGateway.createSubscription.mockResolvedValue({
        id: 'sub_new',
        customer: 'cus_123',
        status: 'active',
      });

      const result = await saga.stepCreateStripeSubscription(context);
      expect(result.success).toBe(true);
    });

    it('stepUpdateInHouseSubscription returns success', async () => {
      mockSubscriptionEngine.updateSubscriptionWithStripeIds.mockResolvedValue(
        {} as any,
      );

      const result = await saga.stepUpdateInHouseSubscription(context);
      expect(result.success).toBe(true);
    });
  });

  describe('saga crash handling', () => {
    it('handles unexpected errors with failedStep -1', async () => {
      jest
        .spyOn(saga, 'stepCreateStripeCustomer')
        .mockImplementation(() => {
          throw new Error('Unexpected crash');
        });

      const result = await saga.execute(context);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe(-1);
    });
  });
});
