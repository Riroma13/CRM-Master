import { Injectable, NotFoundException } from '@nestjs/common'; import { PrismaService } from '../../common/prisma.service';
@Injectable()
export class TenantEventosAcademicosService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(tenantId: string, year?: number) {
    const where: any = { tenantId };
    if (year) { const start = new Date(`${year}-01-01`); const end = new Date(`${year + 1}-01-01`); where.fechaInicio = { gte: start, lt: end }; }
    return this.prisma.admin.eventoAcademico.findMany({ where, orderBy: { fechaInicio: 'asc' } });
  }
  async create(tenantId: string, data: any) { return this.prisma.admin.eventoAcademico.create({ data: { ...data, tenantId } }); }
  async remove(tenantId: string, id: string) { const e = await this.prisma.admin.eventoAcademico.findFirst({ where: { id, tenantId } }); if (!e) throw new NotFoundException(); return this.prisma.admin.eventoAcademico.delete({ where: { id } }); }
}
