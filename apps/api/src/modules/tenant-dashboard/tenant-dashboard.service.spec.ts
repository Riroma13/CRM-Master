import { Test, TestingModule } from '@nestjs/testing';
import { TenantDashboardService } from './tenant-dashboard.service';
import { PrismaService } from '../../common/prisma.service';

function createMockScoped() {
  return {
    cliente: { count: jest.fn() },
    cita: { count: jest.fn() },
    tarea: { count: jest.fn() },
    sistema: { count: jest.fn() },
    eventoBitacora: { findMany: jest.fn() },
    documento: { count: jest.fn() },
  };
}

function createModule(mockScoped: ReturnType<typeof createMockScoped>) {
  const mockPrisma = {
    forTenant: jest.fn().mockReturnValue(mockScoped),
    admin: {} as any,
  };

  return Test.createTestingModule({
    providers: [
      TenantDashboardService,
      { provide: PrismaService, useValue: mockPrisma },
    ],
  }).compile();
}

describe('TenantDashboardService', () => {
  let service: TenantDashboardService;
  let mockScoped: ReturnType<typeof createMockScoped>;
  let moduleRef: TestingModule;

  const TENANT_ID = 'test-tenant-uuid';

  afterEach(async () => {
    if (moduleRef) await moduleRef.close();
  });

  describe('happy path — full data', () => {
    beforeEach(async () => {
      mockScoped = createMockScoped();
      mockScoped.cliente.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(12);
      mockScoped.cita.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(20);
      mockScoped.tarea.count
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(25);
      mockScoped.sistema.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(10);
      mockScoped.documento.count.mockResolvedValueOnce(50);
      mockScoped.eventoBitacora.findMany.mockResolvedValueOnce([
        { id: 'e1', fecha: new Date('2026-07-17T10:00:00Z'), tipo: 'decision', titulo: 'Evento 1', descripcion: 'Desc 1' },
        { id: 'e2', fecha: new Date('2026-07-16T10:00:00Z'), tipo: 'incidencia', titulo: 'Evento 2' },
        { id: 'e3', fecha: new Date('2026-07-15T10:00:00Z'), tipo: 'reunion', titulo: 'Evento 3' },
        { id: 'e4', fecha: new Date('2026-07-14T10:00:00Z'), tipo: 'aprendizaje', titulo: 'Evento 4' },
        { id: 'e5', fecha: new Date('2026-07-13T10:00:00Z'), tipo: 'decision', titulo: 'Evento 5' },
      ]);

      moduleRef = await createModule(mockScoped);
      service = moduleRef.get(TenantDashboardService);
    });

    it('should call forTenant with the provided tenantId', async () => {
      const prisma = moduleRef.get(PrismaService);
      await service.getDashboard(TENANT_ID);
      expect(prisma.forTenant).toHaveBeenCalledWith(TENANT_ID);
    });

    it('should return all 8 metric fields with correct values', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.totalClientes).toBe(15);
      expect(result.clientesActivos).toBe(12);
      expect(result.citasHoy).toBe(3);
      expect(result.citasPendientes).toBe(8);
      expect(result.citasSemana).toBe(20);
      expect(result.tareasPendientes).toBe(7);
      expect(result.sistemasActivos).toBe(5);
      expect(result.ultimosEventos).toHaveLength(5);
    });

    it('should return ultimaActualizacion as ISO timestamp', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.ultimaActualizacion).toBeDefined();
      expect(typeof result.ultimaActualizacion).toBe('string');
      expect(() => new Date(result.ultimaActualizacion)).not.toThrow();
    });

    it('should return eventosRecientes alongside ultimosEventos for backward compat', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.eventosRecientes).toHaveLength(5);
      expect(result.ultimosEventos).toEqual(result.eventosRecientes);
    });

    it('should cap ultimosEventos at 5', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.ultimosEventos.length).toBeLessThanOrEqual(5);
    });

    it('should return onboardingChecklist with steps', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.onboardingChecklist).toBeDefined();
      expect(result.onboardingChecklist!.steps).toHaveLength(4);
      expect(result.onboardingChecklist!.steps[0]).toEqual({
        id: 'cliente', label: 'Primer cliente', done: true,
      });
    });
  });

  describe('error handling — Prisma failure', () => {
    beforeEach(async () => {
      mockScoped = createMockScoped();
      mockScoped.cliente.count.mockRejectedValue(new Error('DB connection lost'));

      moduleRef = await createModule(mockScoped);
      service = moduleRef.get(TenantDashboardService);
    });

    it('should throw when Prisma query fails', async () => {
      await expect(service.getDashboard(TENANT_ID)).rejects.toThrow();
    });

    it('should propagate the original error message', async () => {
      await expect(service.getDashboard(TENANT_ID)).rejects.toThrow('DB connection lost');
    });
  });

  describe('empty tenant — zero counts', () => {
    beforeEach(async () => {
      mockScoped = createMockScoped();
      mockScoped.cliente.count.mockResolvedValue(0);
      mockScoped.cita.count.mockResolvedValue(0);
      mockScoped.tarea.count.mockResolvedValue(0);
      mockScoped.sistema.count.mockResolvedValue(0);
      mockScoped.documento.count.mockResolvedValue(0);
      mockScoped.eventoBitacora.findMany.mockResolvedValue([]);

      moduleRef = await createModule(mockScoped);
      service = moduleRef.get(TenantDashboardService);
    });

    it('should return zero for all counts', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.totalClientes).toBe(0);
      expect(result.clientesActivos).toBe(0);
      expect(result.citasHoy).toBe(0);
      expect(result.citasPendientes).toBe(0);
      expect(result.citasSemana).toBe(0);
      expect(result.tareasPendientes).toBe(0);
      expect(result.sistemasActivos).toBe(0);
    });

    it('should return empty array for ultimosEventos', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.ultimosEventos).toEqual([]);
    });

    it('should return onboardingChecklist with all steps not done', async () => {
      const result = await service.getDashboard(TENANT_ID);
      expect(result.onboardingChecklist!.steps.every((s) => !s.done)).toBe(true);
    });
  });
});
