import { Injectable } from '@nestjs/common'; import { PrismaService } from '../../common/prisma.service';
@Injectable()
export class TenantEncuestasService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(tenantId: string) { return this.prisma.admin.encuesta.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  async create(tenantId: string, data: { referenciaId: string; tipo: string; puntuacion: number; comentario?: string }) { return this.prisma.admin.encuesta.create({ data: { ...data, tenantId } }); }
  async promedio(tenantId: string) {
    const result = await this.prisma.admin.encuesta.aggregate({ where: { tenantId, respondida: true }, _avg: { puntuacion: true }, _count: true });
    return { promedio: result._avg.puntuacion ?? 0, total: result._count };
  }
}
