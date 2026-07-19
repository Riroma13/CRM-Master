import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';

@Injectable()
export class TenantIncidenciasService {
  private readonly logger = new Logger(TenantIncidenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

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
    const incidencia = await this.prisma.admin.incidencia.create({
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
    try {
      await this.activityTimeline.publish({
        eventType: 'incidencia.creada',
        tenantId,
        clienteId: data.clienteId,
        entityType: 'incidencia',
        entityId: incidencia.id,
        actor: 'system',
        sourceModule: 'incidencias',
        severity: 'warning',
        category: 'crm',
        payload: { titulo: incidencia.titulo, prioridad: incidencia.prioridad },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish incidencia.creada: ${(e as Error).message}`);
    }
    return incidencia;
  }

  async update(tenantId: string, id: string, data: any) {
    const inc = await this.prisma.admin.incidencia.findFirst({ where: { id, tenantId } });
    if (!inc) throw new NotFoundException('Incidencia no encontrada');
    const updated = await this.prisma.admin.incidencia.update({ where: { id }, data });
    if (data?.estado === 'resuelta') {
      try {
        await this.activityTimeline.publish({
          eventType: 'incidencia.resuelta',
          tenantId,
          clienteId: inc.clienteId ?? undefined,
          entityType: 'incidencia',
          entityId: id,
          actor: 'system',
          sourceModule: 'incidencias',
          severity: 'info',
          category: 'crm',
          payload: { titulo: updated.titulo },
        });
      } catch (e) {
        this.logger.warn(`Failed to publish incidencia.resuelta: ${(e as Error).message}`);
      }
    }
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const inc = await this.prisma.admin.incidencia.findFirst({ where: { id, tenantId } });
    if (!inc) throw new NotFoundException('Incidencia no encontrada');
    return this.prisma.admin.incidencia.update({ where: { id }, data: { estado: 'cerrada' } });
  }
}
