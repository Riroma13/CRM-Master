import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { TenantDashboardResponse, EventoItem } from './dto';

@Injectable()
export class TenantDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string): Promise<TenantDashboardResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const [
      totalClientes,
      clientesActivos,
      citasHoy,
      citasPendientes,
      citasSemana,
      tareasPendientes,
      sistemasActivos,
      eventos,
    ] = await Promise.all([
      this.prisma.admin.cliente.count({ where: { tenantId } }),
      this.prisma.admin.cliente.count({ where: { tenantId, estadoRelacion: 'Activo' } }),
      this.prisma.admin.cita.count({ where: { tenantId, fecha: { gte: today } } }),
      this.prisma.admin.cita.count({ where: { tenantId, estado: 'pendiente' } }),
      this.prisma.admin.cita.count({ where: { tenantId, fecha: { gte: weekStart } } }),
      this.prisma.admin.tarea.count({ where: { tenantId, estado: { not: 'Hecho' } } }),
      this.prisma.admin.sistema.count({ where: { tenantId, estadoTecnico: { not: '🔴 Caído' } } }),
      this.prisma.admin.eventoBitacora.findMany({
        where: { tenantId },
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
    ]);

    const eventosRecientes: EventoItem[] = eventos.map((e: any) => ({
      id: e.id,
      fecha: e.fecha.toISOString(),
      tipo: e.tipo,
      titulo: e.titulo,
      descripcion: e.descripcion ?? undefined,
    }));

    return {
      totalClientes,
      clientesActivos,
      citasHoy,
      citasPendientes,
      citasSemana,
      tareasPendientes,
      sistemasActivos,
      eventosRecientes,
    };
  }
}
