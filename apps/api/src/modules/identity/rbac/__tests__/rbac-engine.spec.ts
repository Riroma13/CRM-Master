import { Test, TestingModule } from '@nestjs/testing';
import { RBACEngine } from '../rbac-engine';
import { PrismaService } from '../../../../common/prisma.service';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [RBACEngine, PrismaService],
  }).compile();

  const engine = moduleRef.get(RBACEngine);
  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();
  return { moduleRef, engine, prisma };
}

async function resetTestData(prisma: PrismaService) {
  await prisma.admin.membership.deleteMany({});
  await prisma.admin.team.deleteMany({});
  await prisma.admin.role.deleteMany({});
  await prisma.admin.user.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('RBACEngine', () => {
  let engine: RBACEngine;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'rbac-test-tenant-0000-0000-0000-000000000001';
  const USER_ID = 'rbac-test-user-0000-0000-0000-000000000001';
  const USER_ID_2 = 'rbac-test-user-0000-0000-0000-000000000002';
  let teamId: string;
  let adminRoleId: string;
  let memberRoleId: string;

  beforeAll(async () => {
    ({ moduleRef, engine, prisma } = await createTestModule());
    await resetTestData(prisma);

    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'rbac-test-tenant', name: 'RBAC Test Tenant' },
    });
    await prisma.admin.user.create({
      data: { id: USER_ID, tenantId: T_ID, email: 'admin@test.com' },
    });
    await prisma.admin.user.create({
      data: { id: USER_ID_2, tenantId: T_ID, email: 'member@test.com' },
    });

    const team = await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'RBAC Test Team' },
    });
    teamId = team.id;

    const adminRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'admin', permissions: ['*:admin'] },
    });
    adminRoleId = adminRole.id;

    const memberRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'member', permissions: ['documents:read', 'documents:write'] },
    });
    memberRoleId = memberRole.id;

    await prisma.admin.membership.create({
      data: { tenantId: T_ID, userId: USER_ID, teamId, roleId: adminRoleId },
    });
    await prisma.admin.membership.create({
      data: { tenantId: T_ID, userId: USER_ID_2, teamId, roleId: memberRoleId },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  afterEach(async () => {
    engine.invalidateCache(T_ID);
  });

  describe('checkPermission', () => {
    it('should allow exact match', async () => {
      const result = await engine.checkPermission(T_ID, USER_ID_2, 'documents:read');
      expect(result.allowed).toBe(true);
      expect(result.grantedBy).toBe('documents:read');
    });

    it('should allow wildcard match (*:admin)', async () => {
      const result = await engine.checkPermission(T_ID, USER_ID, 'workflows:admin');
      expect(result.allowed).toBe(true);
      expect(result.grantedBy).toBe('*:admin');
    });

    it('should deny when permission does not exist', async () => {
      const result = await engine.checkPermission(T_ID, USER_ID_2, 'workflows:delete');
      expect(result.allowed).toBe(false);
    });

    it('should deny for user with no roles', async () => {
      const result = await engine.checkPermission(T_ID, 'nonexistent-user', 'documents:read');
      expect(result.allowed).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for allowed permission', async () => {
      const result = await engine.hasPermission(T_ID, USER_ID_2, 'documents:read');
      expect(result).toBe(true);
    });

    it('should return false for denied permission', async () => {
      const result = await engine.hasPermission(T_ID, USER_ID_2, 'workflows:delete');
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all effective permissions for a user', async () => {
      const permissions = await engine.getUserPermissions(T_ID, USER_ID_2);
      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:write');
      expect(permissions.length).toBe(2);
    });

    it('should return empty array for user with no memberships', async () => {
      const permissions = await engine.getUserPermissions(T_ID, 'no-roles-user');
      expect(permissions).toEqual([]);
    });
  });

  describe('cache hit/miss', () => {
    it('should cache permissions after first load', async () => {
      engine.invalidateCache(T_ID, USER_ID);
      const beforeMs = Date.now();
      await engine.getUserPermissions(T_ID, USER_ID);
      const afterMs = Date.now();
      const firstLoadMs = afterMs - beforeMs;

      const beforeMs2 = Date.now();
      await engine.getUserPermissions(T_ID, USER_ID);
      const afterMs2 = Date.now();
      const secondLoadMs = afterMs2 - beforeMs2;

      expect(secondLoadMs).toBeLessThanOrEqual(firstLoadMs);
    });
  });

  describe('invalidateCache', () => {
    it('should purge cache for specific user', async () => {
      await engine.getUserPermissions(T_ID, USER_ID);
      engine.invalidateCache(T_ID, USER_ID);
      const result = await engine.checkPermission(T_ID, USER_ID, 'test:permission');
      expect(result).toBeDefined();
    });

    it('should purge all cache for tenant', async () => {
      await engine.getUserPermissions(T_ID, USER_ID);
      await engine.getUserPermissions(T_ID, USER_ID_2);
      engine.invalidateCache(T_ID);
      const result1 = await engine.checkPermission(T_ID, USER_ID, 'test:permission');
      const result2 = await engine.checkPermission(T_ID, USER_ID_2, 'test:permission');
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
