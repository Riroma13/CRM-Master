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

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await prisma.admin.membership.deleteMany({});
  await prisma.admin.role.deleteMany({});
  await prisma.admin.team.deleteMany({});
  await prisma.admin.user.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
  await moduleRef.close();
}

describe('RBAC Cache Invalidation', () => {
  let engine: RBACEngine;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'cache-test-tenant-0000-0000-0000-000000000001';
  const USER_ID = 'cache-test-user-0000-0000-0000-000000000001';

  beforeAll(async () => {
    ({ moduleRef, engine, prisma } = await createTestModule());
    await prisma.admin.membership.deleteMany({});
    await prisma.admin.role.deleteMany({});
    await prisma.admin.team.deleteMany({});
    await prisma.admin.user.deleteMany({});
    await prisma.admin.tenant.deleteMany({});

    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'cache-test-tenant', name: 'Cache Test' },
    });
    await prisma.admin.user.create({
      data: { id: USER_ID, tenantId: T_ID, email: 'cache-user@test.com' },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  it('should reflect role change after cache invalidation', async () => {
    const team = await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Cache Test Team' },
    });

    const viewerRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'viewer', permissions: ['documents:read'] },
    });

    await prisma.admin.membership.create({
      data: { tenantId: T_ID, userId: USER_ID, teamId: team.id, roleId: viewerRole.id },
    });

    const beforeAdd = await engine.checkPermission(T_ID, USER_ID, 'documents:write');
    expect(beforeAdd.allowed).toBe(false);

    const editorRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'editor', permissions: ['documents:read', 'documents:write'] },
    });

    await prisma.admin.membership.updateMany({
      where: { tenantId: T_ID, userId: USER_ID },
      data: { roleId: editorRole.id },
    });

    engine.invalidateCache(T_ID, USER_ID);

    const afterUpdate = await engine.checkPermission(T_ID, USER_ID, 'documents:write');
    expect(afterUpdate.allowed).toBe(true);
    expect(afterUpdate.grantedBy).toBe('documents:write');
  });

  it('should purge entire tenant cache', async () => {
    const user2Id = 'cache-test-user-0000-0000-0000-000000000002';
    await prisma.admin.user.create({
      data: { id: user2Id, tenantId: T_ID, email: 'cache-user2@test.com' },
    });

    const team = await prisma.admin.team.findFirst({ where: { tenantId: T_ID } });
    if (!team) throw new Error('Team not found');
    const roles = await prisma.admin.role.findMany({ where: { tenantId: T_ID } });

    await prisma.admin.membership.create({
      data: { tenantId: T_ID, userId: user2Id, teamId: team.id, roleId: roles[0].id },
    });

    await engine.getUserPermissions(T_ID, USER_ID);
    await engine.getUserPermissions(T_ID, user2Id);

    const beforePurge = await engine.hasPermission(T_ID, user2Id, 'documents:read');
    expect(beforePurge).toBe(true);

    engine.invalidateCache(T_ID);

    await prisma.admin.membership.deleteMany({ where: { tenantId: T_ID, userId: user2Id } });

    const afterPurge = await engine.hasPermission(T_ID, user2Id, 'documents:read');
    expect(afterPurge).toBe(false);
  });

  it('should not affect other tenant cache entries', async () => {
    const t2Id = 'cache-test-tenant-0000-0000-0000-000000000002';
    const t2UserId = 'cache-test-user-0000-0000-0000-000000000003';

    await prisma.admin.tenant.create({
      data: { id: t2Id, slug: 'cache-test-tenant-2', name: 'Cache Test 2' },
    });
    await prisma.admin.user.create({
      data: { id: t2UserId, tenantId: t2Id, email: 'other-tenant@test.com' },
    });

    const team2 = await prisma.admin.team.create({
      data: { tenantId: t2Id, name: 'Other Team' },
    });
    const role2 = await prisma.admin.role.create({
      data: { tenantId: t2Id, name: 'admin', permissions: ['*:admin'] },
    });
    await prisma.admin.membership.create({
      data: { tenantId: t2Id, userId: t2UserId, teamId: team2.id, roleId: role2.id },
    });

    await engine.getUserPermissions(t2Id, t2UserId);

    engine.invalidateCache(T_ID);

    const stillWorks = await engine.hasPermission(t2Id, t2UserId, 'workflows:admin');
    expect(stillWorks).toBe(true);
  });
});
