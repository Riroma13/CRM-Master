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
const SESSION_COOKIE = '__Secure-better-auth.session_token';

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
    (value): value is string => typeof value === 'string' && value.startsWith(`${SESSION_COOKIE}=`),
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
  let systemBId: string;
  let sharedPrisma: PrismaService;

  beforeAll(async () => {
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
        { id: LEGACY_USER_A, tenantId: TENANT_A, email: EMAIL_A, name: 'Tenant Admin A', role: 'admin', passwordHash, isActive: true, betterAuthUserId: BA_USER_A },
        { id: LEGACY_USER_B, tenantId: TENANT_B, email: EMAIL_B, name: 'Tenant Admin B', role: 'admin', passwordHash: passwordHashB, isActive: true, betterAuthUserId: BA_USER_B },
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
      expect.stringMatching(new RegExp(`${SESSION_COOKIE}=.+HttpOnly`)),
    ]));
    cookieA = sessionCookie(response);
  });

  it('admits the Tenant A dashboard and creates/reads back its CRM resources', async () => {
    expect(cookieA).toBeTruthy();
    const dashboard = await http().get('/api/v1/tenant/dashboard').set('Host', HOST_A).set('Cookie', cookieA);
    expect(dashboard.status).toBe(200);

    const client = await http().post('/api/v1/tenant/clientes').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Client A', tags: [] });
    expect(client.status).toBe(201);
    clientAId = client.body.id;
    expect((await http().get(`/api/v1/tenant/clientes/${clientAId}`).set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(200);

    const system = await http().post('/api/v1/tenant/sistemas').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombreSistema: 'Doorbell System A', tipo: 'web', clienteId: clientAId });
    expect(system.status).toBe(201);
    expect((await http().get(`/api/v1/tenant/sistemas/${system.body.id}`).set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(200);

    const inventory = await http().post(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)
      .send({ nombre: 'Doorbell Inventory A', categoria: 'software' });
    expect(inventory.status).toBe(201);
    expect((await http().get(`/api/v1/tenant/sistemas/${system.body.id}/items`).set('Host', HOST_A).set('Cookie', cookieA)).body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: inventory.body.id }),
    ]));

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
    const systemB = await http().post('/api/v1/tenant/sistemas').set('Host', HOST_B).set('Cookie', cookieB)
      .send({ nombreSistema: 'Doorbell System B', tipo: 'web', clienteId: clientBId });
    expect(systemB.status).toBe(201);
    systemBId = systemB.body.id;

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
    expect((await http().get(`/api/v1/tenant/sistemas/${systemBId}`).set('Host', HOST_B).set('Cookie', cookieA)).status).toBe(401);
  });

  it('removes account enumeration, logs out, and rejects replay of the revoked cookie', async () => {
    expect((await http().post('/api/v1/auth/check-user').set('Host', HOST_A).send({ email: EMAIL_A })).status).toBe(404);
    expect((await http().post('/api/v1/auth/logout').set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(204);
    expect((await http().get('/api/v1/tenant/dashboard').set('Host', HOST_A).set('Cookie', cookieA)).status).toBe(401);
  });
});
