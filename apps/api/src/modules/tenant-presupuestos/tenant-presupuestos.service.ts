import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantPresupuestosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, clienteId?: string) {
    const where: any = { tenantId };
    if (clienteId) where.clienteId = clienteId;
    return this.prisma.admin.presupuesto.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.admin.presupuesto.findFirst({ where: { id, tenantId }, include: { cliente: { select: { id: true, nombre: true } } } });
    if (!p) throw new NotFoundException('Presupuesto no encontrado');
    return p;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.admin.presupuesto.create({ data: { ...data, tenantId, total: data.total ?? 0 } });
  }

  async update(tenantId: string, id: string, data: any) {
    const p = await this.prisma.admin.presupuesto.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Presupuesto no encontrado');
    return this.prisma.admin.presupuesto.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.admin.presupuesto.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Presupuesto no encontrado');
    return this.prisma.admin.presupuesto.update({ where: { id }, data: { estado: 'rechazado' } });
  }
}
