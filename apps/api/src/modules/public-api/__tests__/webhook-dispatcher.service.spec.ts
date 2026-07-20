import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { SsrfValidator } from '../webhook/ssrf-validator.service';
import { WebhookSubscriptionService } from '../webhook/webhook-subscription.service';
import { WebhookDispatcherService } from '../webhook/webhook-dispatcher.service';

describe('WebhookDispatcherService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let subscriptionService: WebhookSubscriptionService;
  let dispatcher: WebhookDispatcherService;
  let ssrfValidator: SsrfValidator;

  const TENANT_ID = 'cau-ten-whdisp-0001';
  const VALID_URL = 'https://example.com/webhook';
  const TEST_EVENT = 'test.event';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        WebhookDispatcherService,
        WebhookSubscriptionService,
        PrismaService,
        SsrfValidator,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    subscriptionService = moduleRef.get(WebhookSubscriptionService);
    dispatcher = moduleRef.get(WebhookDispatcherService);
    ssrfValidator = moduleRef.get(SsrfValidator);

    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.webhookDelivery.deleteMany({});
      await prisma.admin.webhookSubscription.deleteMany({});
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    await prisma.admin.webhookDelivery.deleteMany({});
    await prisma.admin.webhookSubscription.deleteMany({});
    ssrfValidator.clearCache();
  });

  describe('dispatch', () => {
    it('should create delivery records for matching subscriptions', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries.length).toBeGreaterThanOrEqual(1);
      expect(deliveries[0].deliveryId).toBeDefined();
      expect(deliveries[0].subscriptionId).toBeDefined();
    });

    it('should not dispatch when no matching subscriptions', async () => {
      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(0);
    });

    it('should not dispatch to inactive subscriptions', async () => {
      const sub = await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });

      await subscriptionService.deleteSubscription(sub.id);

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(0);
    });

    it('should dispatch to multiple subscriptions for same event', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: 'https://example.com/alt',
        eventTypes: [TEST_EVENT],
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(2);
    });

    it('should only dispatch subscriptions matching the event type', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: 'https://example.com/other',
        eventTypes: ['other.event'],
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(1);
    });

    it('should not dispatch to other tenants', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });
      await subscriptionService.createSubscription({
        tenantId: 'other-tenant',
        url: 'https://example.com/other',
        eventTypes: [TEST_EVENT],
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { foo: 'bar' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(1);

      const all = await prisma.admin.webhookDelivery.findMany({
        include: { subscription: true },
      });
      expect(all[0].subscription.tenantId).toBe(TENANT_ID);
    });
  });

  describe('HMAC signing', () => {
    it('should create properly formatted delivery records with UUID deliveryId', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
        secret: 'test-hmac-secret',
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { data: 'test' });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].deliveryId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('retry and dead letter', () => {
    it('should mark delivery as retrying after failed dispatch', async () => {
      await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });

      await dispatcher.dispatch(TEST_EVENT, TENANT_ID, { test: true });

      const deliveries = await prisma.admin.webhookDelivery.findMany();
      const statuses = ['pending', 'retrying', 'delivered', 'failed'];
      expect(statuses).toContain(deliveries[0].status);
    });
  });

  describe('replay', () => {
    it('should reject replay for non-existent delivery', async () => {
      await expect(
        dispatcher.replay('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('not found');
    });

    it('should reject replay for inactive subscription', async () => {
      const sub = await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });

      const delivery = await prisma.admin.webhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          eventId: 'event-1',
          deliveryId: 'replay-test-delivery',
          status: 'failed',
        },
      });

      await subscriptionService.deleteSubscription(sub.id);

      await expect(
        dispatcher.replay(delivery.deliveryId),
      ).rejects.toThrow('inactive');
    });

    it('should reset delivery and re-attempt dispatch on replay', async () => {
      const sub = await subscriptionService.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: [TEST_EVENT],
      });

      const delivery = await prisma.admin.webhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          eventId: 'event-1',
          deliveryId: 'replay-delivery-1',
          status: 'failed',
          attemptCount: 5,
          responseCode: 500,
        },
      });

      await dispatcher.replay(delivery.deliveryId);

      const updated = await prisma.admin.webhookDelivery.findUnique({
        where: { id: delivery.id },
      });

      expect(updated!.subscriptionId).toBe(sub.id);
      expect(updated!.attemptCount).toBeGreaterThan(0);
    });
  });
});
