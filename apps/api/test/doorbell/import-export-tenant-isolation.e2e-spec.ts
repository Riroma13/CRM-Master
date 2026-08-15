import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const dbAvailable = Boolean(process.env.DATABASE_URL || process.env.DATABASE_TEST_URL);
const TENANT_A = '00000000-0000-0000-0000-000000000131';
const TENANT_B = '00000000-0000-0000-0000-000000000132';
const ORG_B = '00000000-0000-0000-0000-000000000139';
const USER_B = '00000000-0000-0000-0000-000000000137';
const MEMBER_B = '00000000-0000-0000-0000-000000000140';
const SESSION_B = '00000000-0000-0000-0000-000000000141';
const TOKEN = 'import-export-doorbell-session';

(dbAvailable ? describe : describe.skip)('DOORBELL — import/export tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUDIT_CHAIN_SECRET =
      process.env.AUDIT_CHAIN_SECRET ?? 'doorbell-audit-chain-secret';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    await cleanup();
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A, slug: 'import-export-doorbell-a', name: 'Doorbell A' },
        {
          id: TENANT_B,
          slug: 'import-export-doorbell-b',
          name: 'Doorbell B',
          betterAuthOrganizationId: ORG_B,
        },
      ],
    });
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW())`,
      ORG_B,
      'Doorbell B',
      'import-export-doorbell-b',
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, true, $3, NOW(), NOW())`,
      USER_B,
      'import-export-doorbell@example.test',
      'Import Export Doorbell',
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_members (id, organization_id, user_id, role, "createdAt") VALUES ($1, $2, $3, 'owner', NOW())`,
      MEMBER_B,
      ORG_B,
      USER_B,
    );
    await prisma.admin.$executeRawUnsafe(
      `INSERT INTO ba_sessions (id, user_id, token, expires_at, active_organization_id, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      SESSION_B,
      USER_B,
      TOKEN,
      new Date(Date.now() + 60 * 60 * 1000),
      ORG_B,
    );
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    if (app) await app.close();
  });

  it('proves real HTTP authority and rejects a forged file tenant without mutation', async () => {
    const hostA = 'import-export-doorbell-a.crmmaster.com';
    const hostB = 'import-export-doorbell-b.crmmaster.com';
    const auth = { Authorization: `Bearer ${TOKEN}` };
    const anonymous = await request(app.getHttpServer())
      .get('/api/v1/export/clientes/csv')
      .set('Host', hostB);
    expect(anonymous.status).toBe(401);

    const valid = await request(app.getHttpServer())
      .get('/api/v1/export/clientes/csv')
      .set('Host', hostB)
      .set(auth);
    expect(valid.status).toBe(200);
    expect(valid.text).toContain('nombre,tipo_negocio,estado_relacion,salud,tags,creado');

    const crossTenant = await request(app.getHttpServer())
      .get('/api/v1/export/clientes/csv')
      .set('Host', hostA)
      .set(auth);
    expect(crossTenant.status).toBe(403);
    const crossTenantImport = await request(app.getHttpServer())
      .post('/api/v1/export/import/clientes/csv')
      .set('Host', hostA)
      .set(auth)
      .set('Idempotency-Key', 'doorbell-cross-tenant-import')
      .attach(
        'file',
        Buffer.from(
          'nombre,tipo_negocio,estado_relacion,salud,tags,creado\r\nCross-tenant,Retail,Activo,🟢,,\r\n',
        ),
        'clients.csv',
      );
    expect(crossTenantImport.status).toBe(403);
    const countsBeforeForged = await Promise.all([
      prisma.admin.cliente.count({ where: { tenantId: TENANT_A } }),
      prisma.admin.cliente.count({ where: { tenantId: TENANT_B } }),
    ]);
    const forgedCsv =
      `nombre,tipo_negocio,estado_relacion,salud,tags,creado,tenantId\r\n` +
      `Forged,Retail,Activo,🟢,,,${TENANT_A}\r\n`;
    const forged = await request(app.getHttpServer())
      .post('/api/v1/export/import/clientes/csv')
      .set('Host', hostB)
      .set(auth)
      .set('Idempotency-Key', 'doorbell-import-1')
      .attach('file', Buffer.from(forgedCsv), 'clients.csv');
    expect(forged.status).toBe(400);
    expect(forged.body).toMatchObject({ message: 'Invalid clientes-csv-v1 header' });

    const countsAfterForged = await Promise.all([
      prisma.admin.cliente.count({ where: { tenantId: TENANT_A } }),
      prisma.admin.cliente.count({ where: { tenantId: TENANT_B } }),
    ]);
    expect(countsAfterForged).toEqual(countsBeforeForged);
  });

  async function cleanup() {
    await prisma.admin.$executeRawUnsafe(
      'DELETE FROM ba_sessions WHERE id = $1 OR user_id = $2',
      SESSION_B,
      USER_B,
    );
    await prisma.admin.$executeRawUnsafe(
      'DELETE FROM ba_members WHERE id = $1 OR user_id = $2',
      MEMBER_B,
      USER_B,
    );
    await prisma.admin.$executeRawUnsafe(
      'DELETE FROM ba_users WHERE id = $1 OR email = $2',
      USER_B,
      'import-export-doorbell@example.test',
    );
    await prisma.admin.$executeRawUnsafe(
      'DELETE FROM ba_organizations WHERE id = $1 OR slug = $2',
      ORG_B,
      'import-export-doorbell-b',
    );
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
  }
});
