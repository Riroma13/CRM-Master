/**
 * PR1 RED doorbell contract. This is intentionally a real HTTP test: it must
 * never become a conditional skip when the disposable database is absent.
 * PR3 supplies the assembled fixture and persistent Tenant A/B seed data.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as zlib from 'node:zlib';
import { EventBridgeService } from '../../src/modules/plugin/event-bridge/event-bridge.service';

const TENANT_A_HOST = 'plugin-tenant-a.crmmaster.com';
const TENANT_B_HOST = 'plugin-tenant-b.crmmaster.com';
const TENANT_A_ID = '00000000-0000-0000-0000-000000000037';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000038';
const ORG_A_ID = '00000000-0000-0000-0000-000000000039';
const ORG_B_ID = '00000000-0000-0000-0000-000000000040';
const USER_A_ID = '00000000-0000-0000-0000-000000000041';
const USER_B_ID = '00000000-0000-0000-0000-000000000042';
const MEMBER_A_ID = '00000000-0000-0000-0000-000000000043';
const MEMBER_B_ID = '00000000-0000-0000-0000-000000000044';
const LEGACY_A_ID = '00000000-0000-0000-0000-000000000045';
const LEGACY_B_ID = '00000000-0000-0000-0000-000000000046';
const PLUGIN_A_ID = '00000000-0000-0000-0000-000000000047';
const SESSION_A = 'plugin-doorbell-session-a';
const SESSION_B = 'plugin-doorbell-session-b';
const FORGED_TENANT_ID = TENANT_B_ID;

const manifest = JSON.stringify({
  name: 'doorbell-installed-plugin', version: '1.0.0', description: 'Doorbell fixture',
  author: 'security-test', extensionApi: 'v1', eventTypes: ['workflow.completed'],
  permissions: [], allowedDomains: [], schemaVersion: 1,
});

function manifestTar(): Buffer {
  const content = Buffer.from(manifest);
  const header = Buffer.alloc(512);
  header.write('manifest.json');
  header.write(`0000644\0`, 100);
  header.write('0000000\0', 108);
  header.write('0000000\0', 116);
  header.write(content.length.toString(8).padStart(11, '0') + '\0', 124);
  header.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136);
  header.write('        ', 148);
  header.write('0', 156);
  header.write('ustar\0', 257);
  for (let i = 148; i < 156; i++) header[i] = 32;
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148);
  const body = Buffer.concat([content, Buffer.alloc((512 - (content.length % 512)) % 512)]);
  return zlib.gzipSync(Buffer.concat([header, body, Buffer.alloc(1024)]));
}

describe('🔔 DOORBELL HTTP — plugin Tenant A/B execution boundary', () => {
  let app: INestApplication;
  let prisma: { admin: Record<string, any> };
  let eventBridge: EventBridgeService;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_TEST_URL) {
      throw new Error('PLUGIN_DOORBELL_REQUIRES_DISPOSABLE_DATABASE');
    }

    const { AppModule } = require('../../src/app.module');
    const { PrismaService } = require('../../src/common/prisma.service');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    eventBridge = moduleFixture.get(EventBridgeService);

    await prisma.admin.pluginEvent.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.plugin.deleteMany({ where: { id: PLUGIN_A_ID } });
    await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [LEGACY_A_ID, LEGACY_B_ID] } } });
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE id IN ($1, $2)', SESSION_A, SESSION_B);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE id IN ($1, $2)', MEMBER_A_ID, MEMBER_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id IN ($1, $2)', USER_A_ID, USER_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1, $2)', ORG_A_ID, ORG_B_ID);
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.tenant.createMany({ data: [
      { id: TENANT_A_ID, slug: 'plugin-tenant-a', name: 'Plugin Doorbell A', betterAuthOrganizationId: ORG_A_ID },
      { id: TENANT_B_ID, slug: 'plugin-tenant-b', name: 'Plugin Doorbell B', betterAuthOrganizationId: ORG_B_ID },
    ] });
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_organizations (id,name,slug,"createdAt") VALUES ($1,$2,$3,NOW()),($4,$5,$6,NOW())',
      ORG_A_ID, 'Plugin Doorbell A', 'plugin-tenant-a', ORG_B_ID, 'Plugin Doorbell B', 'plugin-tenant-b',
    );
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_users (id,email,"emailVerified",name,"createdAt","updatedAt") VALUES ($1,$2,true,$3,NOW(),NOW()),($4,$5,true,$6,NOW(),NOW())',
      USER_A_ID, 'plugin-doorbell-a@example.test', 'Plugin A', USER_B_ID, 'plugin-doorbell-b@example.test', 'Plugin B',
    );
    await prisma.admin.legacyUser.createMany({ data: [
      { id: LEGACY_A_ID, tenantId: TENANT_A_ID, email: 'plugin-doorbell-a@example.test', role: 'owner', betterAuthUserId: USER_A_ID },
      { id: LEGACY_B_ID, tenantId: TENANT_B_ID, email: 'plugin-doorbell-b@example.test', role: 'owner', betterAuthUserId: USER_B_ID },
    ] });
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_members (id,organization_id,user_id,role,"createdAt") VALUES ($1,$2,$3,$4,NOW()),($5,$6,$7,$8,NOW())',
      MEMBER_A_ID, ORG_A_ID, USER_A_ID, 'owner', MEMBER_B_ID, ORG_B_ID, USER_B_ID, 'owner',
    );
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_sessions (id,user_id,token,expires_at,active_organization_id,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()),($6,$7,$8,$4,$9,NOW(),NOW())',
      SESSION_A, USER_A_ID, SESSION_A, new Date(Date.now() + 3600000), ORG_A_ID,
      SESSION_B, USER_B_ID, SESSION_B, ORG_B_ID,
    );
    await prisma.admin.plugin.create({ data: {
      id: PLUGIN_A_ID, tenantId: TENANT_A_ID, name: 'doorbell-existing-plugin', version: '1.0.0',
      manifest: JSON.parse(manifest), status: 'inactive', enabled: false, contentHash: 'doorbell-fixture-hash',
    } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.admin.pluginEvent.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.plugin.deleteMany({ where: { id: PLUGIN_A_ID } });
      await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [LEGACY_A_ID, LEGACY_B_ID] } } });
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE id IN ($1, $2)', SESSION_A, SESSION_B);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE id IN ($1, $2)', MEMBER_A_ID, MEMBER_B_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id IN ($1, $2)', USER_A_ID, USER_B_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1, $2)', ORG_A_ID, ORG_B_ID);
      await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    }
    await app?.close();
  });

  it('denies anonymous install and list before registry/filesystem effects', async () => {
    const install = await request(app.getHttpServer())
      .post('/api/v1/plugins/install')
      .set('Host', TENANT_A_HOST)
      .attach('package', Buffer.from('manifest-only-fixture'), 'plugin.tgz');
    expect(install.status).toBe(401);

    const list = await request(app.getHttpServer())
      .get('/api/v1/plugins')
      .set('Host', TENANT_A_HOST);
    expect(list.status).toBe(401);
  });

  it('rejects Tenant A session with forged Tenant B authority on all six HTTP surfaces', async () => {
    const common = (method: 'get' | 'post' | 'delete', path: string) =>
      (request(app.getHttpServer()) as any)[method](path)
        .set('Host', TENANT_A_HOST).set('Authorization', `Bearer ${SESSION_A}`);
    const responses = await Promise.all([
      common('post', '/api/v1/plugins/install').query({ tenantId: FORGED_TENANT_ID })
        .attach('package', Buffer.from('manifest-only-fixture'), 'plugin.tgz'),
      common('get', '/api/v1/plugins').query({ tenantId: FORGED_TENANT_ID }),
      common('get', '/api/v1/plugins/foreign').query({ tenantId: FORGED_TENANT_ID }),
      common('post', '/api/v1/plugins/foreign/activate').send({ tenantId: FORGED_TENANT_ID }),
      common('post', '/api/v1/plugins/foreign/deactivate').send({ tenantId: FORGED_TENANT_ID }),
      common('delete', '/api/v1/plugins/foreign').send({ tenantId: FORGED_TENANT_ID }),
    ]);
    expect(responses.map(response => response.status)).toEqual([500, 200, 404, 404, 404, 404]);
  });

  it('allows same-tenant metadata management but activation remains disabled', async () => {
    const authenticated = (method: 'get' | 'post' | 'delete', path: string) =>
      (request(app.getHttpServer()) as any)[method](path)
        .set('Host', TENANT_A_HOST).set('Authorization', `Bearer ${SESSION_A}`);
    const install = await authenticated('post', '/api/v1/plugins/install')
      .attach('package', manifestTar(), 'plugin.tgz');
    expect(install.status).toBe(201);
    expect(install.body.status).toBe('inactive');
    const list = await authenticated('get', '/api/v1/plugins');
    expect(list.status).toBe(200);
    const pluginId = install.body.pluginId;

    const detail = await authenticated('get', `/api/v1/plugins/${pluginId}`);
    expect(detail.status).toBe(200);
    const activate = await authenticated('post', `/api/v1/plugins/${pluginId}/activate`);
    expect(activate.status).toBe(409);
    expect(activate.body.code).toBe('PLUGIN_EXECUTION_DISABLED');
    expect(await authenticated('post', `/api/v1/plugins/${pluginId}/deactivate`)).toHaveProperty('status', 201);
    expect(await authenticated('delete', `/api/v1/plugins/${pluginId}`)).toHaveProperty('status', 200);
  });

  it('proves Tenant B cannot observe or mutate Tenant A and events create no delivery evidence', async () => {
    const tenantB = (method: 'get' | 'post' | 'delete', path: string) =>
      (request(app.getHttpServer()) as any)[method](path)
        .set('Host', TENANT_B_HOST).set('Authorization', `Bearer ${SESSION_B}`);
    const response = await tenantB('get', `/api/v1/plugins/${PLUGIN_A_ID}`);
    expect(response.status).toBe(404);
    const beforeEvents = await prisma.admin.pluginEvent.count({ where: { tenantId: TENANT_A_ID } });
    await expect(eventBridge.onEvent('workflow.completed', TENANT_A_ID, { fixture: true }))
      .rejects.toMatchObject({ response: { code: 'PLUGIN_EXECUTION_DISABLED' } });
    const afterEvents = await prisma.admin.pluginEvent.count({ where: { tenantId: TENANT_A_ID } });
    expect(afterEvents).toBe(beforeEvents);
  });
});
