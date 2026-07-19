import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';

@Injectable()
export class TenantSistemasService {
  private readonly logger = new Logger(TenantSistemasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

  async findAll(tenantId: string, clienteId?: string) {
    const where: any = { tenantId };
    if (clienteId) where.clienteId = clienteId;
    return this.prisma.admin.sistema.findMany({
      where,
      orderBy: { nombreSistema: 'asc' },
      include: {
        cliente: { select: { id: true, nombre: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const sistema = await this.prisma.admin.sistema.findFirst({
      where: { id, tenantId },
      include: {
        cliente: { select: { id: true, nombre: true } },
        items: { orderBy: { categoria: 'asc' } },
      },
    });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
    return sistema;
  }

  async create(tenantId: string, data: { nombreSistema: string; tipo: string; clienteId: string; entorno?: string; version?: string }) {
    const sistema = await this.prisma.admin.sistema.create({
      data: { ...data, tenantId },
    });
    try {
      await this.activityTimeline.publish({
        eventType: 'sistema.añadido',
        tenantId,
        clienteId: data.clienteId,
        entityType: 'sistema',
        entityId: sistema.id,
        actor: 'system',
        sourceModule: 'sistemas',
        severity: 'info',
        category: 'crm',
        payload: { nombreSistema: sistema.nombreSistema, tipo: sistema.tipo },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish sistema.añadido: ${(e as Error).message}`);
    }
    return sistema;
  }

  async update(tenantId: string, id: string, data: any) {
    const sistema = await this.prisma.admin.sistema.findFirst({ where: { id, tenantId } });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
    const updated = await this.prisma.admin.sistema.update({ where: { id }, data });
    try {
      await this.activityTimeline.publish({
        eventType: 'sistema.modificado',
        tenantId,
        clienteId: sistema.clienteId ?? undefined,
        entityType: 'sistema',
        entityId: id,
        actor: 'system',
        sourceModule: 'sistemas',
        severity: 'info',
        category: 'crm',
        payload: { nombreSistema: updated.nombreSistema },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish sistema.modificado: ${(e as Error).message}`);
    }
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const sistema = await this.prisma.admin.sistema.findFirst({ where: { id, tenantId } });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
    return this.prisma.admin.sistema.delete({ where: { id } });
  }

  // Items
  async getItems(tenantId: string, sistemaId: string) {
    return this.prisma.admin.itemInventario.findMany({
      where: { tenantId, sistemaId },
      orderBy: { categoria: 'asc' },
    });
  }

  async createItem(tenantId: string, sistemaId: string, data: { nombre: string; categoria: string; descripcion?: string; estado?: string }) {
    return this.prisma.admin.itemInventario.create({
      data: { ...data, tenantId, sistemaId },
    });
  }

  async updateItem(tenantId: string, itemId: string, data: any) {
    const item = await this.prisma.admin.itemInventario.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    return this.prisma.admin.itemInventario.update({ where: { id: itemId }, data });
  }

  async removeItem(tenantId: string, itemId: string) {
    const item = await this.prisma.admin.itemInventario.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    return this.prisma.admin.itemInventario.delete({ where: { id: itemId } });
  }
}
