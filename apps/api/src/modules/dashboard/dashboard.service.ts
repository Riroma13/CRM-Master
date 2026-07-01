import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalClientes,
      conAtencion,
      criticos,
      tareasPendientes,
      tenantsActivos,
    ] = await Promise.all([
      this.prisma.admin.cliente.count(),
      this.prisma.admin.cliente.count({ where: { saludGeneral: '🟡' } }),
      this.prisma.admin.cliente.count({ where: { saludGeneral: '🔴' } }),
      this.prisma.admin.tarea.count({ where: { estado: { not: 'Hecho' } } }),
      this.prisma.admin.tenant.count({ where: { isActive: true } }),
    ]);

    return {
      metrics: {
        totalClientes,
        activos: totalClientes,
        conIncidencias: conAtencion,
        criticos,
        tareasPendientesGlobales: tareasPendientes,
        tenantsActivos,
      },
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
