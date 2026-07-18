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

    const tx = this.prisma.forTenant(tenantId);

    const [
      totalClientes,
      clientesActivos,
      citasHoy,
      citasPendientes,
      citasSemana,
      tareasPendientes,
      sistemasActivos,
      eventos,
      countTareas,
      countDocumentos,
      countSistemas,
    ] = await Promise.all([
      tx.cliente.count(),
      tx.cliente.count({ where: { estadoRelacion: 'Activo' } }),
      tx.cita.count({ where: { fecha: { gte: today } } }),
      tx.cita.count({ where: { estado: 'pendiente' } }),
      tx.cita.count({ where: { fecha: { gte: weekStart } } }),
      tx.tarea.count({ where: { estado: { not: 'Hecho' } } }),
      tx.sistema.count({ where: { estadoTecnico: { not: '🔴 Caído' } } }),
      tx.eventoBitacora.findMany({
        orderBy: { fecha: 'desc' },
        take: 5,
      }),
      tx.tarea.count(),
      tx.documento.count({ where: { isDeleted: false } }),
      tx.sistema.count(),
    ]);

    const eventosRecientes: EventoItem[] = eventos.map((e: any) => ({
      id: e.id,
      fecha: e.fecha.toISOString(),
      tipo: e.tipo,
      titulo: e.titulo,
      descripcion: e.descripcion ?? undefined,
    }));

    const onboardingChecklist = {
      steps: [
        { id: 'cliente', label: 'Primer cliente', done: totalClientes > 0 },
        { id: 'tarea', label: 'Primera tarea', done: countTareas > 0 },
        { id: 'documento', label: 'Primer documento', done: countDocumentos > 0 },
        { id: 'sistema', label: 'Primer sistema', done: countSistemas > 0 },
      ],
    };

    const ultimosEventos = eventosRecientes;

    return {
      totalClientes,
      clientesActivos,
      citasHoy,
      citasPendientes,
      citasSemana,
      tareasPendientes,
      sistemasActivos,
      eventosRecientes,
      ultimosEventos,
      ultimaActualizacion: new Date().toISOString(),
      onboardingChecklist,
    };
  }
}
