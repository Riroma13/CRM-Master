import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService } from '../rate-limit/quota.service';
import { PrismaService } from '../../../common/prisma.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-quota-0001';
  const TENANT_B_ID = 'cau-ten-quota-0002';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [QuotaService, PrismaService],
    }).compile();

    service = moduleRef.get(QuotaService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.apiQuota.deleteMany({});
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    await prisma.admin.apiQuota.deleteMany({});
  });

  describe('checkQuota', () => {
    it('should return allowed for first request', async () => {
      const result = await service.checkQuota(TENANT_ID);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
      expect(result.limit).toBe(10000);
      expect(result.resetAt).toBeDefined();
    });

    it('should show increased usage after incrementUsage', async () => {
      await service.incrementUsage(TENANT_ID);
      await service.incrementUsage(TENANT_ID);

      const result = await service.checkQuota(TENANT_ID);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(2);
    });

    it('should return correct resetAt (first of next month)', async () => {
      const result = await service.checkQuota(TENANT_ID);
      const resetDate = new Date(result.resetAt);
      expect(resetDate.getDate()).toBe(1);
      expect(resetDate.getHours()).toBe(0);
      expect(resetDate.getMinutes()).toBe(0);
      expect(resetDate.getSeconds()).toBe(0);
      expect(resetDate.getMilliseconds()).toBe(0);
    });
  });

  describe('quota exceeded', () => {
    it('should block when used exceeds limit', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 5, usedThisMonth: 5, month: currentMonth },
        update: { monthlyLimit: 5, usedThisMonth: 5, month: currentMonth },
      });

      const result = await service.checkQuota(TENANT_ID);
      expect(result.allowed).toBe(false);
      expect(result.used).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should allow after incrementing up to but not exceeding limit', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 3, usedThisMonth: 2, month: currentMonth },
        update: { monthlyLimit: 3, usedThisMonth: 2, month: currentMonth },
      });

      const result = await service.checkQuota(TENANT_ID);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(2);
    });
  });

  describe('monthly reset', () => {
    it('should reset counter when month changes', async () => {
      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 10000, usedThisMonth: 9999, month: '1999-01' },
        update: { monthlyLimit: 10000, usedThisMonth: 9999, month: '1999-01' },
      });

      const result = await service.checkQuota(TENANT_ID);
      expect(result.allowed).toBe(true);
      expect(result.used).toBe(0);
    });

    it('should not reset when month is current', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await prisma.admin.apiQuota.upsert({
        where: { tenantId: TENANT_ID },
        create: { tenantId: TENANT_ID, monthlyLimit: 100, usedThisMonth: 50, month: currentMonth },
        update: { monthlyLimit: 100, usedThisMonth: 50, month: currentMonth },
      });

      const result = await service.checkQuota(TENANT_ID);
      expect(result.used).toBe(50);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usedThisMonth atomically', async () => {
      await service.incrementUsage(TENANT_ID);

      const quota = await prisma.admin.apiQuota.findUnique({ where: { tenantId: TENANT_ID } });
      expect(quota).not.toBeNull();
      expect(quota!.usedThisMonth).toBe(1);
    });

    it('should create quota record if not exists', async () => {
      await service.incrementUsage(TENANT_B_ID);

      const quota = await prisma.admin.apiQuota.findUnique({ where: { tenantId: TENANT_B_ID } });
      expect(quota).not.toBeNull();
      expect(quota!.usedThisMonth).toBe(1);
    });

    it('should handle concurrent increments', async () => {
      await Promise.all([
        service.incrementUsage(TENANT_ID),
        service.incrementUsage(TENANT_ID),
        service.incrementUsage(TENANT_ID),
      ]);

      const quota = await prisma.admin.apiQuota.findUnique({ where: { tenantId: TENANT_ID } });
      expect(quota!.usedThisMonth).toBe(3);
    });
  });
});
