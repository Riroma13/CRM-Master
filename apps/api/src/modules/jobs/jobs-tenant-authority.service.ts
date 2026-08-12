import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { JobsTerminalError } from './jobs.contracts';

@Injectable()
export class JobsTenantAuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  async assertActiveTenant(tenantId: string): Promise<void> {
    const tenant = await this.prisma.admin.tenant.findUnique({
      where: { id: tenantId },
      select: { isActive: true },
    });

    if (!tenant?.isActive) {
      throw new JobsTerminalError('Tenant authority is inactive or missing');
    }
  }

  forTenant(tenantId: string) {
    return this.prisma.forTenant(tenantId);
  }
}
