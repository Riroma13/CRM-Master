import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logo: tenant.logo,
      config: tenant.config,
      isActive: tenant.isActive,
    };
  }

  async updateProfile(tenantId: string, data: { name?: string; logo?: string; config?: any }) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return this.prisma.admin.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.config && { config: data.config }),
      },
    });
  }
}
