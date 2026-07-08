import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../../common/prisma.service';
import { LocalCalendarProvider } from './local-calendar-provider';

describe('CitasService', () => {
  let service: CitasService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_A_ID = 'd5s00000-0000-4000-8000-000000000001';
  const TENANT_B_ID = 'd5s00000-0000-4000-8000-000000000002';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [CitasService, LocalCalendarProvider, PrismaService],
    }).compile();

    service = moduleRef.get(CitasService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    // Clean any residual data
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });

    // Seed tenants (upsert to survive parallel worker cleanups)
    for (const t of [
      { id: TENANT_A_ID, slug: 'citas-svc-a', name: 'Citas Service A' },
      { id: TENANT_B_ID, slug: 'citas-svc-b', name: 'Citas Service B' },
    ]) {
      await prisma.admin.tenant.upsert({
        where: { id: t.id },
        update: {},
        create: { id: t.id, slug: t.slug, name: t.name, isActive: true },
      });
    }

    // Seed citas: 2 for tenant A, 1 for tenant B
    await prisma.admin.cita.createMany({
      data: [
        {
          tenantId: TENANT_A_ID,
          fecha: new Date('2026-09-10T10:00:00Z'),
          duracion: 30,
          estado: 'pendiente',
          titulo: 'Cita A1',
        },
        {
          tenantId: TENANT_A_ID,
          fecha: new Date('2026-09-10T11:00:00Z'),
          duracion: 30,
          estado: 'confirmada',
          titulo: 'Cita A2',
        },
        {
          tenantId: TENANT_B_ID,
          fecha: new Date('2026-09-10T10:00:00Z'),
          duracion: 30,
          estado: 'pendiente',
          titulo: 'Cita B1',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    if (moduleRef) await moduleRef.close();
  });

  describe('listCitas', () => {
    it('should return only citas scoped to the given tenantId', async () => {
      const citas = await service.listCitas(TENANT_A_ID);
      expect(citas.length).toBe(2);
      citas.forEach((c: any) => {
        expect(c.tenantId).toBe(TENANT_A_ID);
      });
    });

    it('should return citas in descending order by fecha', async () => {
      const citas = await service.listCitas(TENANT_A_ID);
      expect(citas.length).toBe(2);
      // Both citas for TENANT_A are on the same date, so order by creation
      // They have the same fecha but were created in sequence
      expect(citas[0].titulo).toBe('Cita A2');
      expect(citas[1].titulo).toBe('Cita A1');
    });

    it('should return all states (pendiente, confirmada, etc.)', async () => {
      const citas = await service.listCitas(TENANT_A_ID);
      const estados = citas.map((c: any) => c.estado);
      expect(estados).toContain('pendiente');
      expect(estados).toContain('confirmada');
    });

    it('should return empty array when tenant has no citas', async () => {
      // Use a tenant ID that exists but has no citas — TENANT_B has 1 cita
      // Let's use a nonexistent tenant instead
      const citas = await service.listCitas('00000000-0000-0000-0000-000000000000');
      expect(citas).toEqual([]);
    });

    it('should NOT leak citas from other tenants', async () => {
      const citasA = await service.listCitas(TENANT_A_ID);
      const citasB = await service.listCitas(TENANT_B_ID);

      const idsA = citasA.map((c: any) => c.id);
      const idsB = citasB.map((c: any) => c.id);

      // No overlap
      const intersection = idsA.filter((id: string) => idsB.includes(id));
      expect(intersection).toEqual([]);

      // Each has correct count
      expect(citasA.length).toBe(2);
      expect(citasB.length).toBe(1);
    });
  });
});
