import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class IdentityMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(tenantId: string, userId: string, organizationId: string) {
    const client = this.prisma.forTenant(tenantId) as any;
    const tenant = await client.tenant.findFirst({
      where: { id: tenantId, betterAuthOrganizationId: organizationId },
      select: { id: true },
    });
    if (!tenant) return null;
    return client.member.findFirst({ where: { organizationId, userId } });
  }
}
