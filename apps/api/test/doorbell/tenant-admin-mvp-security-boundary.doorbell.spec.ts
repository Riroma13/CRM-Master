import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_A = '00000000-0000-0000-0000-000000000601';
const TENANT_B = '00000000-0000-0000-0000-000000000602';
const ORG_A = '00000000-0000-0000-0000-000000000611';
const ORG_B = '00000000-0000-0000-0000-000000000612';
const BA_USER_A = '00000000-0000-0000-0000-000000000621';
const BA_USER_B = '00000000-0000-0000-0000-000000000622';
const LEGACY_USER_A = '00000000-0000-0000-0000-000000000631';
const LEGACY_USER_B = '00000000-0000-0000-0000-000000000632';
const MEMBER_A = '00000000-0000-0000-0000-000000000641';
const MEMBER_B = '00000000-0000-0000-0000-000000000642';

const HOST_A = 'tenant-admin-mvp-a.crmmaster.com';
const HOST_B = 'tenant-admin-mvp-b.crmmaster.com';
const EMAIL_A = 'tenant-admin-a@example.test';
const EMAIL_B = 'tenant-admin-b@example.test';
const PASSWORD_A = 'tenant-a-only-password';
const PASSWORD_B = 'tenant-b-only-password';
const sessionCookieName = () => process.env.AUTH_COOKIE_TRANSPORT !== 'http'
  ? '__Secure-better-auth.session_token'
  : 'better-auth.session_token';

function requireIsolatedDatabase(): string {
  const value = process.env.TENANT_ADMIN_MVP_DATABASE_URL;
  if (!value) {
    throw new Error(
      'Tenant-admin MVP doorbell is blocked: HUMAN must provide TENANT_ADMIN_MVP_DATABASE_URL for an isolated throwaway database; refusing DATABASE_URL/DATABASE_TEST_URL.',
    );
  }
  const database = new URL(value).pathname.slice(1).split('?')[0];
  if (!database || database === 'crm_test') {
    throw new Error(
      'Tenant-admin MVP doorbell is blocked: TENANT_ADMIN_MVP_DATABASE_URL must target a dedicated throwaway database, not shared crm_test.',
    );
  }
  return value;
}

function sessionCookie(response: { headers: Record<string, string | string[]> }): string {
  const values = response.headers['set-cookie'];
  const header = (Array.isArray(values) ? values : [values]).find(
    (value): value is string => typeof value === 'string' && value.startsWith(`${sessionCookieName()}=`),
  );
  if (!header) throw new Error('Tenant-admin MVP doorbell did not receive a session cookie');
  return header.split(';')[0];
}

describe('DOORBELL — tenant-admin MVP security boundary', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookieA: string;
  let cookieB: string;
  let clientAId: string;
  let clientBId: string;
  let systemAId: string;
  let systemBId: string;
  let itemAId: string;
  let sharedPrisma: PrismaService;

  beforeAll(async () => {
    process.env.AUTH_COOKIE_TRANSPORT = 'https';
    process.env.DATABASE_URL = requireIsolatedDatabase();
    process.env.DATABASE_TEST_URL = process.env.DATABASE_URL;
    process.env.AUDIT_CHAIN_SECRET ??= 'tenant-admin-mvp-doorbell-audit-secret';

    sharedPrisma = new PrismaService();
    await sharedPrisma.onModuleInit();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(sharedPrisma)
      .compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = sharedPrisma;

    await cleanup();
    const passwordHash = await bcrypt.hash(PASSWORD_A, 10);
    const passwordHashB = await bcrypt.hash(PASSWORD_B, 10);

    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A, slug: 'tenant-admin-mvp-a', name: 'Tenant Admin MVP A' },
        { id: TENANT_B, slug: 'tenant-admin-mvp-b', name: 'Tenant Admin MVP B' },
      ],
    });
    await prisma.admin.organization.createMany({
      data: [
        { id: ORG_A, slug: 'tenant-admin-mvp-a', name: 'Tenant Admin MVP A' },
        { id: ORG_B, slug: 'tenant-admin-mvp-b', name: 'Tenant Admin MVP B' },
      ],
    });
    await prisma.admin.tenant.update({ where: { id: TENANT_A }, data: { betterAuthOrganizationId: ORG_A } });
    await prisma.admin.tenant.update({ where: { id: TENANT_B }, data: { betterAuthOrganizationId: ORG_B } });
    await prisma.admin.user.createMany({
      data: [
        { id: BA_USER_A, email: EMAIL_A, name: 'Tenant Admin A', emailVerified: true },
        { id: BA_USER_B, email: EMAIL_B, name: 'Tenant Admin B', emailVerified: true },
      ],
    });
    await prisma.admin.member.createMany({
      data: [
        { id: MEMBER_A, organizationId: ORG_A, userId: BA_USER_A, role: 'admin' },
        { id: MEMBER_B, organizationId: ORG_B, userId: BA_USER_B, role: 'admin' },
      ],
    });
    await prisma.admin.legacyUser.createMany({
      data: [
        { id: LEGACY_USER_A, tenantId: TENANT_A, email: EMAIL_A, name: 'Tenant Admin A', role: 'owner', passwordHash, isActive: true, betterAuthUserId: BA_USER_A },
        { id: LEGACY_USER_B, tenantId: TENANT_B, email: EMAIL_B, name: 'Tenant Admin B', role: 'owner', passwordHash: passwordHashB, isActive: true, betterAuthUserId: BA_USER_B },
      ],
    });
  }, 30000);

  afterAll(async () => {
    await cleanup();
    await app?.close();
    await sharedPrisma?.onModuleDestroy();
  });

  async function cleanup() {
    if (!prisma) return;
    await prisma.admin.$executeRawUnsafe('DELETE FROM "tareas" WHERE "tenant_id" IN ($1, $2)', TENANT_A, TENANT_B);
    await prisma.admin.$executeRawUnsafe('DELETE FROM "items_inventario" WHERE "tenant_id" IN ($1, $2)', TENANT_A, TENANT_B);
    await prisma.admin.$executeRawUnsafe('DELETE FROM "sistemas" WHERE "tenant_id" IN ($1, $2)', TENANT_A, TENANT_B);
    await prisma.admin.$executeRawUnsafe('DELETE FROM "clientes" WHERE "tenant_id" IN ($1, $2)', TENANT_A, TENANT_B);
    await prisma.admin.$executeRawUnsafe('DELETE FROM "activity_events" WHERE "tenant_id" IN ($1, $2)', TENANT_A, TENANT_B);
    await prisma.admin.session.deleteMany({ where: { userId: { in: [BA_USER_A, BA_USER_B] } } });
    await prisma.admin.member.deleteMany({ where: { id: { in: [MEMBER_A, MEMBER_B] } } });
    await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [LEGACY_USER_A, LEGACY_USER_B] } } });
    await prisma.admin.user.deleteMany({ where: { id: { in: [BA_USER_A, BA_USER_B] } } });
    await prisma.admin.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
  }

  const http = () => request(app.getHttpServer());

  it('logs Tenant A in from its Host and exposes only an HttpOnly session cookie', async () => {
    const response = await http().post('/api/v1/auth/login').set('Host', HOST_A).send({ email: EMAIL_A, password: PASSWORD_A });

    expect(response.status).toBe(200);
    expect(response.body.session).toBeUndefined();
    expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([
      expect.stringMatching(new RegExp(`${sessionCookieName()}=.+HttpOnly`)),
    ]));
    cookieA = sessionCookie(response);
  });

  it('admits the Tenant A dashboard and creates/reads back its CRM resources', async () => {
    expect(cookieA).toBeTruthy();
    const dashboard = await http().get('/api/v1/tenant/dashboard').set('Host', HOST_A).set('Cookie', cookieA);
    expect(dashboard.status).toBe(200);

    const client = await http().post('/api/v1/tenant/clientes').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Client A', tags: [], email: 'client-a@example.test', telefono: '+34123456789' });
    expect(client.status).toBe(201);
    clientAId = client.body.id;
    const clientRead = await http().get(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA);
    expect(clientRead.status).toBe(200);
    expect(clientRead.body).toEqual(expect.objectContaining({ email: 'client-a@example.test', telefono: '+34123456789' }));

    const clientEdit = await http().patch(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ email: 'edited-a@example.test', telefono: '+34987654321' });
    expect(clientEdit.status).toBe(200);
    const editedClientRead = await http().get(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA);
    expect(editedClientRead.body).toEqual(expect.objectContaining({ email: 'edited-a@example.test', telefono: '+34987654321' }));

    const clearedClient = await http().patch(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ email: null, telefono: null });
    expect(clearedClient.status).toBe(200);
    const clearedClientRead = await http().get(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA);
    expect(clearedClientRead.body).toEqual(expect.objectContaining({ email: null, telefono: null, tenantId: TENANT_A }));

    const clientOwnershipAttempt = await http().patch(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Client A updated', tenantId: TENANT_B });
    expect(clientOwnershipAttempt.status).toBe(200);
    expect((await prisma.admin.cliente.findUnique({ where: { id: clientAId }, select: { tenantId: true } }))?.tenantId).toBe(TENANT_A);

    const system = await http().post('/api/v1/tenant/sistemas').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'Doorbell System A', tipo: 'web', clienteId: clientAId });
    expect(system.status).toBe(201);
    systemAId = system.body.id;
    const sameTenantEdit = await http().patch(`/api/v1/tenant/sistemas/${system.body.id}`)
      .set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'Doorbell System A edited', tipo: 'web', clienteId: clientAId });
    expect(sameTenantEdit.status).toBe(200);
    expect(sameTenantEdit.body).toEqual(expect.objectContaining({ nombreSistema: 'Doorbell System A edited' }));
    expect((await http().get(`/api/v1/tenant/sistemas/${system.body.id}`).set('Host', HOST_A).set('Cookie', cookieA)).body)
      .toEqual(expect.objectContaining({ nombreSistema: 'Doorbell System A edited', clienteId: clientAId }));

    const systemOwnershipAttempt = await http().patch(`/api/v1/tenant/sistemas/${system.body.id}`)
      .set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'Doorbell System A ownership-safe', tenantId: TENANT_B });
    expect(systemOwnershipAttempt.status).toBe(200);
    expect((await prisma.admin.sistema.findUnique({ where: { id: systemAId }, select: { tenantId: true } }))?.tenantId).toBe(TENANT_A);

    const inventory = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Inventory A', categoria: 'software', fechaImplementacion: '2026-09-12' });
    expect(inventory.status).toBe(201);
    itemAId = inventory.body.id;
    expect(inventory.body.fechaImplementacion).toBe('2026-09-12T00:00:00.000Z');
    expect((await http().get(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)).body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: inventory.body.id }),
    ]));

    const invalidInventory = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Invalid inventory', categoria: 'software', fechaImplementacion: '2026-02-30' });
    expect(invalidInventory.status).toBe(400);
    const malformedInventory = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Malformed inventory', categoria: 'software', fechaImplementacion: '2026/09/12' });
    expect(malformedInventory.status).toBe(400);

    const itemEdit = await http().patch(`/api/v1/tenant/sistemas/items/${itemAId}`)
      .set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Inventory A edited', fechaImplementacion: null, tenantId: TENANT_B });
    expect(itemEdit.status).toBe(200);
    expect((await prisma.admin.itemInventario.findUnique({ where: { id: itemAId }, select: { tenantId: true, fechaImplementacion: true } })))
      .toEqual({ tenantId: TENANT_A, fechaImplementacion: null });

    const itemWithoutDate = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Inventory A without date', categoria: 'software' });
    expect(itemWithoutDate.status).toBe(201);
    expect(itemWithoutDate.body.fechaImplementacion).toBeNull();

    const itemWithNullDate = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Inventory A null date', categoria: 'software', fechaImplementacion: null });
    expect(itemWithNullDate.status).toBe(201);
    expect(itemWithNullDate.body.fechaImplementacion).toBeNull();

    const task = await http().post('/api/v1/tenant/tareas').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ titulo: 'Doorbell Task A', clienteId: clientAId, sistemaId: system.body.id });
    expect(task.status).toBe(201);
    expect((await http().get(`/api/v1/tenant/tareas/${task.body.id}`).set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(200);
  });

  it('denies Tenant A credentials on Tenant B Host and denies cross-tenant resource IDs without mutation', async () => {
    const loginB = await http().post('/api/v1/auth/login').set('Host', HOST_B).send({ email: EMAIL_B, password: PASSWORD_B });
    expect(loginB.status).toBe(200);
    cookieB = sessionCookie(loginB);

    const clientB = await http().post('/api/v1/tenant/clientes').set('Host', HOST_B).set('Cookie', cookieB)
      .send({ nombre: 'Doorbell Client B', tags: [] });
    expect(clientB.status).toBe(201);
    clientBId = clientB.body.id;
    expect((await http().get(`/api/v1/tenant/clientes/${clientBId}`).set('Host', HOST_B).set('Cookie', cookieB)).body)
      .toEqual(expect.objectContaining({ email: null, telefono: null }));
    const systemB = await http().post('/api/v1/tenant/sistemas').set('Host', HOST_B).set('Cookie', cookieB)
      .send({ nombreSistema: 'Doorbell System B', tipo: 'web', clienteId: clientBId });
    expect(systemB.status).toBe(201);
    systemBId = systemB.body.id;

    const tenantBClientPatchToTenantA = await http().patch(`/api/v1/tenant/clientes/${clientAId}`)
      .set('Host', HOST_B).set('Cookie', cookieB).send({ nombre: 'must-not-change' });
    expect([401, 403, 404]).toContain(tenantBClientPatchToTenantA.status);
    const tenantBSystemPatchToTenantA = await http().patch(`/api/v1/tenant/sistemas/${systemAId}`)
      .set('Host', HOST_B).set('Cookie', cookieB).send({ nombreSistema: 'must-not-change' });
    expect([401, 403, 404]).toContain(tenantBSystemPatchToTenantA.status);
    const tenantBItemPatchToTenantA = await http().patch(`/api/v1/tenant/sistemas/items/${itemAId}`)
      .set('Host', HOST_B).set('Cookie', cookieB).send({ nombre: 'must-not-change' });
    expect([401, 403, 404]).toContain(tenantBItemPatchToTenantA.status);

    const systemBeforeForeignPatch = await http().get(`/api/v1/tenant/sistemas/${systemBId}`)
      .set('Host', HOST_B).set('Cookie', cookieB);
    const foreignSystemPatch = await http().patch(`/api/v1/tenant/sistemas/${systemBId}`)
      .set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'must-not-change', tipo: 'web' });
    expect([401, 403, 404]).toContain(foreignSystemPatch.status);
    const foreignReplacementPatch = await http().patch(`/api/v1/tenant/sistemas/${systemBId}`)
      .set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'must-not-change', tipo: 'web', clienteId: clientBId });
    expect([401, 403, 404]).toContain(foreignReplacementPatch.status);
    const systemAfterForeignPatch = await http().get(`/api/v1/tenant/sistemas/${systemBId}`)
      .set('Host', HOST_B).set('Cookie', cookieB);
    expect(systemAfterForeignPatch.body).toEqual(systemBeforeForeignPatch.body);

    const before = await http().get('/api/v1/tenant/clientes').set('Host', HOST_B).set('Cookie', cookieB);
    const foreignRead = await http().get(`/api/v1/tenant/clientes/${clientBId}`).set('Host', HOST_A).set('Cookie', cookieA);
    expect([401, 403, 404]).toContain(foreignRead.status);
    const foreignWrite = await http().patch(`/api/v1/tenant/clientes/${clientBId}`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'must-not-change' });
    expect([401, 403, 404]).toContain(foreignWrite.status);
    const after = await http().get('/api/v1/tenant/clientes').set('Host', HOST_B).set('Cookie', cookieB);
    expect(after.body).toEqual(before.body);

    const wrongHostLogin = await http().post('/api/v1/auth/login').set('Host', HOST_B).send({ email: EMAIL_A, password: PASSWORD_A });
    expect(wrongHostLogin.status).toBe(401);
    expect([401, 403]).toContain((await http().get(`/api/v1/tenant/sistemas/${systemBId}`).set('Host', HOST_B).set('Cookie', cookieA)).status);
  });

  it('removes account enumeration, logs out, and rejects replay of the revoked cookie', async () => {
    expect((await http().post('/api/v1/auth/check-user').set('Host', HOST_A).send({ email: EMAIL_A })).status).toBe(404);
    expect((await http().post('/api/v1/auth/logout').set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(204);
    expect((await http().get('/api/v1/tenant/dashboard').set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(401);
  });
});
