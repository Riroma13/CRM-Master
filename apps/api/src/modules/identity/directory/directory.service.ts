import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { RBACEngine } from '../rbac/rbac-engine';
import type { UserProfile } from '@shared/identity';

interface UserWithTeams extends UserProfile {
  teams: Array<{
    id: string;
    name: string;
    roleId: string;
    roleName: string;
  }>;
}

interface TeamWithMembers {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  parentTeamId: string | null;
  parentTeamName: string | null;
  depth: number;
  memberCount: number;
  members: Array<{
    userId: string;
    email: string;
    name: string;
    roleId: string;
    roleName: string;
  }>;
}

interface TeamSummary {
  id: string;
  name: string;
  memberCount: number;
  parentTeamId: string | null;
  depth: number;
}

interface SearchResults {
  users: UserProfile[];
  teams: Array<{ id: string; name: string; tenantId: string }>;
}

function toUserProfile(user: any): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    avatar: user.avatar ?? undefined,
    active: user.isActive,
  };
}

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacEngine: RBACEngine,
  ) {}

  async getUsers(tenantId: string, teamId?: string, roleId?: string): Promise<UserProfile[]> {
    let userIds: string[] | undefined;

    if (teamId || roleId) {
      const where: Record<string, unknown> = { tenantId };
      if (teamId) where.teamId = teamId;
      if (roleId) where.roleId = roleId;

      const memberships = await this.prisma.admin.membership.findMany({ where }) as Array<{ userId: string }>;
      userIds = [...new Set(memberships.map((m) => m.userId))];

      if (!userIds || userIds.length === 0) return [];
    }

    const userWhere: Record<string, unknown> = { tenantId, isActive: true };
    if (userIds) userWhere.id = { in: userIds };

    const users = await this.prisma.admin.user.findMany({
      where: userWhere,
      orderBy: { name: 'asc' },
    });

    return users.map(toUserProfile);
  }

  async getUser(tenantId: string, userId: string): Promise<UserWithTeams> {
    const user = await this.prisma.admin.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    const memberships = await this.prisma.admin.membership.findMany({
      where: { tenantId, userId },
      include: { team: true },
    });

    const roleIds = [...new Set(memberships.map((m: { roleId: string }) => m.roleId))];
    const roles = roleIds.length > 0
      ? await this.prisma.admin.role.findMany({ where: { id: { in: roleIds }, tenantId } })
      : [];

    return {
      ...toUserProfile(user),
      teams: memberships.map((m: { team: { id: string; name: string }; roleId: string }) => ({
        id: m.team.id,
        name: m.team.name,
        roleId: m.roleId,
        roleName: roles.find((r: { id: string }) => r.id === m.roleId)?.name ?? '',
      })),
    };
  }

  async getTeams(tenantId: string): Promise<TeamSummary[]> {
    const teams = await this.prisma.admin.team.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { memberships: true } } },
    });

    return teams.map((t: { id: string; tenantId: string; name: string; description: string | null; parentTeamId: string | null; depth: number; _count: { memberships: number } }) => ({
      id: t.id,
      name: t.name,
      memberCount: t._count.memberships,
      parentTeamId: t.parentTeamId,
      depth: t.depth,
    }));
  }

  async getTeam(tenantId: string, teamId: string): Promise<TeamWithMembers> {
    const team = await this.prisma.admin.team.findFirst({
      where: { id: teamId, tenantId, active: true },
      include: {
        _count: { select: { memberships: true } },
        parentTeam: { select: { id: true, name: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');

    const memberships = await this.prisma.admin.membership.findMany({
      where: { tenantId, teamId },
    });

    const userIds = memberships.map((m: { userId: string }) => m.userId);
    const users = userIds.length > 0
      ? await this.prisma.admin.user.findMany({ where: { id: { in: userIds }, tenantId } })
      : [];

    const roleIds = [...new Set(memberships.map((m: { roleId: string }) => m.roleId))];
    const roles = roleIds.length > 0
      ? await this.prisma.admin.role.findMany({ where: { id: { in: roleIds }, tenantId } })
      : [];

    return {
      id: team.id,
      tenantId: team.tenantId,
      name: team.name,
      description: team.description,
      parentTeamId: team.parentTeamId,
      parentTeamName: (team as any).parentTeam?.name ?? null,
      depth: team.depth,
      memberCount: (team as any)._count.memberships,
      members: memberships.map((m: { userId: string; roleId: string }) => {
        const user = users.find((u: { id: string }) => u.id === m.userId);
        const role = roles.find((r: { id: string }) => r.id === m.roleId);
        return {
          userId: m.userId,
          email: user?.email ?? '',
          name: user?.name ?? '',
          roleId: m.roleId,
          roleName: role?.name ?? '',
        };
      }),
    };
  }

  async search(tenantId: string, query: string): Promise<SearchResults> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { users: [], teams: [] };
    }

    const [users, teams] = await Promise.all([
      this.prisma.admin.user.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { name: { contains: trimmed, mode: 'insensitive' } },
            { email: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { name: 'asc' },
      }),
      this.prisma.admin.team.findMany({
        where: {
          tenantId,
          active: true,
          name: { contains: trimmed, mode: 'insensitive' },
        },
        take: 20,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      users: users.map(toUserProfile),
      teams: teams.map((t: { id: string; name: string; tenantId: string }) => ({
        id: t.id,
        name: t.name,
        tenantId: t.tenantId,
      })),
    };
  }

  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    return this.rbacEngine.getUserPermissions(tenantId, userId);
  }
}
