import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addMember(tenantId: string, teamId: string, userId: string, roleId: string) {
    const team = await this.prisma.admin.team.findFirst({
      where: { id: teamId, tenantId, active: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    const role = await this.prisma.admin.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.prisma.admin.membership.findFirst({
      where: { tenantId, userId, teamId },
    });
    if (existing) throw new ConflictException('User is already a member of this team');

    return this.prisma.admin.membership.create({
      data: { tenantId, userId, teamId, roleId },
      include: { team: true },
    });
  }

  async removeMember(tenantId: string, teamId: string, userId: string) {
    const membership = await this.prisma.admin.membership.findFirst({
      where: { tenantId, userId, teamId },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    return this.prisma.admin.membership.delete({ where: { id: membership.id } });
  }

  async changeRole(tenantId: string, teamId: string, userId: string, newRoleId: string) {
    const membership = await this.prisma.admin.membership.findFirst({
      where: { tenantId, userId, teamId },
    });
    if (!membership) throw new NotFoundException('Membership not found');

    const role = await this.prisma.admin.role.findFirst({
      where: { id: newRoleId, tenantId },
    });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.admin.membership.update({
      where: { id: membership.id },
      data: { roleId: newRoleId },
    });
  }

  async getTeamMembers(tenantId: string, teamId: string) {
    const team = await this.prisma.admin.team.findFirst({
      where: { id: teamId, tenantId, active: true },
    });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.admin.membership.findMany({
      where: { tenantId, teamId },
      include: { team: true },
    });
  }

  async getUserTeams(tenantId: string, userId: string) {
    const memberships = await this.prisma.admin.membership.findMany({
      where: { tenantId, userId },
      include: { team: true },
    });
    return memberships.map((m: { team: any }) => m.team);
  }

  async getUserRole(tenantId: string, userId: string) {
    const memberships = await this.prisma.admin.membership.findMany({
      where: { tenantId, userId },
    });
    if (memberships.length === 0) return null;

    const roleIds = [...new Set(memberships.map((m: { roleId: string }) => m.roleId))];
    const roles = await this.prisma.admin.role.findMany({
      where: { id: { in: roleIds }, tenantId },
    });

    return roles;
  }
}
