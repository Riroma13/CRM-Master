import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, q: string) {
    if (!q || q.length < 2) return { results: [] };
    const term = q.toLowerCase();

    const results: any[] = [];

    // Search clientes
    const clientes = await this.prisma.admin.cliente.findMany({
      where: {
        tenantId,
        nombre: { contains: term, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, nombre: true, tipoNegocio: true },
    });
    for (const c of clientes) {
      results.push({ type: 'cliente', id: c.id, title: c.nombre, subtitle: c.tipoNegocio, link: `/admin/clientes/${c.id}` });
    }

    // Search tareas
    const tareas = await this.prisma.admin.tarea.findMany({
      where: {
        tenantId,
        titulo: { contains: term, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, titulo: true, estado: true },
    });
    for (const t of tareas) {
      results.push({ type: 'tarea', id: t.id, title: t.titulo, subtitle: t.estado, link: '/admin/tareas' });
    }

    // Search incidencias
    const incidencias = await this.prisma.admin.incidencia.findMany({
      where: {
        tenantId,
        titulo: { contains: term, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, titulo: true, estado: true },
    });
    for (const inc of incidencias) {
      results.push({ type: 'incidencia', id: inc.id, title: inc.titulo, subtitle: inc.estado, link: '/admin/incidencias' });
    }

    return { results };
  }
}
