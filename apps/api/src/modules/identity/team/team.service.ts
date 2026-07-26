import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma.service';

const MAX_TEAM_DEPTH = 3;
const EVERYONE_TEAM_NAME = 'Everyone';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTeam(tenantId: string, data: { name: string; description?: string; parentTeamId?: string }) {
    const existingCount = await this.prisma.admin.team.count({ where: { tenantId, active: true } });

    if (existingCount === 0) {
      await this.ensureEveryoneTeam(tenantId);
    }

    let depth = 0;
    if (data.parentTeamId) {
      const parent = await this.prisma.admin.team.findFirst({
        where: { id: data.parentTeamId, tenantId, active: true },
      });
      if (!parent) throw new NotFoundException('Parent team not found');
      depth = parent.depth + 1;
      if (depth >= MAX_TEAM_DEPTH) {
        throw new BadRequestException(`Maximum team depth of ${MAX_TEAM_DEPTH} exceeded`);
      }
    }

    return this.prisma.admin.team.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        parentTeamId: data.parentTeamId ?? null,
        depth,
      },
    });
  }

  async getTeam(tenantId: string, teamId: string) {
    const team = await this.prisma.admin.team.findFirst({
      where: { id: teamId, tenantId, active: true },
      include: { _count: { select: { memberships: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async listTeams(tenantId: string) {
    return this.prisma.admin.team.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { memberships: true } } },
    });
  }

  async updateTeam(tenantId: string, teamId: string, data: { name?: string; description?: string }) {
    const team = await this.prisma.admin.team.findFirst({
      where: { id: teamId, tenantId, active: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.admin.team.update({ where: { id: teamId }, data });
  }

  async deleteTeam(tenantId: string, teamId: string) {
    return this.prisma.admin.$transaction(async (tx: Prisma.TransactionClient) => {
      const team = await tx.team.findFirst({
        where: { id: teamId, tenantId, active: true },
      });
      if (!team) throw new NotFoundException('Team not found');

      const everyone = await tx.team.findFirst({
        where: { tenantId, name: EVERYONE_TEAM_NAME, active: true },
      });

      const reassignTeamId = team.parentTeamId ?? everyone?.id;
      if (reassignTeamId) {
        await tx.membership.updateMany({
          where: { teamId, tenantId },
          data: { teamId: reassignTeamId },
        });
      }

      await tx.team.updateMany({
        where: { parentTeamId: teamId, tenantId },
        data: { parentTeamId: reassignTeamId ?? null },
      });

      return tx.team.update({
        where: { id: teamId },
        data: { active: false },
      });
    });
  }

  async getTeamTree(tenantId: string) {
    const teams = await this.prisma.admin.team.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { memberships: true } } },
    });
    return this.buildTree(teams, null);
  }

  private async ensureEveryoneTeam(tenantId: string) {
    const existing = await this.prisma.admin.team.findFirst({
      where: { tenantId, name: EVERYONE_TEAM_NAME },
    });
    if (!existing) {
      await this.prisma.admin.team.create({
        data: { tenantId, name: EVERYONE_TEAM_NAME, depth: 0 },
      });
    }
  }

  private buildTree(teams: any[], parentId: string | null): any[] {
    return teams
      .filter((t) => t.parentTeamId === parentId)
      .map((t) => ({
        ...t,
        children: this.buildTree(teams, t.id),
      }));
  }
}
