import { Test, TestingModule } from '@nestjs/testing';
import { SecurityPolicyService } from '../security-policy.service';
import { PrismaService } from '../../../../common/prisma.service';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [SecurityPolicyService, PrismaService],
  }).compile();

  const service = moduleRef.get(SecurityPolicyService);
  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();
  return { moduleRef, service, prisma };
}

async function resetTestData(prisma: PrismaService) {
  await prisma.admin.securityPolicy.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('SecurityPolicyService', () => {
  let service: SecurityPolicyService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'policy-tenant-0000-0000-0000-000000000001';
  const T_ID_2 = 'policy-tenant-0000-0000-0000-000000000002';

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());
    await resetTestData(prisma);
    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'policy-test-tenant', name: 'Policy Test Tenant' },
    });
    await prisma.admin.tenant.create({
      data: { id: T_ID_2, slug: 'policy-test-tenant-2', name: 'Policy Test Tenant 2' },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  afterEach(async () => {
    await prisma.admin.securityPolicy.deleteMany({ where: { tenantId: { in: [T_ID, T_ID_2] } } });
  });

  describe('getPolicy', () => {
    it('should return default policy when no record exists', async () => {
      const policy = await service.getPolicy(T_ID);
      expect(policy.tenantId).toBe(T_ID);
      expect(policy.passwordPolicy.minLength).toBe(8);
      expect(policy.passwordPolicy.requireUpper).toBe(true);
      expect(policy.passwordPolicy.requireLower).toBe(true);
      expect(policy.passwordPolicy.requireNumber).toBe(true);
      expect(policy.passwordPolicy.requireSpecial).toBe(true);
      expect(policy.passwordPolicy.expirationDays).toBe(90);
      expect(policy.requireMfa).toBe(false);
      expect(policy.mfaMethods).toEqual([]);
      expect(policy.sessionTimeoutMinutes).toBe(480);
      expect(policy.maxSessionsPerUser).toBe(5);
      expect(policy.ipAllowlist).toBeUndefined();
    });

    it('should return stored policy when record exists', async () => {
      await prisma.admin.securityPolicy.create({
        data: {
          tenantId: T_ID,
          passwordPolicy: { minLength: 12, requireUpper: false, requireLower: true, requireNumber: true, requireSpecial: false, expirationDays: 30 } as object,
          requireMfa: true,
          mfaMethods: ['app'],
          sessionTimeoutMinutes: 240,
          maxSessionsPerUser: 3,
          ipAllowlist: ['192.168.1.0/24'],
        },
      });

      const policy = await service.getPolicy(T_ID);
      expect(policy.tenantId).toBe(T_ID);
      expect(policy.passwordPolicy.minLength).toBe(12);
      expect(policy.passwordPolicy.requireUpper).toBe(false);
      expect(policy.requireMfa).toBe(true);
      expect(policy.mfaMethods).toEqual(['app']);
      expect(policy.sessionTimeoutMinutes).toBe(240);
      expect(policy.maxSessionsPerUser).toBe(3);
      expect(policy.ipAllowlist).toEqual(['192.168.1.0/24']);
    });

    it('should return default for tenant without policy when another tenant has one', async () => {
      await prisma.admin.securityPolicy.create({
        data: {
          tenantId: T_ID,
          passwordPolicy: { minLength: 14, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: true, expirationDays: 60 } as object,
          requireMfa: true,
          mfaMethods: [],
          sessionTimeoutMinutes: 120,
          maxSessionsPerUser: 2,
          ipAllowlist: [],
        },
      });

      const policyT2 = await service.getPolicy(T_ID_2);
      expect(policyT2.tenantId).toBe(T_ID_2);
      expect(policyT2.passwordPolicy.minLength).toBe(8);
      expect(policyT2.requireMfa).toBe(false);
    });
  });

  describe('updatePolicy', () => {
    it('should create policy when no existing record', async () => {
      const policy = await service.updatePolicy(T_ID, { requireMfa: true, mfaMethods: ['app', 'sms'] });
      expect(policy.tenantId).toBe(T_ID);
      expect(policy.requireMfa).toBe(true);
      expect(policy.mfaMethods).toEqual(['app', 'sms']);
      expect(policy.passwordPolicy.minLength).toBe(8);
      expect(policy.sessionTimeoutMinutes).toBe(480);
    });

    it('should update existing policy fields', async () => {
      await prisma.admin.securityPolicy.create({
        data: {
          tenantId: T_ID,
          passwordPolicy: { minLength: 8, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: true, expirationDays: 90 } as object,
          requireMfa: false,
          mfaMethods: [],
          sessionTimeoutMinutes: 480,
          maxSessionsPerUser: 5,
          ipAllowlist: [],
        },
      });

      const updated = await service.updatePolicy(T_ID, { sessionTimeoutMinutes: 120, maxSessionsPerUser: 2 });
      expect(updated.sessionTimeoutMinutes).toBe(120);
      expect(updated.maxSessionsPerUser).toBe(2);
      expect(updated.requireMfa).toBe(false);
    });

    it('should update password policy', async () => {
      const updated = await service.updatePolicy(T_ID, {
        passwordPolicy: { minLength: 14, requireUpper: true, requireLower: true, requireNumber: true, requireSpecial: true, expirationDays: 45 },
      });
      expect(updated.passwordPolicy.minLength).toBe(14);
      expect(updated.passwordPolicy.expirationDays).toBe(45);
    });

    it('should update ip allowlist', async () => {
      const updated = await service.updatePolicy(T_ID, { ipAllowlist: ['10.0.0.0/8'] });
      expect(updated.ipAllowlist).toEqual(['10.0.0.0/8']);
    });
  });
});
