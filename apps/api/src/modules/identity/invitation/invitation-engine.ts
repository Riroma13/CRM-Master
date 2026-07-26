import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../../common/prisma.service';
import { MembershipService } from '../membership/membership.service';

const INVITATION_TTL_DAYS = 7;
const TOKEN_BYTES = 32;

@Injectable()
export class InvitationEngine {
  private readonly logger = new Logger(InvitationEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipService: MembershipService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createInvitation(
    tenantId: string,
    email: string,
    roleId: string,
    teamId?: string,
  ): Promise<{ invitationId: string; token: string }> {
    const existingPending = await this.prisma.admin.invitation.findFirst({
      where: { tenantId, email, status: 'pending' },
    });
    if (existingPending) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(token);

    const invitation = await this.prisma.admin.invitation.create({
      data: {
        tenantId,
        email,
        roleId,
        teamId: teamId ?? null,
        tokenHash,
        status: 'pending',
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { invitationId: invitation.id, token };
  }

  async acceptInvitation(
    token: string,
  ): Promise<{ userId: string; sessionToken: string }> {
    const tokenHash = this.hashToken(token);

    const invitation = await this.prisma.admin.invitation.findUnique({
      where: { tokenHash },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Invitation is already ${invitation.status}`);
    }
    if (new Date() > invitation.expiresAt) {
      await this.prisma.admin.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    let user = await this.prisma.admin.user.findFirst({
      where: { email: invitation.email, tenantId: invitation.tenantId },
    });

    if (!user) {
      user = await this.prisma.admin.user.create({
        data: {
          tenantId: invitation.tenantId,
          email: invitation.email,
          name: invitation.email.split('@')[0],
          role: 'user',
        },
      });
    }

    const teamId = invitation.teamId ?? (await this.getDefaultTeamId(invitation.tenantId));

    try {
      await this.membershipService.addMember(
        invitation.tenantId,
        teamId,
        user.id,
        invitation.roleId,
      );
    } catch (err) {
      if (!(err instanceof ConflictException)) throw err;
    }

    await this.prisma.admin.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    const sessionToken = this.signSessionToken(user.id);

    return { userId: user.id, sessionToken };
  }

  async cancelInvitation(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.admin.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    return this.prisma.admin.invitation.update({
      where: { id: invitationId },
      data: { status: 'cancelled' },
    });
  }

  async listInvitations(tenantId: string, status?: string) {
    const where: any = { tenantId };
    if (status) where.status = status;

    return this.prisma.admin.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  signInvitationToken(token: string): string {
    const secret = process.env.INVITATION_SIGNING_SECRET || '';
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  verifyInvitationToken(token: string, signature: string): boolean {
    const expected = this.signInvitationToken(token);
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  private signSessionToken(userId: string): string {
    const payload = `${userId}:${Date.now()}`;
    const secret = process.env.INVITATION_SIGNING_SECRET || '';
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private async getDefaultTeamId(tenantId: string): Promise<string> {
    const everyone = await this.prisma.admin.team.findFirst({
      where: { tenantId, name: 'Everyone', active: true },
    });
    if (everyone) return everyone.id;

    const anyTeam = await this.prisma.admin.team.findFirst({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'asc' },
    });
    if (anyTeam) return anyTeam.id;

    throw new NotFoundException('No default team found for tenant');
  }
}
