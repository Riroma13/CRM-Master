import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { z } from 'zod';
import { CreateTareaRapidaSchema, TareaListQuery } from './dto';

@Injectable()
export class TareasService {
  private readonly logger = new Logger(TareasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(clienteId: string, query: z.infer<typeof TareaListQuery>) {
    const where: any = { clienteId };

    if (query.estado) {
      where.estado = query.estado;
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.tarea.findMany({
        where,
        include: {
          sistema: { select: { id: true, nombreSistema: true } },
        },
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.admin.tarea.count({ where }),
    ]);

    return {
      data: data.map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        estado: t.estado,
        prioridad: t.prioridad,
        fechaLimite: t.fechaLimite?.toISOString() ?? null,
        sistema: t.sistema,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(clienteId: string, dto: z.infer<typeof CreateTareaRapidaSchema>) {
    const data: any = {
      clienteId,
      titulo: dto.titulo,
      prioridad: dto.prioridad,
      estado: 'Pendiente',
    };

    if (dto.sistemaId) {
      data.sistemaId = dto.sistemaId;
    }

    if (dto.fechaLimite) {
      data.fechaLimite = new Date(dto.fechaLimite);
    }

    const tarea = await this.prisma.admin.tarea.create({
      data,
      include: {
        sistema: { select: { id: true, nombreSistema: true } },
      },
    });

    return {
      id: tarea.id,
      titulo: tarea.titulo,
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      fechaLimite: tarea.fechaLimite?.toISOString() ?? null,
      sistema: tarea.sistema,
    };
  }
}
