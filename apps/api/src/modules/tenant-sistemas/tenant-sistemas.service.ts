import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';

type SistemaUpdateData = {
  nombreSistema?: string;
  tipo?: string;
  clienteId?: string;
  entorno?: string | null;
  version?: string | null;
};

type ItemWriteData = {
  nombre?: string;
  categoria?: string;
  estado?: string;
  descripcion?: string | null;
  fechaImplementacion?: string | null;
  responsable?: string | null;
};

function hasOwnField(data: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, field);
}

function buildSistemaUpdateData(data: Record<string, unknown>): SistemaUpdateData {
  const updateData: SistemaUpdateData = {};

  if (hasOwnField(data, 'nombreSistema')) updateData.nombreSistema = data.nombreSistema as string;
  if (hasOwnField(data, 'tipo')) updateData.tipo = data.tipo as string;
  if (hasOwnField(data, 'clienteId')) updateData.clienteId = data.clienteId as string;
  if (hasOwnField(data, 'entorno')) updateData.entorno = data.entorno as string | null;
  if (hasOwnField(data, 'version')) updateData.version = data.version as string | null;

  return updateData;
}

export function normalizeInventoryDateForStorage(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('fechaImplementacion debe tener formato YYYY-MM-DD');
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new BadRequestException('fechaImplementacion debe tener formato YYYY-MM-DD');
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('fechaImplementacion debe ser una fecha válida');
  }

  return date.toISOString();
}

function buildItemWriteData(data: Record<string, unknown>): ItemWriteData {
  const writeData: ItemWriteData = {};

  if (hasOwnField(data, 'nombre')) writeData.nombre = data.nombre as string;
  if (hasOwnField(data, 'categoria')) writeData.categoria = data.categoria as string;
  if (hasOwnField(data, 'estado')) writeData.estado = data.estado as string;
  if (hasOwnField(data, 'descripcion')) writeData.descripcion = data.descripcion as string | null;
  if (hasOwnField(data, 'responsable')) writeData.responsable = data.responsable as string | null;
  if (hasOwnField(data, 'fechaImplementacion')) {
    writeData.fechaImplementacion = normalizeInventoryDateForStorage(data.fechaImplementacion);
  }

  return writeData;
}

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
    await this.requireClient(tenantId, data.clienteId);
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

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const sistema = await this.prisma.admin.sistema.findFirst({ where: { id, tenantId } });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
    const updateData = buildSistemaUpdateData(data);
    if (updateData.clienteId !== undefined) await this.requireClient(tenantId, updateData.clienteId);
    const updated = await this.prisma.admin.sistema.update({ where: { id }, data: updateData });
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

  async createItem(tenantId: string, sistemaId: string, data: Record<string, unknown>) {
    const itemData = buildItemWriteData(data);
    await this.requireSistema(tenantId, sistemaId);
    return this.prisma.admin.itemInventario.create({
      data: { ...itemData, tenantId, sistemaId },
    });
  }

  async updateItem(tenantId: string, itemId: string, data: Record<string, unknown>) {
    const updateData = buildItemWriteData(data);
    const item = await this.prisma.admin.itemInventario.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    return this.prisma.admin.itemInventario.update({ where: { id: itemId }, data: updateData });
  }

  async removeItem(tenantId: string, itemId: string) {
    const item = await this.prisma.admin.itemInventario.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Item no encontrado');
    return this.prisma.admin.itemInventario.delete({ where: { id: itemId } });
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
