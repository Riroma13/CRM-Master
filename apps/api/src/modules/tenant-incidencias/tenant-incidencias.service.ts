import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantIncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { estado?: string; prioridad?: string; clienteId?: string }) {
    const where: any = { tenantId };
    if (query?.estado) where.estado = query.estado;
    if (query?.prioridad) where.prioridad = query.prioridad;
    if (query?.clienteId) where.clienteId = query.clienteId;
    return this.prisma.admin.incidencia.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { id: true, nombre: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const inc = await this.prisma.admin.incidencia.findFirst({
      where: { id, tenantId },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    if (!inc) throw new NotFoundException('Incidencia no encontrada');
    return inc;
  }

  async create(tenantId: string, data: { titulo: string; descripcion?: string; prioridad?: string; clienteId?: string; asignadoA?: string; fechaLimite?: string }) {
    return this.prisma.admin.incidencia.create({
      data: {
        tenantId,
        titulo: data.titulo,
        descripcion: data.descripcion,
        prioridad: data.prioridad ?? 'media',
        clienteId: data.clienteId,
        asignadoA: data.asignadoA,
        fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : undefined,
      },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const inc = await this.prisma.admin.incidencia.findFirst({ where: { id, tenantId } });
    if (!inc) throw new NotFoundException('Incidencia no encontrada');
    return this.prisma.admin.incidencia.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const inc = await this.prisma.admin.incidencia.findFirst({ where: { id, tenantId } });
    if (!inc) throw new NotFoundException('Incidencia no encontrada');
    return this.prisma.admin.incidencia.update({ where: { id }, data: { estado: 'cerrada' } });
  }
}
