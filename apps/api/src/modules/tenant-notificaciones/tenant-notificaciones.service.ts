import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TenantNotificacionesService {
  private readCache = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async marcarLeida(tenantId: string, id: string) {
    if (!this.readCache.has(tenantId)) this.readCache.set(tenantId, new Set());
    this.readCache.get(tenantId)!.add(id);
    return { success: true };
  }

  async marcarTodasLeidas(tenantId: string) {
    if (!this.readCache.has(tenantId)) this.readCache.set(tenantId, new Set());
    // We'll handle this at query time by marking all as read
    const allKeys = Array.from(this.readCache.get(tenantId) ?? []);
    // Mark everything as read by adding a sentinel
    this.readCache.get(tenantId)!.add('__all__');
    return { success: true };
  }

  private isLeida(tenantId: string, id: string): boolean {
    const set = this.readCache.get(tenantId);
    if (!set) return false;
    if (set.has('__all__')) return true;
    return set.has(id);
  }

  async getNotificaciones(tenantId: string) {
    const [citasRecientes, docsRecientes] = await Promise.all([
      this.prisma.admin.cita.findMany({
        where: { tenantId, estado: 'pendiente' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          titulo: true,
          clienteNombre: true,
          createdAt: true,
          estado: true,
        },
      }),
      this.prisma.admin.documento.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          filename: true,
          category: true,
          createdAt: true,
        },
      }),
    ]);

    type CitaNotif = { id: string; titulo: string; clienteNombre: string | null; createdAt: Date; estado: string };
    type DocNotif = { id: string; filename: string; category: string; createdAt: Date };

    const isLeida = (id: string) => this.isLeida(tenantId, id);

    const notificaciones = [
      ...citasRecientes.map((c: CitaNotif) => ({
        id: `cita-${c.id}`,
        tipo: 'nueva_cita' as const,
        titulo: `Nueva cita: ${c.titulo}`,
        descripcion: c.clienteNombre ? `Solicitada por ${c.clienteNombre}` : undefined,
        createdAt: c.createdAt.toISOString(),
        leida: isLeida(`cita-${c.id}`),
        link: '/admin/calendario',
      })),
      ...docsRecientes.map((d: DocNotif) => ({
        id: `doc-${d.id}`,
        tipo: 'nuevo_documento' as const,
        titulo: `Documento: ${d.filename}`,
        descripcion: `Categoría: ${d.category}`,
        createdAt: d.createdAt.toISOString(),
        leida: isLeida(`doc-${d.id}`),
        link: '/admin/documentos',
      })),
    ];

    notificaciones.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      notificaciones: notificaciones.slice(0, 10),
      noLeidas: notificaciones.length,
    };
  }
}
