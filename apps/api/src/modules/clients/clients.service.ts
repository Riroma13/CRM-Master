import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { z } from 'zod';
import { CreateClienteDto, UpdateClienteDto, ClienteCardDto, ClienteListQuery } from './dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto): Promise<ClienteCardDto> {
    const cliente = await this.prisma.admin.cliente.create({ data: dto as any });
    return this.mapToDto(cliente);
  }

  async findAll(query: z.infer<typeof ClienteListQuery>) {
    const parsed = ClienteListQuery.parse(query);
    const where: any = {};
    if (parsed.search) {
      where.nombre = { contains: parsed.search, mode: 'insensitive' };
    }
    if (parsed.salud) where.saludGeneral = parsed.salud;
    if (parsed.estado) where.estadoRelacion = parsed.estado;
    if (parsed.tag) where.tags = { has: parsed.tag };

    const [data, total] = await Promise.all([
      this.prisma.admin.cliente.findMany({
        where,
        include: {
          tenant: { select: { id: true, slug: true, name: true } },
          sistemas: {
            select: { id: true, nombreSistema: true, tipo: true, estadoTecnico: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
      }),
      this.prisma.admin.cliente.count({ where }),
    ]);

    // Batch-load tareasPendientes counts per clienteId to avoid N+1
    const clienteIds = data.map((c: any) => c.id);
    let countMap: Record<string, number> = {};
    if (clienteIds.length > 0) {
      const tareaCounts = await this.prisma.admin.tarea.groupBy({
        by: ['clienteId'],
        where: { clienteId: { in: clienteIds }, estado: { not: 'Hecho' } },
        _count: { id: true },
      });
      countMap = Object.fromEntries(
        tareaCounts.map((t: any) => [t.clienteId, t._count.id]),
      );
    }

    return {
      data: data.map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        tenant: c.tenant,
        saludGeneral: c.saludGeneral,
        estadoRelacion: c.estadoRelacion,
        tags: c.tags,
        sistemas: c.sistemas,
        ultimaActividad: c.updatedAt.toISOString(),
        tareasPendientes: countMap[c.id] ?? 0,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages: Math.ceil(total / parsed.limit),
      },
    };
  }

  async findOne(id: string) {
    const cliente = await this.prisma.admin.cliente.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, slug: true, name: true } },
        sistemas: {
          include: {
            items: true,
            eventos: { orderBy: { fecha: 'desc' as any }, take: 5 },
          },
        },
      },
    });
    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto) {
    const cliente = await this.prisma.admin.cliente.update({
      where: { id },
      data: dto as any,
    });
    return cliente;
  }

  private mapToDto(cliente: any): ClienteCardDto {
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      tenant: cliente.tenant,
      saludGeneral: cliente.saludGeneral,
      estadoRelacion: cliente.estadoRelacion,
      tags: cliente.tags,
      createdAt: cliente.createdAt.toISOString(),
    };
  }
}
