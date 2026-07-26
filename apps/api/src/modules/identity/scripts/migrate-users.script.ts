import { PrismaService } from '../../../common/prisma.service';

const USER_ROLE_MAP: Record<string, string> = {
  superadmin: 'admin',
  admin: 'admin',
  user: 'member',
};

const BA_ROLE_MAP: Record<string, string> = {
  owner: 'admin',
  operador: 'manager',
  lector: 'viewer',
};

export interface MigrationResult {
  tenantsProcessed: number;
  usersMigrated: number;
  teamsCreated: number;
  errors: string[];
}

export async function migrateUsers(prisma: PrismaService): Promise<MigrationResult> {
  const result: MigrationResult = {
    tenantsProcessed: 0,
    usersMigrated: 0,
    teamsCreated: 0,
    errors: [],
  };

  const tenants = await prisma.admin.tenant.findMany();
  result.tenantsProcessed = tenants.length;

  for (const tenant of tenants) {
    try {
      const { team: everyoneTeam, created } = await ensureEveryoneTeam(prisma, tenant.id);
      if (created) result.teamsCreated++;

      const roles = await prisma.admin.role.findMany({
        where: { tenantId: tenant.id },
      });
      const roleByName = new Map<string, string>(roles.map((r: { name: string; id: string }) => [r.name, r.id]));

      const existingEveryoneMemberships = new Set(
        (
          await prisma.admin.membership.findMany({
            where: { tenantId: tenant.id, teamId: everyoneTeam.id },
          })
        ).map((m: { userId: string }) => m.userId),
      );

      const users = await prisma.admin.user.findMany({
        where: { tenantId: tenant.id },
      });

      for (const user of users) {
        const newRoleName = USER_ROLE_MAP[user.role];
        if (!newRoleName) {
          result.errors.push(`Tenant ${tenant.slug}: User ${user.email} has unmapped role "${user.role}"`);
          continue;
        }

        const roleId = roleByName.get(newRoleName);
        if (!roleId) {
          result.errors.push(`Tenant ${tenant.slug}: Role "${newRoleName}" not found, needed for user ${user.email}`);
          continue;
        }

        if (existingEveryoneMemberships.has(user.id)) continue;

        await prisma.admin.membership.create({
          data: { tenantId: tenant.id, userId: user.id, teamId: everyoneTeam.id, roleId },
        });
        result.usersMigrated++;
        existingEveryoneMemberships.add(user.id);
      }

      if (tenant.betterAuthOrganizationId) {
        const baMembers = await prisma.admin.member.findMany({
          where: { organizationId: tenant.betterAuthOrganizationId },
          include: { user: true },
        });

        for (const baMember of baMembers) {
          const newRoleName = BA_ROLE_MAP[baMember.role];
          if (!newRoleName) {
            result.errors.push(`Tenant ${tenant.slug}: BA member ${baMember.user.email} has unmapped role "${baMember.role}"`);
            continue;
          }

          const localUser = await prisma.admin.user.findFirst({
            where: { tenantId: tenant.id, betterAuthUserId: baMember.userId },
          });

          if (!localUser) {
            result.errors.push(`Tenant ${tenant.slug}: No local User found for BA member ${baMember.user.email}`);
            continue;
          }

          const roleId = roleByName.get(newRoleName);
          if (!roleId) {
            result.errors.push(`Tenant ${tenant.slug}: Role "${newRoleName}" not found, needed for BA member ${baMember.user.email}`);
            continue;
          }

          if (existingEveryoneMemberships.has(localUser.id)) {
            await prisma.admin.membership.updateMany({
              where: { tenantId: tenant.id, userId: localUser.id, teamId: everyoneTeam.id },
              data: { roleId },
            });
            continue;
          }

          await prisma.admin.membership.create({
            data: { tenantId: tenant.id, userId: localUser.id, teamId: everyoneTeam.id, roleId },
          });
          result.usersMigrated++;
          existingEveryoneMemberships.add(localUser.id);
        }
      }
    } catch (err) {
      result.errors.push(`Tenant ${tenant.slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return result;
}

async function ensureEveryoneTeam(prisma: PrismaService, tenantId: string): Promise<{ team: any; created: boolean }> {
  let team = await prisma.admin.team.findFirst({
    where: { tenantId, name: 'Everyone' },
  });
  if (!team) {
    team = await prisma.admin.team.create({
      data: { tenantId, name: 'Everyone', depth: 0 },
    });
    return { team, created: true };
  }
  return { team, created: false };
}
