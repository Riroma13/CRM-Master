import { Test, TestingModule } from '@nestjs/testing';
import { EventosService } from '../eventos.service';
import { PrismaService } from '../../../common/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockClienteId = '11111111-1111-4111-a111-111111111111';
const mockSistemaId = '22222222-2222-4222-a222-222222222222';
const mockTenantId = '33333333-3333-4333-a333-333333333333';
const mockEventoId = '44444444-4444-4444-a444-444444444444';

function createMockPrisma() {
  return {
    admin: {
      eventoBitacora: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      sistema: {
        findFirst: jest.fn(),
      },
    },
  };
}

describe('EventosService', () => {
  let service: EventosService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventosService>(EventosService);
  });

  describe('findAll', () => {
    const mockEventos = [
      {
        id: mockEventoId,
        sistemaId: mockSistemaId,
        tenantId: mockTenantId,
        tipo: 'Decisión',
        titulo: 'Evento 1',
        descripcion: 'Descripción 1',
        siguienteAccion: 'Acción 1',
        fecha: new Date('2026-06-30T10:00:00Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      },
    ];

    it('queries by clienteId via sistema relation', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.admin.eventoBitacora.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sistema: { clienteId: mockClienteId } },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('filters by tipo when provided', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
        tipo: 'Decisión',
      });

      expect(mockPrisma.admin.eventoBitacora.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sistema: { clienteId: mockClienteId },
            tipo: 'Decisión',
          },
        }),
      );
    });

    it('returns paginated response with correct shape', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(mockEventos);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 20);
      expect(result.pagination).toHaveProperty('total', 1);
      expect(result.pagination).toHaveProperty('totalPages', 1);
    });

    it('handles empty results gracefully', async () => {
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue([]);
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(0);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('returns formatted date strings', async () => {
      const eventosWithDates = [
        {
          ...mockEventos[0],
          fecha: new Date('2026-06-30T10:00:00.000Z'),
        },
      ];
      mockPrisma.admin.eventoBitacora.findMany.mockResolvedValue(
        eventosWithDates,
      );
      mockPrisma.admin.eventoBitacora.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].fecha).toBe('2026-06-30T10:00:00.000Z');
    });
  });

  describe('create', () => {
    const createDto = {
      sistemaId: mockSistemaId,
      tipo: 'Decisión' as const,
      titulo: 'Nuevo evento',
      descripcion: 'Descripción',
      siguienteAccion: 'Siguiente paso',
    };

    it('validates FK: sistemaId belongs to clienteId', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockClienteId, createDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.admin.sistema.findFirst).toHaveBeenCalledWith({
        where: { id: mockSistemaId, clienteId: mockClienteId },
      });
    });

    it('creates evento when FK validation passes', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue({
        id: mockSistemaId,
        tenantId: mockTenantId,
      });

      const createdEvento = {
        id: mockEventoId,
        sistemaId: mockSistemaId,
        tenantId: mockTenantId,
        tipo: 'Decisión',
        titulo: 'Nuevo evento',
        descripcion: 'Descripción',
        siguienteAccion: 'Siguiente paso',
        fecha: new Date('2026-06-30T10:00:00Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      };
      mockPrisma.admin.eventoBitacora.create.mockResolvedValue(createdEvento);

      const result = await service.create(mockClienteId, createDto);

      expect(mockPrisma.admin.eventoBitacora.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          sistemaId: mockSistemaId,
          tipo: 'Decisión',
          titulo: 'Nuevo evento',
          descripcion: 'Descripción',
          siguienteAccion: 'Siguiente paso',
        },
        include: {
          sistema: { select: { id: true, nombreSistema: true } },
        },
      });
      expect(result.id).toBe(mockEventoId);
    });

    it('creates evento with null optional fields when not provided', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue({
        id: mockSistemaId,
        tenantId: mockTenantId,
      });

      const minimalDto = {
        sistemaId: mockSistemaId,
        tipo: 'Decisión' as const,
        titulo: 'Minimal event',
      };

      const createdEvento = {
        id: mockEventoId,
        sistemaId: mockSistemaId,
        tenantId: mockTenantId,
        tipo: 'Decisión',
        titulo: 'Minimal event',
        descripcion: null,
        siguienteAccion: null,
        fecha: new Date('2026-06-30T10:00:00Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      };
      mockPrisma.admin.eventoBitacora.create.mockResolvedValue(createdEvento);

      const result = await service.create(mockClienteId, minimalDto);

      expect(mockPrisma.admin.eventoBitacora.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          sistemaId: mockSistemaId,
          tipo: 'Decisión',
          titulo: 'Minimal event',
          descripcion: null,
          siguienteAccion: null,
        },
        include: {
          sistema: { select: { id: true, nombreSistema: true } },
        },
      });
      expect(result.descripcion).toBeNull();
      expect(result.siguienteAccion).toBeNull();
    });

    it('returns formatted response', async () => {
      mockPrisma.admin.sistema.findFirst.mockResolvedValue({
        id: mockSistemaId,
        tenantId: mockTenantId,
      });

      const createdEvento = {
        id: mockEventoId,
        sistemaId: mockSistemaId,
        tenantId: mockTenantId,
        tipo: 'Decisión',
        titulo: 'Nuevo evento',
        descripcion: null,
        siguienteAccion: null,
        fecha: new Date('2026-06-30T10:00:00.000Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      };
      mockPrisma.admin.eventoBitacora.create.mockResolvedValue(createdEvento);

      const result = await service.create(mockClienteId, createDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sistema');
      expect(result).toHaveProperty('fecha');
      expect(result).toHaveProperty('tipo');
      expect(result).toHaveProperty('titulo');
    });
  });
});
