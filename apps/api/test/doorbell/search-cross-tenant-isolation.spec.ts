/**
 * 🔔 DOORBELL TEST — Search cross-tenant isolation
 *
 * CRÍTICO: Este test DEBE fallar si los resultados de búsqueda
 * de un tenant incluyen datos de otro tenant.
 *
 * Si falla → DETENER el deploy hasta investigar la fuga.
 */
import { createPrismaClient } from '@crm-master/database';

const TENANT_A_ID = '00000000-0000-0000-0000-000000000031';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000032';
const TENANT_SLUG_A = 'doorbell-search-a';
const TENANT_SLUG_B = 'doorbell-search-b';

const dbAvailable = !!(process.env.DATABASE_URL || process.env.DATABASE_TEST_URL);

if (dbAvailable) {
  describe('🔔 DOORBELL — Search cross-tenant isolation', () => {
    let prismaA: ReturnType<typeof createPrismaClient>;
    let prismaB: ReturnType<typeof createPrismaClient>;
    let prismaAdmin: ReturnType<typeof createPrismaClient>;

    beforeAll(async () => {
      prismaAdmin = createPrismaClient();

      const upsertTenant = async (id: string, slug: string, name: string) => {
        await prismaAdmin.tenant.upsert({
          where: { id },
          create: { id, slug, name },
          update: {},
        });
      };

      await upsertTenant(TENANT_A_ID, TENANT_SLUG_A, 'Search Tenant A');
      await upsertTenant(TENANT_B_ID, TENANT_SLUG_B, 'Search Tenant B');

      prismaA = createPrismaClient(TENANT_A_ID);
      prismaB = createPrismaClient(TENANT_B_ID);
    });

    afterAll(async () => {
      await prismaAdmin.$disconnect();
    });

    it('MUST NOT leak search entries between tenants', async () => {
      // Insert search entries directly (raw SQL to bypass Prisma model)
      await prismaAdmin.$executeRawUnsafe(
        `INSERT INTO search_entries (id, tenant_id, entity_type, entity_id, title, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'cliente', 'a-1', 'Confidential-A', NOW(), NOW())`,
        TENANT_A_ID,
      );
      await prismaAdmin.$executeRawUnsafe(
        `INSERT INTO search_entries (id, tenant_id, entity_type, entity_id, title, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'cliente', 'b-1', 'Confidential-B', NOW(), NOW())`,
        TENANT_B_ID,
      );

      // Query tenant A — must NOT see tenant B's entry
      const rowsA: any[] = await prismaAdmin.$queryRawUnsafe(
        `SELECT title FROM search_entries WHERE tenant_id = $1 AND title LIKE 'Confidential%'`,
        TENANT_A_ID,
      );
      expect(rowsA).toHaveLength(1);
      expect(rowsA[0].title).toBe('Confidential-A');

      // Query tenant B — must NOT see tenant A's entry
      const rowsB: any[] = await prismaAdmin.$queryRawUnsafe(
        `SELECT title FROM search_entries WHERE tenant_id = $1 AND title LIKE 'Confidential%'`,
        TENANT_B_ID,
      );
      expect(rowsB).toHaveLength(1);
      expect(rowsB[0].title).toBe('Confidential-B');

      // Cleanup
      await prismaAdmin.$executeRawUnsafe(
        `DELETE FROM search_entries WHERE tenant_id IN ($1, $2)`,
        TENANT_A_ID, TENANT_B_ID,
      );
    });
  });
} else {
  describe('🔔 DOORBELL — Search cross-tenant isolation', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn('[DOORBELL] Skipping: DATABASE_URL not set.');
    });
  });
}
