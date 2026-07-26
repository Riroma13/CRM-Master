import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { migrateUsers } from '../scripts/migrate-users.script';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [PrismaService],
  }).compile();

  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();
  return { moduleRef, prisma };
}

async function resetTestData(prisma: PrismaService) {
  await prisma.admin.membership.deleteMany({});
  await prisma.admin.role.deleteMany({});
  await prisma.admin.team.deleteMany({});
  await prisma.admin.user.deleteMany({});
  await prisma.admin.member.deleteMany({});
  await prisma.admin.invitation.deleteMany({});
  await prisma.admin.organization.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
  await prisma.admin.$executeRawUnsafe(`DELETE FROM ba_users`);
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('migrateUsers', () => {
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'mig-test-tenant-0000-0000-0000-000000000001';
  const BA_ORG_ID = 'ba-org-0000-0000-0000-000000000001';

  beforeAll(async () => {
    ({ moduleRef, prisma } = await createTestModule());
    await resetTestData(prisma);

    await prisma.admin.tenant.create({
      data: {
        id: T_ID,
        slug: 'mig-test-tenant',
        name: 'Migration Test Tenant',
        betterAuthOrganizationId: BA_ORG_ID,
      },
    });

    const roleIds: Record<string, string> = {};
    for (const role of ['admin', 'manager', 'member', 'viewer']) {
      const r = await prisma.admin.role.create({
        data: { tenantId: T_ID, name: role, permissions: [], isDefault: true, isSystem: true },
      });
      roleIds[role] = r.id;
    }
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  beforeEach(async () => {
    await prisma.admin.membership.deleteMany({});
  });

  describe('User role migration', () => {
    beforeEach(async () => {
      await prisma.admin.user.createMany({
        data: [
          { id: 'u-superadmin', tenantId: T_ID, email: 'superadmin@test.com', role: 'superadmin' },
          { id: 'u-admin', tenantId: T_ID, email: 'admin@test.com', role: 'admin' },
          { id: 'u-user', tenantId: T_ID, email: 'user@test.com', role: 'user' },
        ],
      });
    });

    afterEach(async () => {
      await prisma.admin.user.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should create Everyone team and migrate users with correct role mapping', async () => {
      const result = await migrateUsers(prisma);

      expect(result.tenantsProcessed).toBe(1);
      expect(result.usersMigrated).toBe(3);
      expect(result.teamsCreated).toBe(1);
      expect(result.errors).toHaveLength(0);

      const everyone = await prisma.admin.team.findFirst({
        where: { tenantId: T_ID, name: 'Everyone' },
      });
      expect(everyone).not.toBeNull();

      const allMemberships = await prisma.admin.membership.findMany({
        where: { tenantId: T_ID, teamId: everyone!.id },
      });
      expect(allMemberships).toHaveLength(3);

      const mSuperadmin = allMemberships.find((m: any) => m.userId === 'u-superadmin');
      const mAdmin = allMemberships.find((m: any) => m.userId === 'u-admin');
      const mUser = allMemberships.find((m: any) => m.userId === 'u-user');
      expect(mSuperadmin).not.toBeUndefined();
      expect(mAdmin).not.toBeUndefined();
      expect(mUser).not.toBeUndefined();

      const roles = await prisma.admin.role.findMany({ where: { tenantId: T_ID } });
      const roleById = new Map(roles.map((r: any) => [r.id, r.name]));

      expect(roleById.get(mSuperadmin!.roleId)).toBe('admin');
      expect(roleById.get(mAdmin!.roleId)).toBe('admin');
      expect(roleById.get(mUser!.roleId)).toBe('member');
    });
  });

  describe('Better-Auth member migration', () => {
    let baUserId: string;

    beforeEach(async () => {
      baUserId = 'ba-user-0000-0000-0000-000000000001';

      await prisma.admin.$executeRawUnsafe(
        `INSERT INTO ba_users (id, email, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())`,
        baUserId,
        'ba-auth@test.com',
        false,
      );

      await prisma.admin.organization.create({
        data: { id: BA_ORG_ID, name: 'Test BA Org' },
      });

      await prisma.admin.member.create({
        data: { organizationId: BA_ORG_ID, userId: baUserId, role: 'owner' },
      });

      await prisma.admin.user.create({
        data: {
          id: 'u-ba-owner',
          tenantId: T_ID,
          email: 'ba-owner@test.com',
          role: 'user',
          betterAuthUserId: baUserId,
        },
      });
    });

    afterEach(async () => {
      await prisma.admin.member.deleteMany({ where: { organizationId: BA_ORG_ID } });
      await prisma.admin.organization.deleteMany({ where: { id: BA_ORG_ID } });
      await prisma.admin.user.deleteMany({ where: { tenantId: T_ID } });
      await prisma.admin.$executeRawUnsafe(`DELETE FROM ba_users WHERE id = $1`, baUserId);
    });

    it('should migrate BA members with correct role mapping', async () => {
      const result = await migrateUsers(prisma);

      const everyone = await prisma.admin.team.findFirst({
        where: { tenantId: T_ID, name: 'Everyone' },
      });
      expect(everyone).not.toBeNull();

      const membership = await prisma.admin.membership.findFirst({
        where: { tenantId: T_ID, userId: 'u-ba-owner', teamId: everyone!.id },
      });
      expect(membership).not.toBeNull();

      const role = await prisma.admin.role.findFirst({
        where: { id: membership!.roleId, tenantId: T_ID },
      });
      expect(role?.name).toBe('admin');
    });
  });

  describe('idempotency', () => {
    beforeEach(async () => {
      await prisma.admin.user.create({
        data: { id: 'u-dup', tenantId: T_ID, email: 'dup@test.com', role: 'admin' },
      });
    });

    afterEach(async () => {
      await prisma.admin.user.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should not create duplicate memberships on second run', async () => {
      const firstResult = await migrateUsers(prisma);
      expect(firstResult.usersMigrated).toBe(1);

      const secondResult = await migrateUsers(prisma);
      expect(secondResult.usersMigrated).toBe(0);

      const memberships = await prisma.admin.membership.findMany({
        where: { tenantId: T_ID },
      });
      expect(memberships).toHaveLength(1);
    });
  });

  describe('unmapped roles', () => {
    beforeEach(async () => {
      await prisma.admin.user.create({
        data: { id: 'u-bad-role', tenantId: T_ID, email: 'bad@test.com', role: 'nonexistent' },
      });
    });

    afterEach(async () => {
      await prisma.admin.user.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should report unmapped roles as errors but continue processing', async () => {
      await prisma.admin.user.create({
        data: { id: 'u-valid', tenantId: T_ID, email: 'valid@test.com', role: 'admin' },
      });

      const result = await migrateUsers(prisma);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0]).toContain('unmapped role');
    });
  });

  describe('default team creation', () => {
    it('should create Everyone team only once per tenant', async () => {
      await migrateUsers(prisma);
      await migrateUsers(prisma);

      const everyoneTeams = await prisma.admin.team.findMany({
        where: { tenantId: T_ID, name: 'Everyone' },
      });
      expect(everyoneTeams).toHaveLength(1);
    });
  });
});
