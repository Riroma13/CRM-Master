import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePassword(tenantId: string, newPassword: string) {
    const hash = bcrypt.hashSync(newPassword, 10);
    await this.prisma.admin.$executeRawUnsafe(
      'UPDATE users SET password_hash = $1 WHERE tenant_id = $2',
      hash, tenantId,
    );
    return { success: true };
  }

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
