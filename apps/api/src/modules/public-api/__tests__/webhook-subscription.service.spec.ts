import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { SsrfValidator } from '../webhook/ssrf-validator.service';
import { WebhookSubscriptionService } from '../webhook/webhook-subscription.service';

describe('WebhookSubscriptionService', () => {
  let service: WebhookSubscriptionService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-whsub-0001';
  const VALID_URL = 'https://example.com/webhook';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        WebhookSubscriptionService,
        PrismaService,
        SsrfValidator,
      ],
    }).compile();

    service = moduleRef.get(WebhookSubscriptionService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.webhookSubscription.deleteMany({});
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    await prisma.admin.webhookSubscription.deleteMany({});
  });

  describe('createSubscription', () => {
    it('should create a subscription and return metadata without secret', async () => {
      const result = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['workflow.completed'],
      });

      expect(result.id).toBeDefined();
      expect(result.url).toBe(VALID_URL);
      expect(result.eventTypes).toEqual(['workflow.completed']);
      expect(result.active).toBe(true);
      expect((result as any).secret).toBeUndefined();
    });

    it('should store encrypted secret in DB', async () => {
      const result = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['document.created'],
      });

      const stored = await prisma.admin.webhookSubscription.findUnique({
        where: { id: result.id },
      });

      expect(stored).not.toBeNull();
      expect(stored!.secret).not.toBe('');
      expect(stored!.secret).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    });

    it('should accept multiple event types', async () => {
      const result = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['workflow.completed', 'document.created', 'document.updated'],
      });

      expect(result.eventTypes).toHaveLength(3);
      expect(result.eventTypes).toEqual(
        expect.arrayContaining(['workflow.completed', 'document.created', 'document.updated']),
      );
    });

    it('should reject URLs that fail SSRF validation', async () => {
      await expect(
        service.createSubscription({
          tenantId: TENANT_ID,
          url: 'http://10.0.0.1/webhook',
          eventTypes: ['workflow.completed'],
        }),
      ).rejects.toThrow('SSRF validation failed');
    });

    it('should reject private IP URLs', async () => {
      await expect(
        service.createSubscription({
          tenantId: TENANT_ID,
          url: 'https://192.168.1.1/webhook',
          eventTypes: ['workflow.completed'],
        }),
      ).rejects.toThrow('SSRF validation failed');
    });

    it('should store provided secret encrypted', async () => {
      const result = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['test.event'],
        secret: 'my-custom-secret',
      });

      const stored = await prisma.admin.webhookSubscription.findUnique({
        where: { id: result.id },
      });

      expect(stored).not.toBeNull();
      expect(stored!.secret).not.toBe('my-custom-secret');
      expect(stored!.secret).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    });

    it('should generate random secret when not provided', async () => {
      const result = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['test.event'],
      });

      const stored = await prisma.admin.webhookSubscription.findUnique({
        where: { id: result.id },
      });

      expect(stored).not.toBeNull();
      const decrypted = service.decryptSecret(stored!.secret);
      expect(decrypted).toHaveLength(64);
      expect(decrypted).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('listSubscriptions', () => {
    it('should return all active subscriptions for a tenant', async () => {
      await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['event.a'],
      });
      await service.createSubscription({
        tenantId: TENANT_ID,
        url: 'https://example.com/b',
        eventTypes: ['event.b'],
      });

      const list = await service.listSubscriptions(TENANT_ID);
      expect(list).toHaveLength(2);
    });

    it('should return subscriptions in desc createdAt order', async () => {
      const a = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['event.a'],
      });
      await new Promise((r) => setTimeout(r, 10));
      const b = await service.createSubscription({
        tenantId: TENANT_ID,
        url: 'https://example.com/b',
        eventTypes: ['event.b'],
      });

      const list = await service.listSubscriptions(TENANT_ID);
      expect(list[0].id).toBe(b.id);
    });

    it('should not return subscriptions from other tenants', async () => {
      await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['event.a'],
      });
      await service.createSubscription({
        tenantId: 'other-tenant',
        url: 'https://example.com/b',
        eventTypes: ['event.b'],
      });

      const list = await service.listSubscriptions(TENANT_ID);
      expect(list).toHaveLength(1);
    });

    it('should not return inactive subscriptions', async () => {
      const sub = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['event.a'],
      });

      await service.deleteSubscription(sub.id);

      const list = await service.listSubscriptions(TENANT_ID);
      expect(list).toHaveLength(0);
    });
  });

  describe('deleteSubscription', () => {
    it('should deactivate subscription (soft delete)', async () => {
      const sub = await service.createSubscription({
        tenantId: TENANT_ID,
        url: VALID_URL,
        eventTypes: ['event.a'],
      });

      await service.deleteSubscription(sub.id);

      const stored = await prisma.admin.webhookSubscription.findUnique({
        where: { id: sub.id },
      });
      expect(stored!.active).toBe(false);
    });
  });

  describe('encryptSecret / decryptSecret', () => {
    it('should encrypt and decrypt correctly', () => {
      const original = 'test-secret-value-12345';
      const encrypted = (service as any).encryptSecret(original);
      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertexts for same input', () => {
      const encrypted1 = (service as any).encryptSecret('same-secret');
      const encrypted2 = (service as any).encryptSecret('same-secret');
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle long secrets', () => {
      const long = 'x'.repeat(256);
      const encrypted = (service as any).encryptSecret(long);
      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(long);
    });
  });
});
