import { Test, TestingModule } from '@nestjs/testing';
import { DirectoryService } from '../directory.service';
import { PrismaService } from '../../../../common/prisma.service';
import { RBACEngine } from '../../rbac/rbac-engine';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [DirectoryService, RBACEngine, PrismaService],
  }).compile();

  const service = moduleRef.get(DirectoryService);
  const prisma = moduleRef.get(PrismaService);
  const rbac = moduleRef.get(RBACEngine);
  await moduleRef.init();
  return { moduleRef, service, prisma, rbac };
}

async function resetTestData(prisma: PrismaService) {
  await prisma.admin.membership.deleteMany({});
  await prisma.admin.role.deleteMany({});
  await prisma.admin.team.deleteMany({});
  await prisma.admin.user.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('DirectoryService', () => {
  let service: DirectoryService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'dir-tenant-0000-0000-0000-000000000001';
  const T_ID_2 = 'dir-tenant-0000-0000-0000-000000000002';

  const USER_A = 'dir-user-a-0000-0000-0000-000000000001';
  const USER_B = 'dir-user-b-0000-0000-0000-000000000002';
  const USER_C = 'dir-user-c-0000-0000-0000-000000000003';
  const USER_D = 'dir-user-d-0000-0000-0000-000000000004';

  let teamId: string;
  let adminRoleId: string;
  let memberRoleId: string;

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());
    await resetTestData(prisma);

    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'dir-test-tenant', name: 'Directory Test Tenant' },
    });
    await prisma.admin.tenant.create({
      data: { id: T_ID_2, slug: 'dir-test-tenant-2', name: 'Directory Test Tenant 2' },
    });

    await prisma.admin.user.createMany({
      data: [
        { id: USER_A, tenantId: T_ID, email: 'alice@test.com', name: 'Alice Admin' },
        { id: USER_B, tenantId: T_ID, email: 'bob@test.com', name: 'Bob Member' },
        { id: USER_C, tenantId: T_ID, email: 'charlie@test.com', name: 'Charlie Member' },
        { id: USER_D, tenantId: T_ID_2, email: 'dave@other.com', name: 'Dave Other' },
      ],
    });

    const team = await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Engineering' },
    });
    teamId = team.id;

    await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Marketing' },
    });

    const adminRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'admin', permissions: ['*:admin'] },
    });
    adminRoleId = adminRole.id;

    const memberRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'member', permissions: ['documents:read', 'documents:write'] },
    });
    memberRoleId = memberRole.id;

    await prisma.admin.membership.createMany({
      data: [
        { tenantId: T_ID, userId: USER_A, teamId, roleId: adminRoleId },
        { tenantId: T_ID, userId: USER_B, teamId, roleId: memberRoleId },
        { tenantId: T_ID, userId: USER_C, teamId, roleId: memberRoleId },
      ],
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  describe('getUsers', () => {
    it('should return all active users for tenant', async () => {
      const users = await service.getUsers(T_ID);
      expect(users.length).toBe(3);
      expect(users.find((u) => u.email === 'alice@test.com')).toBeDefined();
      expect(users.find((u) => u.email === 'bob@test.com')).toBeDefined();
    });

    it('should filter users by teamId', async () => {
      const engTeam = await prisma.admin.team.findFirst({ where: { tenantId: T_ID, name: 'Engineering' } });
      const users = await service.getUsers(T_ID, engTeam!.id);
      expect(users.length).toBe(3);
    });

    it('should return empty when team has no members', async () => {
      const mktTeam = await prisma.admin.team.findFirst({ where: { tenantId: T_ID, name: 'Marketing' } });
      const users = await service.getUsers(T_ID, mktTeam!.id);
      expect(users).toEqual([]);
    });

    it('should filter users by roleId', async () => {
      const users = await service.getUsers(T_ID, undefined, adminRoleId);
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('alice@test.com');
    });

    it('should not return users from other tenant', async () => {
      const users = await service.getUsers(T_ID_2);
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('dave@other.com');
    });
  });

  describe('getUser', () => {
    it('should return user with teams and roles', async () => {
      const user = await service.getUser(T_ID, USER_A);
      expect(user.email).toBe('alice@test.com');
      expect(user.name).toBe('Alice Admin');
      expect(user.teams.length).toBeGreaterThanOrEqual(1);
      expect(user.teams[0].roleName).toBe('admin');
    });

    it('should throw when user not found', async () => {
      await expect(service.getUser(T_ID, 'nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getTeams', () => {
    it('should return teams with member counts', async () => {
      const teams = await service.getTeams(T_ID);
      expect(teams.length).toBeGreaterThanOrEqual(2);
      const eng = teams.find((t) => t.name === 'Engineering');
      expect(eng).toBeDefined();
      expect(eng!.memberCount).toBe(3);
    });
  });

  describe('getTeam', () => {
    it('should return team with members', async () => {
      const team = await service.getTeam(T_ID, teamId);
      expect(team.name).toBe('Engineering');
      expect(team.members.length).toBe(3);
      expect(team.members.find((m) => m.name === 'Alice Admin')).toBeDefined();
    });

    it('should throw when team not found', async () => {
      await expect(service.getTeam(T_ID, 'nonexistent')).rejects.toThrow('Team not found');
    });
  });

  describe('search', () => {
    it('should search users by name', async () => {
      const results = await service.search(T_ID, 'alice');
      expect(results.users.length).toBe(1);
      expect(results.users[0].email).toBe('alice@test.com');
    });

    it('should search users by email', async () => {
      const results = await service.search(T_ID, 'bob@test');
      expect(results.users.length).toBe(1);
      expect(results.users[0].name).toBe('Bob Member');
    });

    it('should search teams by name', async () => {
      const results = await service.search(T_ID, 'engineer');
      expect(results.teams.length).toBe(1);
      expect(results.teams[0].name).toBe('Engineering');
    });

    it('should return empty results for no match', async () => {
      const results = await service.search(T_ID, 'zzzzz');
      expect(results.users).toEqual([]);
      expect(results.teams).toEqual([]);
    });

    it('should return empty results for empty query', async () => {
      const results = await service.search(T_ID, '');
      expect(results.users).toEqual([]);
      expect(results.teams).toEqual([]);
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions for admin user', async () => {
      const perms = await service.getUserPermissions(T_ID, USER_A);
      expect(perms).toContain('*:admin');
    });

    it('should return permissions for member user', async () => {
      const perms = await service.getUserPermissions(T_ID, USER_B);
      expect(perms).toContain('documents:read');
      expect(perms).toContain('documents:write');
    });

    it('should return empty for user with no memberships', async () => {
      const perms = await service.getUserPermissions(T_ID, 'no-role-user');
      expect(perms).toEqual([]);
    });
  });

  describe('tenant scoping', () => {
    it('should not show Tenant B users in Tenant A results', async () => {
      const users = await service.getUsers(T_ID);
      const dave = users.find((u) => u.email === 'dave@other.com');
      expect(dave).toBeUndefined();
    });

    it('should not show Tenant B teams in Tenant A results', async () => {
      const teams = await service.getTeams(T_ID);
      const allTeams = await prisma.admin.team.findMany();
      const otherTenantTeams = allTeams.filter((t: { tenantId: string }) => t.tenantId !== T_ID);
      for (const tt of otherTenantTeams) {
        expect(teams.find((t) => t.id === tt.id)).toBeUndefined();
      }
    });

    it('should not leak Tenant B permissions to Tenant A', async () => {
      const perms = await service.getUserPermissions(T_ID, USER_A);
      expect(perms).toContain('*:admin');
      expect(perms.length).toBeLessThanOrEqual(1);
    });
  });
});
