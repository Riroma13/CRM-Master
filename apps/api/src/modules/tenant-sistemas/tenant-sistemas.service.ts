import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantSistemasService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.admin.sistema.create({
      data: { ...data, tenantId },
    });
  }

  async update(tenantId: string, id: string, data: any) {
    const sistema = await this.prisma.admin.sistema.findFirst({ where: { id, tenantId } });
    if (!sistema) throw new NotFoundException('Sistema no encontrado');
    return this.prisma.admin.sistema.update({ where: { id }, data });
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
