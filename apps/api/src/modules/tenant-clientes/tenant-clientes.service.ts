import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { search?: string; estado?: string; salud?: string }) {
    const where: any = { tenantId };

    if (query?.search) {
      where.nombre = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.estado) {
      where.estadoRelacion = query.estado;
    }
    if (query?.salud) {
      where.saludGeneral = query.salud;
    }

    return this.prisma.admin.cliente.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { sistemas: true, tareas: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const cliente = await this.prisma.admin.cliente.findFirst({
      where: { id, tenantId },
      include: {
        sistemas: true,
        tareas: { orderBy: { fechaLimite: 'asc' } },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  async create(tenantId: string, data: any) {
    return this.prisma.admin.cliente.create({
      data: { ...data, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const cliente = await this.prisma.admin.cliente.findFirst({ where: { id, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return this.prisma.admin.cliente.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const cliente = await this.prisma.admin.cliente.findFirst({ where: { id, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return this.prisma.admin.cliente.delete({ where: { id } });
  }
}
