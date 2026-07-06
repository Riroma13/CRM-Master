import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { PrismaService } from '../../common/prisma.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  // Use test-specific IDs to avoid collisions with parallel test runs
  const TENANT_PREFIX = 'd2ten-0000-4000-8000';
  const CLIENT_PREFIX = 'd2cli-0000-4000-8000';
  const TAREA_PREFIX = 'd2tar-0000-4000-8000';

  const TENANT_A_ID = `${TENANT_PREFIX}-000000000001`;
  const TENANT_B_ID = `${TENANT_PREFIX}-000000000002`;

  const CLIENT_IDS = {
    garza: `${CLIENT_PREFIX}-000000000001`,
    garcia: `${CLIENT_PREFIX}-000000000002`,
    lopez: `${CLIENT_PREFIX}-000000000003`,
    rodriguez: `${CLIENT_PREFIX}-000000000004`,
    martinez: `${CLIENT_PREFIX}-000000000005`,
    fernandez: `${CLIENT_PREFIX}-000000000006`,
    gonzalez: `${CLIENT_PREFIX}-000000000007`,
    perez: `${CLIENT_PREFIX}-000000000008`,
  };

  const ALL_IDS = {
    tenants: [TENANT_A_ID, TENANT_B_ID],
    clients: Object.values(CLIENT_IDS),
    tareas: [
      `${TAREA_PREFIX}-000000000001`,
      `${TAREA_PREFIX}-000000000002`,
      `${TAREA_PREFIX}-000000000003`,
      `${TAREA_PREFIX}-000000000004`,
      `${TAREA_PREFIX}-000000000005`,
    ],
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [ClientsService, PrismaService],
    }).compile();

    service = moduleRef.get(ClientsService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    // Only clean our own test data, not everything
    await prisma.admin.tarea.deleteMany({ where: { id: { in: ALL_IDS.tareas } } });
    await prisma.admin.cliente.deleteMany({ where: { id: { in: ALL_IDS.clients } } });
    await prisma.admin.tenant.deleteMany({ where: { id: { in: ALL_IDS.tenants } } });

    // Seed tenants
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A_ID, slug: 'clients-tenant-a', name: 'Clients Tenant A', isActive: true },
        { id: TENANT_B_ID, slug: 'clients-tenant-b', name: 'Clients Tenant B', isActive: true },
      ],
    });

    // Seed 8 clients across tenants with varied attributes (no accented names for test reliability)
    await prisma.admin.cliente.createMany({
      data: [
        { id: CLIENT_IDS.garza, tenantId: TENANT_A_ID, nombre: 'Garza y Asociados', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal', 'VPS'] },
        { id: CLIENT_IDS.garcia, tenantId: TENANT_B_ID, nombre: 'Garcia Consulting', saludGeneral: '🟡', estadoRelacion: 'Activo', tags: ['contable'] },
        { id: CLIENT_IDS.lopez, tenantId: TENANT_A_ID, nombre: 'Lopez Asociados', saludGeneral: '🟢', estadoRelacion: 'Activo', tags: ['fiscal'] },
        { id: CLIENT_IDS.rodriguez, tenantId: TENANT_A_ID, nombre: 'Rodriguez e Hijos', saludGeneral: '🔴', estadoRelacion: 'Activo', tags: ['critico'] },
        { id: CLIENT_IDS.martinez, tenantId: TENANT_B_ID, nombre: 'Martinez SA', saludGeneral: '🟡', estadoRelacion: 'En pausa', tags: ['contable', 'factura'] },
        { id: CLIENT_IDS.fernandez, tenantId: TENANT_A_ID, nombre: 'Fernandez Global', saludGeneral: '🟢', estadoRelacion: 'Cerrado', tags: ['fiscal'] },
        { id: CLIENT_IDS.gonzalez, tenantId: TENANT_B_ID, nombre: 'Gonzalez y Cia', saludGeneral: '🔴', estadoRelacion: 'Activo', tags: ['critico', 'factura'] },
        { id: CLIENT_IDS.perez, tenantId: TENANT_A_ID, nombre: 'Perez Tech', saludGeneral: '🟢', estadoRelacion: 'Prospecto', tags: ['tech'] },
      ],
    });

    // Seed tareas for tareasPendientes test
    // garza (tenant A): 4 tareas (1 Hecho, 3 Pendiente) -> tareasPendientes: 3
    // garcia (tenant B): 2 tareas (0 Hecho, 2 Pendiente) -> tareasPendientes: 2
    await prisma.admin.tarea.createMany({
      data: [
        { id: `${TAREA_PREFIX}-000000000001`, tenantId: TENANT_A_ID, clienteId: CLIENT_IDS.garza, titulo: 'Hecho Garza', estado: 'Hecho' },
        { id: `${TAREA_PREFIX}-000000000002`, tenantId: TENANT_A_ID, clienteId: CLIENT_IDS.garza, titulo: 'Pendiente Garza 1', estado: 'Pendiente' },
        { id: `${TAREA_PREFIX}-000000000003`, tenantId: TENANT_A_ID, clienteId: CLIENT_IDS.garza, titulo: 'Pendiente Garza 2', estado: 'Pendiente' },
        { id: `${TAREA_PREFIX}-000000000004`, tenantId: TENANT_B_ID, clienteId: CLIENT_IDS.garcia, titulo: 'Pendiente Garcia C 1', estado: 'Pendiente' },
        { id: `${TAREA_PREFIX}-000000000005`, tenantId: TENANT_B_ID, clienteId: CLIENT_IDS.garcia, titulo: 'Pendiente Garcia C 2', estado: 'Pendiente' },
      ],
    });
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.tarea.deleteMany({ where: { id: { in: ALL_IDS.tareas } } });
      await prisma.admin.cliente.deleteMany({ where: { id: { in: ALL_IDS.clients } } });
      await prisma.admin.tenant.deleteMany({ where: { id: { in: ALL_IDS.tenants } } });
      await moduleRef.close();
    }
  });

  // ─── Pagination ──────────────────────────────────────────────

  describe('pagination', () => {
    it('should return default pagination (page=1, limit=20) when no params given', async () => {
      const result = await service.findAll({} as any);
      expect(result.data.length).toBe(8);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(8);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should return second page with correct limit', async () => {
      const result = await service.findAll({ page: 2, limit: 3 } as any);
      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(8);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should return last page with remaining items', async () => {
      const result = await service.findAll({ page: 3, limit: 3 } as any);
      expect(result.data.length).toBe(2);
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.totalPages).toBe(3);
    });
  });

  // ─── Search ───────────────────────────────────────────────────

  describe('search (case-insensitive)', () => {
    it('should find clients by case-insensitive partial match on nombre', async () => {
      const result = await service.findAll({ search: 'gar' } as any);
      expect(result.data.length).toBe(2);
      const names = result.data.map((c: any) => c.nombre);
      expect(names).toContain('Garza y Asociados');
      expect(names).toContain('Garcia Consulting');
    });

    it('should match regardless of case', async () => {
      const result = await service.findAll({ search: 'GARCIA' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Garcia Consulting');
    });

    it('should return empty data when no match', async () => {
      const result = await service.findAll({ search: 'zzz' } as any);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should match partial substrings', async () => {
      const result = await service.findAll({ search: 'Tech' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Perez Tech');
    });
  });

  // ─── Salud filter ────────────────────────────────────────────

  describe('salud filter', () => {
    it('should return only clients with 🟢 saludGeneral', async () => {
      const result = await service.findAll({ salud: '🟢' } as any);
      expect(result.data.length).toBe(4);
      result.data.forEach((c: any) => {
        expect(c.saludGeneral).toBe('🟢');
      });
    });

    it('should return only clients with 🟡 saludGeneral', async () => {
      const result = await service.findAll({ salud: '🟡' } as any);
      expect(result.data.length).toBe(2);
      result.data.forEach((c: any) => {
        expect(c.saludGeneral).toBe('🟡');
      });
    });

    it('should return only clients with 🔴 saludGeneral', async () => {
      const result = await service.findAll({ salud: '🔴' } as any);
      expect(result.data.length).toBe(2);
      result.data.forEach((c: any) => {
        expect(c.saludGeneral).toBe('🔴');
      });
    });
  });

  // ─── Tag filter ──────────────────────────────────────────────

  describe('tag filter', () => {
    it('should return only clients with matching tag', async () => {
      const result = await service.findAll({ tag: 'fiscal' } as any);
      expect(result.data.length).toBe(3);
      result.data.forEach((c: any) => {
        expect(c.tags).toContain('fiscal');
      });
    });

    it('should return empty when no client has the tag', async () => {
      const result = await service.findAll({ tag: 'nonexistent' } as any);
      expect(result.data).toEqual([]);
    });
  });

  // ─── Estado filter ──────────────────────────────────────────

  describe('estado filter', () => {
    it('should return only clients with matching estadoRelacion', async () => {
      const result = await service.findAll({ estado: 'Activo' } as any);
      expect(result.data.every((c: any) => c.estadoRelacion === 'Activo')).toBe(true);
    });

    it('should return clients with Cerrado estadoRelacion', async () => {
      const result = await service.findAll({ estado: 'Cerrado' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Fernandez Global');
    });
  });

  // ─── Filter composition ──────────────────────────────────────

  describe('filter composition', () => {
    it('should AND-combine search + salud + tag filters', async () => {
      const result = await service.findAll({ search: 'gar', salud: '🟡', tag: 'contable' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Garcia Consulting');
    });

    it('should compose search + salud filters', async () => {
      const result = await service.findAll({ search: 'gar', salud: '🟢' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Garza y Asociados');
    });

    it('should compose tag + estado filters', async () => {
      const result = await service.findAll({ tag: 'factura', estado: 'Activo' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].nombre).toBe('Gonzalez y Cia');
    });

    it('should return empty when filters cannot be satisfied together', async () => {
      const result = await service.findAll({ search: 'garcia', estado: 'Cerrado' } as any);
      expect(result.data).toEqual([]);
    });
  });

  // ─── tareasPendientes count ──────────────────────────────────

  describe('tareasPendientes count per client', () => {
    it('should include tareasPendientes field for each client', async () => {
      const result = await service.findAll({} as any);
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((c: any) => {
        expect(c).toHaveProperty('tareasPendientes');
        expect(typeof c.tareasPendientes).toBe('number');
      });
    });

    it('should return correct tareasPendientes count (2 non-Hecho for Garza)', async () => {
      const result = await service.findAll({ search: 'Garza y Asociados' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].tareasPendientes).toBe(2);
    });

    it('should return correct tareasPendientes count (2 non-Hecho for Garcia Consulting)', async () => {
      const result = await service.findAll({ search: 'Garcia Consulting' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].tareasPendientes).toBe(2);
    });

    it('should return 0 tareasPendientes for clients with no tareas', async () => {
      const result = await service.findAll({ search: 'Lopez Asociados' } as any);
      expect(result.data.length).toBe(1);
      expect(result.data[0].tareasPendientes).toBe(0);
    });

    it('should not count Hecho tareas as pending', async () => {
      // garza has 1 Hecho + 2 Pendiente => 2 pending
      const result = await service.findAll({ search: 'Garza y Asociados' } as any);
      expect(result.data[0].tareasPendientes).toBe(2);
    });
  });
});
