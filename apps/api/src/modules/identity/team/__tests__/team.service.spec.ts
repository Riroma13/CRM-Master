import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from '../team.service';
import { PrismaService } from '../../../../common/prisma.service';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [TeamService, PrismaService],
  }).compile();

  const service = moduleRef.get(TeamService);
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

describe('TeamService', () => {
  let service: TeamService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'team-tenant-0000-0000-0000-000000000001';

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());
    await resetTestData(prisma);
    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'team-test-tenant', name: 'Team Test Tenant' },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  describe('createTeam', () => {
    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should create a team with depth 0 when no parent given', async () => {
      const team = await service.createTeam(T_ID, { name: 'Engineering' });
      expect(team.name).toBe('Engineering');
      expect(team.depth).toBe(0);
      expect(team.active).toBe(true);
    });

    it('should auto-create Everyone team on first team creation', async () => {
      await service.createTeam(T_ID, { name: 'First Team' });
      const everyone = await prisma.admin.team.findFirst({
        where: { tenantId: T_ID, name: 'Everyone' },
      });
      expect(everyone).not.toBeNull();
    });

    it('should create a child team with correct depth', async () => {
      const parent = await service.createTeam(T_ID, { name: 'Parent' });
      const child = await service.createTeam(T_ID, {
        name: 'Child',
        parentTeamId: parent.id,
      });
      expect(child.depth).toBe(1);
      expect(child.parentTeamId).toBe(parent.id);
    });

    it('should throw when depth exceeds 3', async () => {
      const l1 = await service.createTeam(T_ID, { name: 'L1' });
      const l2 = await service.createTeam(T_ID, { name: 'L2', parentTeamId: l1.id });
      const l3 = await service.createTeam(T_ID, { name: 'L3', parentTeamId: l2.id });
      await expect(
        service.createTeam(T_ID, { name: 'L4', parentTeamId: l3.id }),
      ).rejects.toThrowError('Maximum team depth of 3 exceeded');
    });

    it('should throw when parent team does not exist', async () => {
      await expect(
        service.createTeam(T_ID, {
          name: 'Orphan',
          parentTeamId: 'non-existent-id',
        }),
      ).rejects.toThrowError('Parent team not found');
    });
  });

  describe('getTeam', () => {
    let teamId: string;

    beforeEach(async () => {
      const team = await service.createTeam(T_ID, { name: 'Get Me' });
      teamId = team.id;
    });

    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should return a team by id', async () => {
      const found = await service.getTeam(T_ID, teamId);
      expect(found.name).toBe('Get Me');
    });

    it('should throw when team does not exist', async () => {
      await expect(
        service.getTeam(T_ID, 'non-existent-id'),
      ).rejects.toThrowError('Team not found');
    });
  });

  describe('listTeams', () => {
    beforeEach(async () => {
      await service.createTeam(T_ID, { name: 'Alpha' });
      await service.createTeam(T_ID, { name: 'Beta' });
    });

    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should list all active teams for a tenant', async () => {
      const teams = await service.listTeams(T_ID);
      expect(teams.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('updateTeam', () => {
    let teamId: string;

    beforeEach(async () => {
      const team = await service.createTeam(T_ID, { name: 'Old Name' });
      teamId = team.id;
    });

    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should update team name and description', async () => {
      const updated = await service.updateTeam(T_ID, teamId, {
        name: 'New Name',
        description: 'Updated desc',
      });
      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Updated desc');
    });

    it('should throw when team does not exist', async () => {
      await expect(
        service.updateTeam(T_ID, 'non-existent-id', { name: 'Nope' }),
      ).rejects.toThrowError('Team not found');
    });
  });

  describe('deleteTeam (soft-delete)', () => {
    let parentId: string;
    let childId: string;

    beforeEach(async () => {
      const parent = await service.createTeam(T_ID, { name: 'Parent' });
      parentId = parent.id;
      const child = await service.createTeam(T_ID, {
        name: 'Child',
        parentTeamId: parentId,
      });
      childId = child.id;
    });

    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should soft-delete a team (set active=false)', async () => {
      const result = await service.deleteTeam(T_ID, childId);
      expect(result.active).toBe(false);
      const fetched = await prisma.admin.team.findFirst({
        where: { id: childId, tenantId: T_ID },
      });
      expect(fetched?.active).toBe(false);
    });

    it('should throw when team does not exist', async () => {
      await expect(
        service.deleteTeam(T_ID, 'non-existent-id'),
      ).rejects.toThrowError('Team not found');
    });
  });

  describe('getTeamTree', () => {
    beforeEach(async () => {
      const root = await service.createTeam(T_ID, { name: 'Root' });
      const child = await service.createTeam(T_ID, {
        name: 'Child',
        parentTeamId: root.id,
      });
      await service.createTeam(T_ID, {
        name: 'Grandchild',
        parentTeamId: child.id,
      });
      await service.createTeam(T_ID, { name: 'Sibling' });
    });

    afterEach(async () => {
      await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
    });

    it('should return a hierarchical tree', async () => {
      const tree = await service.getTeamTree(T_ID);
      const root = tree.find((t: any) => t.name === 'Root');
      expect(root).toBeDefined();
      expect(root.children.length).toBe(1);
      expect(root.children[0].name).toBe('Child');
      expect(root.children[0].children.length).toBe(1);
      expect(root.children[0].children[0].name).toBe('Grandchild');
    });
  });
});
