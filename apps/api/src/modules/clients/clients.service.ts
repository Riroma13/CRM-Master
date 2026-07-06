import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { z } from '../../../node_modules/zod';
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
    const where: any = {};
    if (query.search) {
      where.nombre = { contains: query.search, mode: 'insensitive' };
    }
    if (query.salud) where.saludGeneral = query.salud;
    if (query.estado) where.estadoRelacion = query.estado;
    if (query.tag) where.tags = { has: query.tag };

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
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.admin.cliente.count({ where }),
    ]);

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
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
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
            items: {
              select: {
                id: true,
                categoria: true,
                nombre: true,
                estado: true,
                responsable: true,
              },
            },
          },
        },
      },
    });
    return cliente;
  }

  async findOneOrFail(id: string) {
    const cliente = await this.findOne(id);
    if (!cliente) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return cliente as any;
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
