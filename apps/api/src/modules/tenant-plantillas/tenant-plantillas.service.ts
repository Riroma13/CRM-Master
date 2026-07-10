import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantPlantillasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) { return this.prisma.admin.plantillaDocumento.findMany({ where: { tenantId }, orderBy: { nombre: 'asc' } }); }

  async create(tenantId: string, data: { nombre: string; tipo: string; contenido: string; variables?: string[] }) {
    return this.prisma.admin.plantillaDocumento.create({ data: { ...data, tenantId, variables: data.variables || [] } });
  }

  async update(tenantId: string, id: string, data: any) {
    const p = await this.prisma.admin.plantillaDocumento.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Plantilla no encontrada');
    return this.prisma.admin.plantillaDocumento.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.admin.plantillaDocumento.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Plantilla no encontrada');
    return this.prisma.admin.plantillaDocumento.delete({ where: { id } });
  }
}
