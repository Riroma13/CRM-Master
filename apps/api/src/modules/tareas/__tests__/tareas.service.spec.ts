import { Test, TestingModule } from '@nestjs/testing';
import { TareasService } from '../tareas.service';
import { PrismaService } from '../../../common/prisma.service';

const mockClienteId = '11111111-1111-4111-a111-111111111111';
const mockSistemaId = '22222222-2222-4222-a222-222222222222';
const mockTareaId = '55555555-5555-4555-a555-555555555555';

function createMockPrisma() {
  return {
    admin: {
      tarea: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    },
  };
}

describe('TareasService', () => {
  let service: TareasService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TareasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TareasService>(TareasService);
  });

  describe('findAll', () => {
    const mockTareas = [
      {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Tarea 1',
        estado: 'Pendiente',
        prioridad: 'Media',
        fechaLimite: new Date('2026-08-01T00:00:00Z'),
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      },
    ];

    it('queries by clienteId', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.admin.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId: mockClienteId },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('filters by estado when provided', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
        estado: 'Pendiente',
      });

      expect(mockPrisma.admin.tarea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clienteId: mockClienteId, estado: 'Pendiente' },
        }),
      );
    });

    it('does not filter by estado when not provided', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      const whereClause =
        mockPrisma.admin.tarea.findMany.mock.calls[0][0].where;
      expect(whereClause).toEqual({ clienteId: mockClienteId });
      expect(whereClause).not.toHaveProperty('estado');
    });

    it('returns paginated response with correct shape', async () => {
      mockPrisma.admin.tarea.findMany.mockResolvedValue(mockTareas);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

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
      mockPrisma.admin.tarea.findMany.mockResolvedValue([]);
      mockPrisma.admin.tarea.count.mockResolvedValue(0);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('returns fechaLimite as ISO string or null', async () => {
      const tareasWithDate = [
        {
          ...mockTareas[0],
          fechaLimite: new Date('2026-08-01T00:00:00.000Z'),
        },
      ];
      mockPrisma.admin.tarea.findMany.mockResolvedValue(tareasWithDate);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].fechaLimite).toBe('2026-08-01T00:00:00.000Z');
    });

    it('returns null fechaLimite when not set', async () => {
      const tareasNoDate = [
        {
          ...mockTareas[0],
          fechaLimite: null,
        },
      ];
      mockPrisma.admin.tarea.findMany.mockResolvedValue(tareasNoDate);
      mockPrisma.admin.tarea.count.mockResolvedValue(1);

      const result = await service.findAll(mockClienteId, {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].fechaLimite).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a tarea with default estado "Pendiente"', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Nueva tarea',
        prioridad: 'Media',
        estado: 'Pendiente',
        fechaLimite: null,
        sistema: null,
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      const result = await service.create(mockClienteId, {
        titulo: 'Nueva tarea',
        prioridad: 'Media',
      });

      expect(mockPrisma.admin.tarea.create).toHaveBeenCalledWith({
        data: {
          clienteId: mockClienteId,
          titulo: 'Nueva tarea',
          prioridad: 'Media',
          estado: 'Pendiente',
        },
        include: {
          sistema: { select: { id: true, nombreSistema: true } },
        },
      });
      expect(result.estado).toBe('Pendiente');
    });

    it('includes sistemaId when provided', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Tarea con sistema',
        prioridad: 'Alta',
        estado: 'Pendiente',
        fechaLimite: null,
        sistema: { id: mockSistemaId, nombreSistema: 'Sistema Test' },
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      await service.create(mockClienteId, {
        titulo: 'Tarea con sistema',
        prioridad: 'Alta',
        sistemaId: mockSistemaId,
      });

      expect(mockPrisma.admin.tarea.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sistemaId: mockSistemaId,
          }),
        }),
      );
    });

    it('converts fechaLimite string to Date', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Tarea con fecha',
        prioridad: 'Media',
        estado: 'Pendiente',
        fechaLimite: new Date('2026-08-15T00:00:00Z'),
        sistema: null,
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      await service.create(mockClienteId, {
        titulo: 'Tarea con fecha',
        prioridad: 'Media',
        fechaLimite: '2026-08-15T00:00:00Z',
      });

      expect(mockPrisma.admin.tarea.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fechaLimite: new Date('2026-08-15T00:00:00Z'),
          }),
        }),
      );
    });

    it('does not include fechaLimite when not provided', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Tarea sin fecha',
        prioridad: 'Baja',
        estado: 'Pendiente',
        fechaLimite: null,
        sistema: null,
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      await service.create(mockClienteId, {
        titulo: 'Tarea sin fecha',
        prioridad: 'Baja',
      });

      const createCall = mockPrisma.admin.tarea.create.mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty('fechaLimite');
    });

    it('returns formatted response', async () => {
      const createdTarea = {
        id: mockTareaId,
        clienteId: mockClienteId,
        titulo: 'Formatted tarea',
        prioridad: 'Media',
        estado: 'Pendiente',
        fechaLimite: null,
        sistema: null,
      };
      mockPrisma.admin.tarea.create.mockResolvedValue(createdTarea);

      const result = await service.create(mockClienteId, {
        titulo: 'Formatted tarea',
        prioridad: 'Media',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('titulo');
      expect(result).toHaveProperty('estado');
      expect(result).toHaveProperty('prioridad');
      expect(result).toHaveProperty('fechaLimite');
      expect(result).toHaveProperty('sistema');
    });
  });
});
