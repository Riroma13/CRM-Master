import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantTareasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.admin.tarea.findMany({
      where: { tenantId },
      orderBy: { fechaLimite: 'asc' },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const tarea = await this.prisma.admin.tarea.findFirst({
      where: { id, tenantId },
      include: { cliente: { select: { id: true, nombre: true } } },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return tarea;
  }

  async create(tenantId: string, data: { titulo: string; descripcion?: string; prioridad?: string; fechaLimite?: string; clienteId?: string }) {
    return this.prisma.admin.tarea.create({
      data: {
        tenantId,
        titulo: data.titulo,
        estado: 'Pendiente',
        prioridad: data.prioridad || 'Media',
        fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null,
        clienteId: data.clienteId || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: { titulo?: string; estado?: string; prioridad?: string; fechaLimite?: string; clienteId?: string }) {
    const tarea = await this.prisma.admin.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return this.prisma.admin.tarea.update({
      where: { id },
      data: {
        ...(data.titulo && { titulo: data.titulo }),
        ...(data.estado && { estado: data.estado }),
        ...(data.prioridad && { prioridad: data.prioridad }),
        ...(data.fechaLimite && { fechaLimite: new Date(data.fechaLimite) }),
        ...(data.clienteId !== undefined && { clienteId: data.clienteId || null }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const tarea = await this.prisma.admin.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return this.prisma.admin.tarea.delete({ where: { id } });
  }
}
