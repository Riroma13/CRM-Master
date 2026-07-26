import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from '../../team/team.service';
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
  await prisma.admin.user.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('Default Team (Everyone) — auto-creation', () => {
  let service: TeamService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'default-team-tenant-0000-0000-0000-000000000001';

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());
    await resetTestData(prisma);
    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'default-team-test', name: 'Default Team Test' },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  afterEach(async () => {
    await prisma.admin.team.deleteMany({ where: { tenantId: T_ID } });
  });

  it('should auto-create Everyone team when first team is created', async () => {
    await service.createTeam(T_ID, { name: 'Engineering' });
    const everyone = await prisma.admin.team.findFirst({
      where: { tenantId: T_ID, name: 'Everyone' },
    });
    expect(everyone).not.toBeNull();
    expect(everyone?.depth).toBe(0);
    expect(everyone?.active).toBe(true);
    expect(everyone?.parentTeamId).toBeNull();
  });

  it('should NOT create a second Everyone team when a subsequent team is created', async () => {
    await service.createTeam(T_ID, { name: 'First Team' });
    await service.createTeam(T_ID, { name: 'Second Team' });

    const everyoneTeams = await prisma.admin.team.findMany({
      where: { tenantId: T_ID, name: 'Everyone' },
    });
    expect(everyoneTeams.length).toBe(1);
  });

  it('should not fail if Everyone already exists when creating first team', async () => {
    await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Everyone', depth: 0 },
    });
    await service.createTeam(T_ID, { name: 'Marketing' });
    const everyoneCount = await prisma.admin.team.count({
      where: { tenantId: T_ID, name: 'Everyone' },
    });
    expect(everyoneCount).toBe(1);
  });
});
