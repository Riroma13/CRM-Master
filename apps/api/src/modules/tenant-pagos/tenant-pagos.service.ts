import { Injectable } from '@nestjs/common'; import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantPagosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) { return this.prisma.admin.pagoIntent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, include: { presupuesto: { select: { id: true, titulo: true } } } }); }

  async create(tenantId: string, data: { monto: number; presupuestoId?: string; clienteId?: string; metodoPago?: string }) {
    return this.prisma.admin.pagoIntent.create({ data: { ...data, tenantId } });
  }

  async complete(id: string, tenantId: string) {
    return this.prisma.admin.pagoIntent.update({ where: { id }, data: { estado: 'completado' } });
  }
}
