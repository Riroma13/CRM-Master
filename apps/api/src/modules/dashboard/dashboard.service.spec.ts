import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma.service';

/**
 * Helper to create a fresh module for each test suite.
 */
async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [DashboardService, PrismaService],
  }).compile();

  const service = moduleRef.get(DashboardService);
  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();

  return { moduleRef, service, prisma };
}

async function destroyModule(
  moduleRef: TestingModule,
  prisma: PrismaService,
  tenantIds: string[],
) {
  await prisma.admin.tarea.deleteMany({
    where: { tenantId: { in: tenantIds } },
  });
  await prisma.admin.cliente.deleteMany({
    where: { tenantId: { in: tenantIds } },
  });
  await prisma.admin.tenant.deleteMany({
    where: { id: { in: tenantIds } },
  });
  await moduleRef.close();
}

describe('DashboardService — with seed data', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_A_ID = 'd1000000-0000-4000-8000-000000000001';
  const TENANT_B_ID = 'd1000000-0000-4000-8000-000000000002';
  const TENANT_C_ID = 'd1000000-0000-4000-8000-000000000003';
  const ALL_IDS = [TENANT_A_ID, TENANT_B_ID, TENANT_C_ID];

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());

    // Seed tenants: A (active), B (active), C (inactive)
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: 'metrics-tenant-a', name: 'Metrics Tenant A', isActive: true },
        { id: TENANT_B_ID, slug: 'metrics-tenant-b', name: 'Metrics Tenant B', isActive: true },
        { id: TENANT_C_ID, slug: 'metrics-tenant-c', name: 'Metrics Tenant C', isActive: false },
      ],
    });

    // Seed clients across tenants
    // Tenant A: 3 clients (🟢, 🟡, 🔴)
    // Tenant B: 2 clients (🟢, 🟡)
    // Tenant C: 0 clients (inactive tenant)
    await prisma.admin.cliente.createMany({
      data: [
        { id: 'd1c00001-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, nombre: 'Client A1', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal'] },
        { id: 'd1c00002-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, nombre: 'Client A2', saludGeneral: '🟡', estadoRelacion: 'Activo', tags: ['contable'] },
        { id: 'd1c00003-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, nombre: 'Client A3', saludGeneral: '🔴', estadoRelacion: 'Activo', tags: ['critico'] },
        { id: 'd1c00004-0000-4000-8000-000000000001', tenantId: TENANT_B_ID, nombre: 'Client B1', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal'] },
        { id: 'd1c00005-0000-4000-8000-000000000001', tenantId: TENANT_B_ID, nombre: 'Client B2', saludGeneral: '🟡', estadoRelacion: 'En pausa', tags: ['contable'] },
      ],
    });

    // Seed tareas
    // A1: 1 Hecho + 2 Pendiente = 2 tareasPendientes
    // A2: 1 Pendiente = 1 tareaPendiente
    // A3: 0 tareas
    // B1: 0 tareas
    // B2: 0 tareas
    await prisma.admin.tarea.createMany({
      data: [
        { id: 'd1t00001-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, clienteId: 'd1c00001-0000-4000-8000-000000000001', titulo: 'Completada A1', estado: 'Hecho' },
        { id: 'd1t00002-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, clienteId: 'd1c00001-0000-4000-8000-000000000001', titulo: 'Pendiente A1-1', estado: 'Pendiente' },
        { id: 'd1t00003-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, clienteId: 'd1c00001-0000-4000-8000-000000000001', titulo: 'Pendiente A1-2', estado: 'Pendiente' },
        { id: 'd1t00004-0000-4000-8000-000000000001', tenantId: TENANT_A_ID, clienteId: 'd1c00002-0000-4000-8000-000000000001', titulo: 'Pendiente A2', estado: 'Pendiente' },
      ],
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma, ALL_IDS);
  });

  it('should return totalClientes counting all clients across all tenants', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.totalClientes).toBe(5);
  });

  it('should return activos as totalClientes count', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.activos).toBe(5);
  });

  it('should return conIncidencias counting 🟡 clients only', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.conIncidencias).toBe(2);
  });

  it('should return criticos counting 🔴 clients only', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.criticos).toBe(1);
  });

  it('should return tareasPendientesGlobales as count of non-Hecho tareas', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.tareasPendientesGlobales).toBe(3);
  });

  it('should return tenantsActivos as count of active tenants', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.tenantsActivos).toBe(2);
  });

  it('should return ultimaActualizacion as ISO timestamp', async () => {
    const result = await service.getMetrics();
    expect(result.ultimaActualizacion).toBeDefined();
    expect(typeof result.ultimaActualizacion).toBe('string');
    expect(() => new Date(result.ultimaActualizacion)).not.toThrow();
  });

  it('should return all expected metric fields', async () => {
    const result = await service.getMetrics();
    expect(result).toHaveProperty('metrics');
    expect(result.metrics).toHaveProperty('totalClientes');
    expect(result.metrics).toHaveProperty('activos');
    expect(result.metrics).toHaveProperty('conIncidencias');
    expect(result.metrics).toHaveProperty('criticos');
    expect(result.metrics).toHaveProperty('tareasPendientesGlobales');
    expect(result.metrics).toHaveProperty('tenantsActivos');
  });
});

describe('DashboardService — zero-count edge case', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_A_ID = 'd1000000-0000-4000-8000-000000000010';
  const TENANT_B_ID = 'd1000000-0000-4000-8000-000000000011';
  const ALL_IDS = [TENANT_A_ID, TENANT_B_ID];

  beforeAll(async () => {
    ({ moduleRef, service, prisma } = await createTestModule());

    // Seed only tenants (with no clients or tareas)
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: 'empty-tenant-a', name: 'Empty Tenant A', isActive: true },
        { id: TENANT_B_ID, slug: 'empty-tenant-b', name: 'Empty Tenant B', isActive: false },
      ],
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma, ALL_IDS);
  });

  it('should return zero for client and tarea counts when no data exists', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.totalClientes).toBe(0);
    expect(result.metrics.activos).toBe(0);
    expect(result.metrics.conIncidencias).toBe(0);
    expect(result.metrics.criticos).toBe(0);
    expect(result.metrics.tareasPendientesGlobales).toBe(0);
  });

  it('should return tenantsActivos as count of active tenants only', async () => {
    const result = await service.getMetrics();
    expect(result.metrics.tenantsActivos).toBe(1);
  });
});
