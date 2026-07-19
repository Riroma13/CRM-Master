import { Injectable, Logger } from '@nestjs/common'; import { PrismaService } from '../../common/prisma.service'; import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';

@Injectable()
export class TenantPagosService {
  private readonly logger = new Logger(TenantPagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

  async findAll(tenantId: string) { return this.prisma.admin.pagoIntent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { presupuesto: { select: { id: true, titulo: true } } } }); }

  async create(tenantId: string, data: { monto: number; presupuestoId?: string; clienteId?: string; metodoPago?: string }) {
    const pago = await this.prisma.admin.pagoIntent.create({ data: { ...data, tenantId } });
    try {
      await this.activityTimeline.publish({
        eventType: 'pago.recibido',
        tenantId,
        clienteId: data.clienteId,
        entityType: 'pago',
        entityId: pago.id,
        actor: 'system',
        sourceModule: 'pagos',
        severity: 'info',
        category: 'crm',
        payload: { monto: data.monto, metodoPago: data.metodoPago },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish pago.recibido: ${(e as Error).message}`);
    }
    return pago;
  }

  async complete(id: string, tenantId: string) {
    return this.prisma.admin.pagoIntent.update({ where: { id }, data: { estado: 'completado' } });
  }
}
