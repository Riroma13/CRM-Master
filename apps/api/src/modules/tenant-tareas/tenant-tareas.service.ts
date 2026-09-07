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

  async create(tenantId: string, data: { titulo: string; descripcion?: string; prioridad?: string; fechaLimite?: string; clienteId?: string; sistemaId?: string }) {
    if (data.clienteId) await this.requireClient(tenantId, data.clienteId);
    if (data.sistemaId) await this.requireSistema(tenantId, data.sistemaId);
    return this.prisma.admin.tarea.create({
      data: {
        tenantId,
        titulo: data.titulo,
        estado: 'Pendiente',
        prioridad: data.prioridad || 'Media',
        fechaLimite: data.fechaLimite ? new Date(data.fechaLimite) : null,
        clienteId: data.clienteId || null,
        sistemaId: data.sistemaId || null,
      },
    });
  }

  async update(tenantId: string, id: string, data: { titulo?: string; estado?: string; prioridad?: string; fechaLimite?: string; clienteId?: string; sistemaId?: string }) {
    const tarea = await this.prisma.admin.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    if (data.clienteId !== undefined && data.clienteId) await this.requireClient(tenantId, data.clienteId);
    const sistemaId = data.sistemaId;
    if (sistemaId) await this.requireSistema(tenantId, sistemaId);
    return this.prisma.admin.tarea.update({
      where: { id },
      data: {
        ...(data.titulo && { titulo: data.titulo }),
        ...(data.estado && { estado: data.estado }),
        ...(data.prioridad && { prioridad: data.prioridad }),
        ...(data.fechaLimite && { fechaLimite: new Date(data.fechaLimite) }),
        ...(data.clienteId !== undefined && { clienteId: data.clienteId || null }),
        ...(sistemaId !== undefined && { sistemaId: sistemaId || null }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const tarea = await this.prisma.admin.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return this.prisma.admin.tarea.delete({ where: { id } });
  }

  private async requireClient(tenantId: string, clienteId: string) {
    const cliente = await this.prisma.admin.cliente.findFirst({ where: { id: clienteId, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
  }

  private async requireSistema(tenantId: string, sistemaId: string) {
    const sistema = await this.prisma.admin.sistema.findFirst({ where: { id: sistemaId, tenantId } });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
  }
}
