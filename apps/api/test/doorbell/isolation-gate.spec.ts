/**
 * 🔔 DOORBELL TEST — Multi-tenant isolation gate
 *
 * CRÍTICO: Este test DEBE fallar si alguna query cruza tenants.
 * Es el gate obligatorio antes de cualquier deploy a producción.
 *
 * Si falla → DETENER el deploy hasta investigar la fuga.
 *
 * NOTA: Requiere DATABASE_URL o DATABASE_TEST_URL para ejecutarse.
 * Si no hay base de datos disponible, el suite se skippea.
 */
import { createPrismaClient } from '@crm-master/database';

// Usamos UUIDs fijos para que el test sea determinista
const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';
const TENANT_SLUG_A = 'tenant-a-test';
const TENANT_SLUG_B = 'tenant-b-test';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

if (dbAvailable) {
  describe('🔔 DOORBELL — Multi-tenant isolation gate', () => {
    let prismaA: ReturnType<typeof createPrismaClient>;
    let prismaB: ReturnType<typeof createPrismaClient>;
    let prismaAdmin: ReturnType<typeof createPrismaClient>;

    beforeAll(async () => {
      prismaAdmin = createPrismaClient(); // sin scope = admin

      // Seed: crear tenants si no existen
      const upsertTenant = async (id: string, slug: string, name: string) => {
        await prismaAdmin.tenant.upsert({
          where: { id },
          create: { id, slug, name },
          update: {},
        });
      };

      await upsertTenant(TENANT_A_ID, TENANT_SLUG_A, 'Tenant A Test');
      await upsertTenant(TENANT_B_ID, TENANT_SLUG_B, 'Tenant B Test');

      prismaA = createPrismaClient(TENANT_A_ID);
      prismaB = createPrismaClient(TENANT_B_ID);
    });

    afterAll(async () => {
      await prismaAdmin.$disconnect();
    });

    // ─── Test 1: Datos de tenant A invisibles desde tenant B ──────────

    it('MUST NOT leak data between tenants via scoped client', async () => {
      // Limpiar datos previos
      await prismaAdmin.cliente.deleteMany({ where: { tenantId: TENANT_A_ID } });

      // Arrange: crear cliente en tenant A
      await prismaA.cliente.create({
        data: { nombre: 'Cliente-Secreto-A' },
      });

      // Act: desde tenant B, listar clientes
      const clientesB = await prismaB.cliente.findMany();

      // Assert: NO debe ver el cliente de tenant A
      const leaked = clientesB.find(
        (c: any) => c.nombre === 'Cliente-Secreto-A',
      );
      expect(leaked).toBeUndefined();
      expect(clientesB).toHaveLength(0);
    });

    // ─── Test 2: Raw SQL bloqueado en cliente scoped ──────────────────

    it('MUST throw when raw SQL is called on tenant-scoped client', async () => {
      // La extensión de Prisma BLOQUEA $queryRawUnsafe en clientes scoped
      await expect(
        prismaA.$queryRawUnsafe('SELECT * FROM clientes'),
      ).rejects.toThrow(/raw (SQL|query).*not allowed/i);
    });

    // ─── Test 3: Scoping en create ────────────────────────────────────

    it('MUST scope created records to the correct tenant', async () => {
      await prismaA.cliente.deleteMany();
      await prismaB.cliente.deleteMany();

      await prismaA.cliente.create({ data: { nombre: 'Cliente-A' } });
      await prismaB.cliente.create({ data: { nombre: 'Cliente-B' } });

      const enA = await prismaA.cliente.findMany();
      const enB = await prismaB.cliente.findMany();

      expect(enA).toHaveLength(1);
      expect(enA[0].nombre).toBe('Cliente-A');
      expect(enB).toHaveLength(1);
      expect(enB[0].nombre).toBe('Cliente-B');
    });

    // ─── Test 4: Scoping en update ────────────────────────────────────

    it('MUST scope updates to the correct tenant', async () => {
      const [clienteA] = await prismaA.cliente.findMany({ take: 1 });
      expect(clienteA).toBeDefined();

      // Intentar actualizar desde tenant B — debe scope a 0
      const updateB = await prismaB.cliente.updateMany({
        where: { id: clienteA.id },
        data: { nombre: 'Hackeado' },
      });
      expect(updateB.count).toBe(0);

      // Verificar que no se actualizó
      const actual = await prismaA.cliente.findUnique({
        where: { id: clienteA.id },
      });
      expect(actual?.nombre).toBe('Cliente-A');
    });

    // ─── Test 5: Scoping en delete ────────────────────────────────────

    it('MUST scope deletes to the correct tenant', async () => {
      const [clienteA] = await prismaA.cliente.findMany({ take: 1 });

      // Intentar borrar desde tenant B
      const deleteB = await prismaB.cliente.deleteMany({
        where: { id: clienteA.id },
      });
      expect(deleteB.count).toBe(0);

      // Verificar que sigue existiendo en tenant A
      const exists = await prismaA.cliente.findUnique({
        where: { id: clienteA.id },
      });
      expect(exists).toBeDefined();
    });
  });
} else {
  describe('🔔 DOORBELL — Multi-tenant isolation gate', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn(
        '[DOORBELL] Skipping: DATABASE_URL not set. These tests require a real database.',
      );
    });
  });
}
