import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_A = '00000000-0000-0000-0000-000000000201';
const TENANT_B = '00000000-0000-0000-0000-000000000202';
const CLIENTE_A = '00000000-0000-0000-0000-000000000211';
const CLIENT_USER_A = '00000000-0000-0000-0000-000000000221';
const HOST_A = 'import-export-doorbell-a.crmmaster.com';
const HOST_B = 'import-export-doorbell-b.crmmaster.com';
const COOKIE = '__Secure-client-session';

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_TEST_URL;
if (!dbUrl) {
  throw new Error('tenant-auth-default-deny doorbell requires DATABASE_URL or DATABASE_TEST_URL');
}

function clientToken(overrides: Record<string, unknown> = {}) {
  return jwt.sign(
    { sub: CLIENT_USER_A, clienteId: CLIENTE_A, tenantId: TENANT_A, role: 'client', ...overrides },
    process.env.CLIENT_JWT_SECRET || 'client-jwt-dev-secret-change-in-prod',
    { expiresIn: '1h' },
  );
}

describe('DOORBELL — tenant auth default deny', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.AUDIT_CHAIN_SECRET ??= 'doorbell-audit-chain-secret';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    await cleanup();
    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_A, slug: 'import-export-doorbell-a', name: 'Default Deny A' },
        { id: TENANT_B, slug: 'import-export-doorbell-b', name: 'Default Deny B' },
      ],
    });
    await prisma.admin.cliente.create({
      data: { id: CLIENTE_A, tenantId: TENANT_A, nombre: 'Default Deny Client A', tags: [] },
    });
    await prisma.admin.clientUser.create({
      data: {
        id: CLIENT_USER_A,
        clienteId: CLIENTE_A,
        tenantId: TENANT_A,
        email: 'default-deny-client-a@example.test',
        passwordHash: 'fixture-only',
        nombre: 'Client A',
      },
    });
  }, 30000);

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    if (!prisma) return;
    await prisma.admin.clientUser.deleteMany({ where: { id: CLIENT_USER_A } });
    await prisma.admin.cliente.deleteMany({ where: { id: CLIENTE_A } });
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
  }

  const anonymous = () => request(app.getHttpServer());

  it.each([
    ['GET tenant data', () => anonymous().get('/api/v1/tenant/clientes').set('Host', HOST_A)],
    ['POST workflow', () => anonymous().post('/api/v1/workflow/definitions').set('Host', HOST_A).send({})],
    ['POST plugin install', () => anonymous().post('/api/v1/plugins/install').set('Host', HOST_A).send({})],
    ['POST document upload', () => anonymous().post('/api/v1/tenant/documentos').set('Host', HOST_A).send({})],
    ['POST billing', () => anonymous().post('/api/v1/tenant/pagos/forged/10').set('Host', HOST_A).send({})],
    ['POST communications', () => anonymous().post('/api/v1/communications/client-a').set('Host', HOST_A).send({ tipo: 'nota', titulo: 'forged' })],
  ])('%s is denied before handler validation or effects', async (_name, execute) => {
    const before = await prisma.admin.cliente.count({ where: { tenantId: TENANT_A } });
    const response = await execute();
    const after = await prisma.admin.cliente.count({ where: { tenantId: TENANT_A } });
    expect(response.status).toBe(401);
    expect(after).toBe(before);
  });

  it('denies valid Host alone and does not treat it as actor authority', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/tenant/clientes').set('Host', HOST_A);
    expect(response.status).toBe(401);
  });

  it('admits an authenticated same-tenant client session through its named guard', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/client/me')
      .set('Host', HOST_A)
      .set('Cookie', `${COOKIE}=${clientToken()}`);
    expect(response.status).toBe(200);
    expect(response.body.clientUser.id).toBe(CLIENT_USER_A);
  });

  it('denies insufficient client role and does not execute the handler', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/client/me')
      .set('Host', HOST_A)
      .set('Cookie', `${COOKIE}=${clientToken({ role: 'admin' })}`);
    expect(response.status).toBe(403);
    expect(response.body.clientUser).toBeUndefined();
  });

  it('denies Tenant A client authority on Tenant B Host despite query/body/path tenant hints', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/client/me/forged-resource?tenantId=' + TENANT_A)
      .set('Host', HOST_B)
      .set('Cookie', `${COOKIE}=${clientToken()}`)
      .send({ tenantId: TENANT_A });
    expect([403, 404]).toContain(response.status);

    const actual = await request(app.getHttpServer())
      .get('/api/v1/client/me?tenantId=' + TENANT_A)
      .set('Host', HOST_B)
      .set('Cookie', `${COOKIE}=${clientToken()}`);
    expect(actual.status).toBe(403);
    expect(actual.body.clientUser).toBeUndefined();
  });

  it.each([
    ['health', () => request(app.getHttpServer()).get('/api/v1/health').set('Host', HOST_A), 200],
    ['metrics', () => request(app.getHttpServer()).get('/metrics').set('Host', HOST_A), 200],
    ['auth check-user', () => request(app.getHttpServer()).post('/api/v1/auth/check-user').set('Host', HOST_A).send({ email: 'missing@example.test' }), 200],
    ['auth login contract', () => request(app.getHttpServer()).post('/api/v1/auth/login').set('Host', HOST_A).send({ email: 'missing@example.test', password: 'wrong' }), 401],
    ['client login contract', () => request(app.getHttpServer()).post('/api/v1/client/auth/login').set('Host', HOST_A).send({ email: 'missing@example.test', password: 'wrong' }), 401],
    ['client register contract', () => request(app.getHttpServer()).post('/api/v1/client/auth/register').set('Host', HOST_A).send({ nombre: 'Existing', email: 'default-deny-client-a@example.test', password: 'valid-password' }), 409],
    ['client logout', () => request(app.getHttpServer()).post('/api/v1/client/auth/logout').set('Host', HOST_A), 204],
    ['shared document token contract', () => request(app.getHttpServer()).get('/api/v1/shared/missing-token').set('Host', HOST_A), 404],
  ])('%s remains reachable under its explicit public contract', async (_name, execute, expected) => {
    const response = await execute();
    expect(response.status).toBe(expected);
  });

  it.each([
    '/api/v1/communications/webhook/provider-a',
    '/api/v1/observability/alerts/webhook',
  ])('keeps %s default-denied without signature bypass', async (route) => {
    const response = await anonymous().post(route).set('Host', HOST_A).send({ alerts: [] });
    expect(response.status).toBe(401);
  });

  it.each([
    ['workflow token admission', '/api/v1/public/workflows'],
    ['document token admission', '/api/v1/public/documents'],
  ])('%s preserves missing-token 401 only (tenant binding deferred)', async (_name, route) => {
    const response = await anonymous().get(route).set('Host', HOST_A);
    expect(response.status).toBe(401);
  });
});
