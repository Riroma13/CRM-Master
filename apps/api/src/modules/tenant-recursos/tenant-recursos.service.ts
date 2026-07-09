import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantRecursosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, tipo?: string) {
    const where: any = { tenantId, isActive: true };
    if (tipo) where.tipo = tipo;
    return this.prisma.admin.resource.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { citas: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const resource = await this.prisma.admin.resource.findFirst({
      where: { id, tenantId },
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return resource;
  }

  async create(tenantId: string, data: { nombre: string; tipo: string; descripcion?: string }) {
    return this.prisma.admin.resource.create({
      data: { ...data, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const r = await this.prisma.admin.resource.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Recurso no encontrado');
    return this.prisma.admin.resource.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const r = await this.prisma.admin.resource.findFirst({ where: { id, tenantId } });
    if (!r) throw new NotFoundException('Recurso no encontrado');
    return this.prisma.admin.resource.update({ where: { id }, data: { isActive: false } });
  }
}
