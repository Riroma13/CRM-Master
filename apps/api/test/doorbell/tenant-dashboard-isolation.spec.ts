/**
 * 🔔 DOORBELL TEST — Tenant Dashboard isolation gate
 *
 * CRÍTICO: Este test DEBE fallar si el dashboard de un tenant
 * incluye métricas de otro tenant.
 *
 * Si falla → DETENER el deploy hasta investigar la fuga.
 *
 * NOTA: Requiere DATABASE_URL o DATABASE_TEST_URL para ejecutarse.
 * Si no hay base de datos disponible, el suite se skippea.
 */
import { createPrismaClient } from '@crm-master/database';

const TENANT_A_ID = '00000000-0000-0000-0000-000000000011';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000012';
const TENANT_SLUG_A = 'doorbell-dash-a';
const TENANT_SLUG_B = 'doorbell-dash-b';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

if (dbAvailable) {
  describe('🔔 DOORBELL — Tenant Dashboard isolation gate', () => {
    let prismaA: ReturnType<typeof createPrismaClient>;
    let prismaB: ReturnType<typeof createPrismaClient>;
    let prismaAdmin: ReturnType<typeof createPrismaClient>;

    beforeAll(async () => {
      prismaAdmin = createPrismaClient();

      await prismaAdmin.cliente.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });
      await prismaAdmin.sistema.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });

      const upsertTenant = async (id: string, slug: string, name: string) => {
        await prismaAdmin.tenant.upsert({
          where: { id },
          create: { id, slug, name },
          update: {},
        });
      };

      await upsertTenant(TENANT_A_ID, TENANT_SLUG_A, 'Dashboard Tenant A');
      await upsertTenant(TENANT_B_ID, TENANT_SLUG_B, 'Dashboard Tenant B');

      prismaA = createPrismaClient(TENANT_A_ID);
      prismaB = createPrismaClient(TENANT_B_ID);
    });

    afterAll(async () => {
      if (prismaAdmin) {
        await prismaAdmin.cliente.deleteMany({
          where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
        await prismaAdmin.sistema.deleteMany({
          where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
        });
      }
      await prismaAdmin.$disconnect();
    });

    it('MUST NOT leak client counts between tenants', async () => {
      await prismaA.cliente.deleteMany();
      await prismaB.cliente.deleteMany();

      await prismaA.cliente.create({ data: { nombre: 'Cliente-A-1' } });
      await prismaA.cliente.create({ data: { nombre: 'Cliente-A-2' } });
      await prismaA.cliente.create({ data: { nombre: 'Cliente-A-3' } });
      await prismaA.cliente.create({ data: { nombre: 'Cliente-A-4' } });
      await prismaA.cliente.create({ data: { nombre: 'Cliente-A-5' } });

      await prismaB.cliente.create({ data: { nombre: 'Cliente-B-1' } });
      await prismaB.cliente.create({ data: { nombre: 'Cliente-B-2' } });

      const countA = await prismaA.cliente.count();
      const countB = await prismaB.cliente.count();

      expect(countA).toBe(5);
      expect(countB).toBe(2);
    });

    it('MUST scope eventoBitacora queries between tenants', async () => {
      await prismaA.eventoBitacora.deleteMany();
      await prismaB.eventoBitacora.deleteMany();
      await prismaA.sistema.deleteMany();
      await prismaB.sistema.deleteMany();

      const sistemaA = await prismaA.sistema.create({
        data: { nombreSistema: 'Sistema-A', tipo: 'test' },
      });
      const sistemaB = await prismaB.sistema.create({
        data: { nombreSistema: 'Sistema-B', tipo: 'test' },
      });

      await prismaA.eventoBitacora.create({
        data: { sistemaId: sistemaA.id, tipo: 'decision', titulo: 'Evento-A' },
      });
      await prismaB.eventoBitacora.create({
        data: { sistemaId: sistemaB.id, tipo: 'incidencia', titulo: 'Evento-B' },
      });

      const eventosA = await prismaA.eventoBitacora.findMany();
      const eventosB = await prismaB.eventoBitacora.findMany();

      expect(eventosA).toHaveLength(1);
      expect(eventosA[0].titulo).toBe('Evento-A');
      expect(eventosB).toHaveLength(1);
      expect(eventosB[0].titulo).toBe('Evento-B');
    });
  });
} else {
  describe('🔔 DOORBELL — Tenant Dashboard isolation gate', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn(
        '[DOORBELL] Skipping: DATABASE_URL not set. These tests require a real database.',
      );
    });
  });
}
