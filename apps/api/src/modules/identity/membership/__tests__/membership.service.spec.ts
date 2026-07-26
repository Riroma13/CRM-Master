import { Test, TestingModule } from '@nestjs/testing';
import { MembershipService } from '../membership.service';
import { PrismaService } from '../../../../common/prisma.service';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [MembershipService, PrismaService],
  }).compile();

  const service = moduleRef.get(MembershipService);
  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();
  return { moduleRef, service, prisma };
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

describe('MembershipService', () => {
  let service: MembershipService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'mem-test-tenant-0000-0000-0000-000000000001';
  const USER_ID = 'mem-test-user-0000-0000-0000-000000000001';
  const USER_ID_2 = 'mem-test-user-0000-0000-0000-000000000002';
  let teamId: string;
  let roleId: string;
  let adminRoleId: string;

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());
    await resetTestData(prisma);

    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'mem-test-tenant', name: 'Membership Test Tenant' },
    });
    await prisma.admin.user.create({
      data: { id: USER_ID, tenantId: T_ID, email: 'user1@test.com' },
    });
    await prisma.admin.user.create({
      data: { id: USER_ID_2, tenantId: T_ID, email: 'user2@test.com' },
    });
    const team = await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Test Team' },
    });
    teamId = team.id;
    const role = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'member', permissions: ['documents:read'] },
    });
    roleId = role.id;
    const adminRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'admin', permissions: ['*:admin'] },
    });
    adminRoleId = adminRole.id;
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  afterEach(async () => {
    await prisma.admin.membership.deleteMany({ where: { tenantId: T_ID } });
    await prisma.admin.team.deleteMany({
      where: { tenantId: T_ID, NOT: { id: teamId } },
    });
  });

  describe('addMember', () => {
    it('should add a member to a team', async () => {
      const membership = await service.addMember(T_ID, teamId, USER_ID, roleId);
      expect(membership.userId).toBe(USER_ID);
      expect(membership.teamId).toBe(teamId);
      expect(membership.roleId).toBe(roleId);
    });

    it('should throw when team does not exist', async () => {
      await expect(
        service.addMember(T_ID, 'bad-team-id', USER_ID, roleId),
      ).rejects.toThrowError('Team not found');
    });

    it('should throw when role does not exist', async () => {
      await expect(
        service.addMember(T_ID, teamId, USER_ID, 'bad-role-id'),
      ).rejects.toThrowError('Role not found');
    });

    it('should throw when user is already a member', async () => {
      await service.addMember(T_ID, teamId, USER_ID, roleId);
      await expect(
        service.addMember(T_ID, teamId, USER_ID, roleId),
      ).rejects.toThrowError('User is already a member of this team');
    });
  });

  describe('removeMember', () => {
    beforeEach(async () => {
      await service.addMember(T_ID, teamId, USER_ID, roleId);
    });

    it('should remove a member from a team', async () => {
      await service.removeMember(T_ID, teamId, USER_ID);
      const members = await prisma.admin.membership.findMany({
        where: { tenantId: T_ID, userId: USER_ID },
      });
      expect(members.length).toBe(0);
    });

    it('should throw when membership does not exist', async () => {
      await expect(
        service.removeMember(T_ID, teamId, 'non-existent-user'),
      ).rejects.toThrowError('Membership not found');
    });
  });

  describe('changeRole', () => {
    beforeEach(async () => {
      await service.addMember(T_ID, teamId, USER_ID, roleId);
    });

    it('should change a member role', async () => {
      const updated = await service.changeRole(T_ID, teamId, USER_ID, adminRoleId);
      expect(updated.roleId).toBe(adminRoleId);
    });

    it('should throw when membership does not exist', async () => {
      await expect(
        service.changeRole(T_ID, teamId, 'non-existent-user', adminRoleId),
      ).rejects.toThrowError('Membership not found');
    });

    it('should throw when new role does not exist', async () => {
      await expect(
        service.changeRole(T_ID, teamId, USER_ID, 'bad-role-id'),
      ).rejects.toThrowError('Role not found');
    });
  });

  describe('getTeamMembers', () => {
    beforeEach(async () => {
      await service.addMember(T_ID, teamId, USER_ID, roleId);
      await service.addMember(T_ID, teamId, USER_ID_2, roleId);
    });

    it('should list all members of a team', async () => {
      const members = await service.getTeamMembers(T_ID, teamId);
      expect(members.length).toBe(2);
    });

    it('should throw when team does not exist', async () => {
      await expect(
        service.getTeamMembers(T_ID, 'bad-team-id'),
      ).rejects.toThrowError('Team not found');
    });
  });

  describe('getUserTeams', () => {
    let team2Id: string;

    beforeEach(async () => {
      const team2 = await prisma.admin.team.create({
        data: { tenantId: T_ID, name: 'Second Team' },
      });
      team2Id = team2.id;
      await service.addMember(T_ID, teamId, USER_ID, roleId);
      await service.addMember(T_ID, team2Id, USER_ID, roleId);
    });

    it('should list all teams for a user', async () => {
      const teams = await service.getUserTeams(T_ID, USER_ID);
      expect(teams.length).toBe(2);
      expect(teams.map((t: any) => t.name)).toContain('Test Team');
      expect(teams.map((t: any) => t.name)).toContain('Second Team');
    });

    it('should return empty array for user with no teams', async () => {
      const teams = await service.getUserTeams(T_ID, 'no-teams-user');
      expect(teams.length).toBe(0);
    });
  });

  describe('getUserRole', () => {
    beforeEach(async () => {
      await service.addMember(T_ID, teamId, USER_ID, roleId);
    });

    it('should return roles for a user', async () => {
      const roles = await service.getUserRole(T_ID, USER_ID);
      expect(roles).not.toBeNull();
      expect(roles.length).toBe(1);
      expect(roles[0].name).toBe('member');
    });

    it('should return null for user with no memberships', async () => {
      const roles = await service.getUserRole(T_ID, 'no-memberships-user');
      expect(roles).toBeNull();
    });
  });
});
