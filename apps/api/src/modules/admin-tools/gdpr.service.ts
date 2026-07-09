import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportTenantData(tenantId: string) {
    const [tenant, clientes, tareas, documentos, citas, incidencias, sistemas] = await Promise.all([
      this.prisma.admin.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } }),
      this.prisma.admin.cliente.findMany({ where: { tenantId } }),
      this.prisma.admin.tarea.findMany({ where: { tenantId } }),
      this.prisma.admin.documento.findMany({ where: { tenantId, isDeleted: false }, select: { id: true, filename: true, category: true, createdAt: true } }),
      this.prisma.admin.cita.findMany({ where: { tenantId } }),
      this.prisma.admin.incidencia.findMany({ where: { tenantId } }),
      this.prisma.admin.sistema.findMany({ where: { tenantId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tenant,
      clientes: clientes.length,
      tareas: tareas.length,
      documentos: documentos.length,
      citas: citas.length,
      incidencias: incidencias.length,
      sistemas: sistemas.length,
      data: { clientes, tareas, documentos, citas, incidencias, sistemas },
    };
  }

  async deleteTenantData(tenantId: string) {
    await this.prisma.admin.$transaction([
      this.prisma.admin.incidencia.deleteMany({ where: { tenantId } }),
      this.prisma.admin.cita.deleteMany({ where: { tenantId } }),
      this.prisma.admin.tarea.deleteMany({ where: { tenantId } }),
      this.prisma.admin.documento.deleteMany({ where: { tenantId } }),
      this.prisma.admin.sistema.deleteMany({ where: { tenantId } }),
      this.prisma.admin.cliente.deleteMany({ where: { tenantId } }),
    ]);
    this.logger.log(`All data deleted for tenant ${tenantId}`);
    return { success: true, message: 'Datos eliminados correctamente' };
  }
}
