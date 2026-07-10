import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantWebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.admin.webhook.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, data: { url: string; eventos: string[] }) {
    return this.prisma.admin.webhook.create({ data: { ...data, tenantId } });
  }

  async remove(tenantId: string, id: string) {
    const w = await this.prisma.admin.webhook.findFirst({ where: { id, tenantId } });
    if (!w) throw new NotFoundException('Webhook no encontrado');
    return this.prisma.admin.webhook.update({ where: { id }, data: { isActive: false } });
  }
}
