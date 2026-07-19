import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';

@Injectable()
export class TenantPresupuestosService {
  private readonly logger = new Logger(TenantPresupuestosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

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
    const presupuesto = await this.prisma.admin.presupuesto.create({ data: { ...data, tenantId, total: data.total ?? 0 } });
    try {
      await this.activityTimeline.publish({
        eventType: 'presupuesto.enviado',
        tenantId,
        clienteId: data.clienteId,
        entityType: 'presupuesto',
        entityId: presupuesto.id,
        actor: 'system',
        sourceModule: 'presupuestos',
        severity: 'info',
        category: 'crm',
        payload: { titulo: presupuesto.titulo, total: presupuesto.total },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish presupuesto.enviado: ${(e as Error).message}`);
    }
    return presupuesto;
  }

  async update(tenantId: string, id: string, data: any) {
    const p = await this.prisma.admin.presupuesto.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Presupuesto no encontrado');
    const updated = await this.prisma.admin.presupuesto.update({ where: { id }, data });
    if (data?.estado === 'aceptado') {
      try {
        await this.activityTimeline.publish({
          eventType: 'presupuesto.aceptado',
          tenantId,
          clienteId: p.clienteId ?? undefined,
          entityType: 'presupuesto',
          entityId: id,
          actor: 'system',
          sourceModule: 'presupuestos',
          severity: 'info',
          category: 'crm',
          payload: { titulo: updated.titulo, total: updated.total },
        });
      } catch (e) {
        this.logger.warn(`Failed to publish presupuesto.aceptado: ${(e as Error).message}`);
      }
    }
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.admin.presupuesto.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Presupuesto no encontrado');
    return this.prisma.admin.presupuesto.update({ where: { id }, data: { estado: 'rechazado' } });
  }
}
