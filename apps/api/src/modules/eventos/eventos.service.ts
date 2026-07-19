import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';
import { z } from 'zod';
import { CreateEventoSchema, EventoListQuery } from './dto';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityTimeline: ActivityTimelineService,
  ) {}

  async findAll(clienteId: string, query: z.infer<typeof EventoListQuery>) {
    const where: any = {
      sistema: { clienteId },
    };

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.eventoBitacora.findMany({
        where,
        include: {
          sistema: { select: { id: true, nombreSistema: true } },
        },
        orderBy: { fecha: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.admin.eventoBitacora.count({ where }),
    ]);

    return {
      data: data.map((e: any) => ({
        id: e.id,
        sistema: e.sistema,
        fecha: e.fecha.toISOString(),
        tipo: e.tipo,
        titulo: e.titulo,
        descripcion: e.descripcion,
        siguienteAccion: e.siguienteAccion,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(clienteId: string, dto: z.infer<typeof CreateEventoSchema>) {
    // FK validation: verify sistemaId belongs to clienteId
    const sistema = await this.prisma.admin.sistema.findFirst({
      where: { id: dto.sistemaId, clienteId },
    });

    if (!sistema) {
      throw new NotFoundException(
        `Sistema ${dto.sistemaId} no encontrado para el cliente ${clienteId}`,
      );
    }

    const evento = await this.prisma.admin.eventoBitacora.create({
      data: {
        tenantId: sistema.tenantId,
        sistemaId: dto.sistemaId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        siguienteAccion: dto.siguienteAccion ?? null,
      },
      include: {
        sistema: { select: { id: true, nombreSistema: true } },
      },
    });

    try {
      await this.activityTimeline.publish({
        eventType: 'evento.creado',
        tenantId: sistema.tenantId,
        clienteId,
        entityType: 'evento',
        entityId: evento.id,
        actor: 'system',
        sourceModule: 'eventos',
        severity: 'info',
        category: 'scheduling',
        payload: { titulo: evento.titulo, tipo: evento.tipo },
      });
    } catch (e) {
      this.logger.warn(`Failed to publish evento.creado: ${(e as Error).message}`);
    }

    return {
      id: evento.id,
      sistema: evento.sistema,
      fecha: evento.fecha.toISOString(),
      tipo: evento.tipo,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      siguienteAccion: evento.siguienteAccion,
    };
  }
}
