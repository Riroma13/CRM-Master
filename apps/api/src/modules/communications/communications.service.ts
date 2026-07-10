import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface CommEntry { id: number; tenantId: string; clienteId: string; tipo: string; titulo: string; descripcion?: string; createdAt: string; }

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: { tenantId: string; clienteId: string; tipo: string; titulo: string; descripcion?: string }) {
    const c = await this.prisma.admin.comunicacion.create({ data: entry });
    return { id: c.id, ...entry, createdAt: c.createdAt.toISOString() };
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<CommEntry[]> {
    const items = await this.prisma.admin.comunicacion.findMany({
      where: { tenantId, clienteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return items.map((c: any) => ({ id: c.id, tenantId: c.tenantId, clienteId: c.clienteId, tipo: c.tipo, titulo: c.titulo, descripcion: c.descripcion ?? undefined, createdAt: c.createdAt.toISOString() }));
  }
}
