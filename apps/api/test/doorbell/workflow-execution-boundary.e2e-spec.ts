/**
 * DOORBELL — secure workflow execution boundary.
 *
 * This suite is enabled only with an explicitly disposable, non-production
 * database. It exercises the real Nest HTTP pipeline and Prisma persistence.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

jest.mock('@shared/plugin', () => ({ validatePluginManifest: jest.fn() }), { virtual: true });

// Bind every Prisma client created by this disposable-only harness to the
// explicitly authorized URL without touching DATABASE_URL or DATABASE_TEST_URL.
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  const disposableUrl = process.env.SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL;
  const boundedUrl = disposableUrl ? new URL(disposableUrl) : undefined;
  boundedUrl?.searchParams.set('connection_limit', '1');
  boundedUrl?.searchParams.set('pool_timeout', '30');
  let sharedClient: any;
  return {
    ...actual,
    PrismaClient: class DisposablePrismaClient {
      constructor(options: any = {}) {
        sharedClient ??= new actual.PrismaClient({
          ...options,
          datasources: { db: { url: boundedUrl?.toString() } },
        });
        return sharedClient;
      }
    },
  };
});

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { DefinitionService } from '../../src/modules/workflow/definition.service';
import { WorkflowService } from '../../src/modules/workflow/workflow.service';

const DATABASE_URL = process.env.SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL;
let safeDatabase = false;
let doorbellDatabaseUrl: string | undefined;
if (DATABASE_URL) {
  const url = new URL(DATABASE_URL);
  safeDatabase = !['crm_test', 'production'].includes(url.pathname.slice(1)) &&
    url.hostname !== 'production' &&
    url.hostname !== 'localhost';
  if (safeDatabase) {
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '30');
    doorbellDatabaseUrl = url.toString();
  }
}

const TENANT_A_ID = '00000000-0000-0000-0000-000000000401';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000402';
const TENANT_A_SLUG = 'workflow-boundary-a';
const TENANT_B_SLUG = 'workflow-boundary-b';
const ORG_A_ID = '00000000-0000-0000-0000-000000000411';
const ORG_B_ID = '00000000-0000-0000-0000-000000000412';
const OWNER_A_ID = '00000000-0000-0000-0000-000000000421';
const ADMIN_A_ID = '00000000-0000-0000-0000-000000000422';
const OPERATOR_A_ID = '00000000-0000-0000-0000-000000000423';
const LECTOR_A_ID = '00000000-0000-0000-0000-000000000424';
const UNKNOWN_A_ID = '00000000-0000-0000-0000-000000000425';
const OWNER_B_ID = '00000000-0000-0000-0000-000000000426';
const DEFINITION_A_ID = '00000000-0000-0000-0000-000000000431';
const DEFINITION_B_ID = '00000000-0000-0000-0000-000000000432';
const SESSION_A_ID = '00000000-0000-0000-0000-000000000441';
const SESSION_ADMIN_ID = '00000000-0000-0000-0000-000000000442';
const SESSION_OPERATOR_ID = '00000000-0000-0000-0000-000000000443';
const SESSION_LECTOR_ID = '00000000-0000-0000-0000-000000000444';
const SESSION_UNKNOWN_ID = '00000000-0000-0000-0000-000000000445';
const SESSION_B_ID = '00000000-0000-0000-0000-000000000446';
const MEMBER_A_OWNER_ID = '00000000-0000-0000-0000-000000000451';
const MEMBER_A_ADMIN_ID = '00000000-0000-0000-0000-000000000452';
const MEMBER_A_OPERATOR_ID = '00000000-0000-0000-0000-000000000453';
const MEMBER_A_LECTOR_ID = '00000000-0000-0000-0000-000000000454';
const MEMBER_A_UNKNOWN_ID = '00000000-0000-0000-0000-000000000455';
const MEMBER_B_OWNER_ID = '00000000-0000-0000-0000-000000000456';

const tokens = {
  ownerA: 'workflow-boundary-owner-a',
  adminA: 'workflow-boundary-admin-a',
  operatorA: 'workflow-boundary-operator-a',
  lectorA: 'workflow-boundary-lector-a',
  unknownA: 'workflow-boundary-unknown-a',
  ownerB: 'workflow-boundary-owner-b',
};

const definition = {
  name: 'Boundary workflow',
  nodes: [{ id: 'start', name: 'Start', type: 'start', config: {} }],
  startNode: 'start',
};

const host = (slug: string) => `${slug}.crmmaster.com`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

(safeDatabase ? describe : describe.skip)('DOORBELL — workflow execution boundary', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    const ids = [TENANT_A_ID, TENANT_B_ID];
    await prisma.admin.workflowVariable.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.admin.workflowExecution.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.admin.workflowInstance.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.admin.workflowDefinition.deleteMany({ where: { id: { in: [DEFINITION_A_ID, DEFINITION_B_ID] } } });
    await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [OWNER_A_ID, ADMIN_A_ID, OPERATOR_A_ID, LECTOR_A_ID, UNKNOWN_A_ID, OWNER_B_ID] } } });
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE id IN ($1,$2,$3,$4,$5,$6)', SESSION_A_ID, SESSION_ADMIN_ID, SESSION_OPERATOR_ID, SESSION_LECTOR_ID, SESSION_UNKNOWN_ID, SESSION_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE id IN ($1,$2,$3,$4,$5,$6)', MEMBER_A_OWNER_ID, MEMBER_A_ADMIN_ID, MEMBER_A_OPERATOR_ID, MEMBER_A_LECTOR_ID, MEMBER_A_UNKNOWN_ID, MEMBER_B_OWNER_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id IN ($1,$2,$3,$4,$5,$6)', OWNER_A_ID, ADMIN_A_ID, OPERATOR_A_ID, LECTOR_A_ID, UNKNOWN_A_ID, OWNER_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1,$2)', ORG_A_ID, ORG_B_ID);
    await prisma.admin.tenant.deleteMany({ where: { id: { in: ids } } });

    await prisma.admin.tenant.createMany({ data: [
      { id: TENANT_A_ID, slug: TENANT_A_SLUG, name: 'Workflow Boundary A', betterAuthOrganizationId: ORG_A_ID },
      { id: TENANT_B_ID, slug: TENANT_B_SLUG, name: 'Workflow Boundary B', betterAuthOrganizationId: ORG_B_ID },
    ] });
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1,$2,$3,NOW()),($4,$5,$6,NOW())',
      ORG_A_ID, 'Workflow Boundary A', TENANT_A_SLUG, ORG_B_ID, 'Workflow Boundary B', TENANT_B_SLUG,
    );
    const users = [
      [OWNER_A_ID, 'owner-a', tokens.ownerA], [ADMIN_A_ID, 'admin-a', tokens.adminA],
      [OPERATOR_A_ID, 'operator-a', tokens.operatorA], [LECTOR_A_ID, 'lector-a', tokens.lectorA],
      [UNKNOWN_A_ID, 'unknown-a', tokens.unknownA], [OWNER_B_ID, 'owner-b', tokens.ownerB],
    ];
    for (const [id, name] of users) {
      await prisma.admin.$executeRawUnsafe(
        'INSERT INTO ba_users (id,email,"emailVerified",name,"createdAt","updatedAt") VALUES ($1,$2,true,$3,NOW(),NOW())',
        id, `${name}@workflow-boundary.test`, name,
      );
    }
    await prisma.admin.legacyUser.createMany({ data: [
      { id: OWNER_A_ID, tenantId: TENANT_A_ID, email: 'owner-a@workflow-boundary.test', role: 'owner', betterAuthUserId: OWNER_A_ID },
      { id: ADMIN_A_ID, tenantId: TENANT_A_ID, email: 'admin-a@workflow-boundary.test', role: 'admin', betterAuthUserId: ADMIN_A_ID },
      { id: OPERATOR_A_ID, tenantId: TENANT_A_ID, email: 'operator-a@workflow-boundary.test', role: 'operador', betterAuthUserId: OPERATOR_A_ID },
      { id: LECTOR_A_ID, tenantId: TENANT_A_ID, email: 'lector-a@workflow-boundary.test', role: 'lector', betterAuthUserId: LECTOR_A_ID },
      { id: UNKNOWN_A_ID, tenantId: TENANT_A_ID, email: 'unknown-a@workflow-boundary.test', role: 'unknown', betterAuthUserId: UNKNOWN_A_ID },
      { id: OWNER_B_ID, tenantId: TENANT_B_ID, email: 'owner-b@workflow-boundary.test', role: 'owner', betterAuthUserId: OWNER_B_ID },
    ] });
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_members (id,organization_id,user_id,role,"createdAt") VALUES ($1,$2,$3,$4,NOW()),($5,$2,$6,$7,NOW()),($8,$2,$9,$10,NOW()),($11,$2,$12,$13,NOW()),($14,$2,$15,$16,NOW()),($17,$18,$19,$20,NOW())',
      MEMBER_A_OWNER_ID, ORG_A_ID, OWNER_A_ID, 'owner', MEMBER_A_ADMIN_ID, ADMIN_A_ID, 'admin',
      MEMBER_A_OPERATOR_ID, OPERATOR_A_ID, 'member', MEMBER_A_LECTOR_ID, LECTOR_A_ID, 'member',
      MEMBER_A_UNKNOWN_ID, UNKNOWN_A_ID, 'member', MEMBER_B_OWNER_ID, ORG_B_ID, OWNER_B_ID, 'owner',
    );
    await prisma.admin.$executeRawUnsafe(
      'INSERT INTO ba_sessions (id,user_id,token,expires_at,active_organization_id,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()),($6,$7,$8,$4,$5,NOW(),NOW()),($9,$10,$11,$4,$5,NOW(),NOW()),($12,$13,$14,$4,$5,NOW(),NOW()),($15,$16,$17,$4,$5,NOW(),NOW()),($18,$19,$20,$4,$21,NOW(),NOW())',
      SESSION_A_ID, OWNER_A_ID, tokens.ownerA, new Date(Date.now() + 3600000), ORG_A_ID,
      SESSION_ADMIN_ID, ADMIN_A_ID, tokens.adminA, SESSION_OPERATOR_ID, OPERATOR_A_ID, tokens.operatorA,
      SESSION_LECTOR_ID, LECTOR_A_ID, tokens.lectorA, SESSION_UNKNOWN_ID, UNKNOWN_A_ID, tokens.unknownA,
      SESSION_B_ID, OWNER_B_ID, tokens.ownerB, ORG_B_ID,
    );
    await prisma.admin.workflowDefinition.create({ data: {
      id: DEFINITION_B_ID, tenantId: TENANT_B_ID, name: 'Tenant B workflow',
      versions: { create: { version: 1, nodes: definition.nodes, startNode: definition.startNode, isPublished: true } },
    } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.admin.workflowVariable.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.workflowExecution.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.workflowInstance.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await prisma.admin.workflowDefinition.deleteMany({ where: { id: { in: [DEFINITION_A_ID, DEFINITION_B_ID] } } });
    await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [OWNER_A_ID, ADMIN_A_ID, OPERATOR_A_ID, LECTOR_A_ID, UNKNOWN_A_ID, OWNER_B_ID] } } });
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE id IN ($1,$2,$3,$4,$5,$6)', SESSION_A_ID, SESSION_ADMIN_ID, SESSION_OPERATOR_ID, SESSION_LECTOR_ID, SESSION_UNKNOWN_ID, SESSION_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE id IN ($1,$2,$3,$4,$5,$6)', MEMBER_A_OWNER_ID, MEMBER_A_ADMIN_ID, MEMBER_A_OPERATOR_ID, MEMBER_A_LECTOR_ID, MEMBER_A_UNKNOWN_ID, MEMBER_B_OWNER_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id IN ($1,$2,$3,$4,$5,$6)', OWNER_A_ID, ADMIN_A_ID, OPERATOR_A_ID, LECTOR_A_ID, UNKNOWN_A_ID, OWNER_B_ID);
    await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1,$2)', ORG_A_ID, ORG_B_ID);
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
    await app.close();
  });

  it('denies anonymous create, publish, start, resume, read, and control before workflow access', async () => {
    const definitionService = app.get(DefinitionService);
    const workflowService = app.get(WorkflowService);
    const create = jest.spyOn(definitionService, 'create');
    const publish = jest.spyOn(definitionService, 'publish');
    const start = jest.spyOn(workflowService, 'startWorkflow');
    const resume = jest.spyOn(workflowService, 'resumeWorkflow');
    const get = jest.spyOn(workflowService, 'getInstance');
    const suspend = jest.spyOn(workflowService, 'suspendWorkflow');
    const base = () => request(app.getHttpServer());
    await base().post('/api/v1/workflow/definitions').set('Host', host(TENANT_A_SLUG)).send({ ...definition, tenantId: TENANT_B_ID }).expect(403);
    await base().post(`/api/v1/workflow/definitions/${DEFINITION_B_ID}/publish`).set('Host', host(TENANT_A_SLUG)).expect(403);
    await base().post('/api/v1/workflow/instances').set('Host', host(TENANT_A_SLUG)).send({ definitionId: DEFINITION_B_ID, tenantId: TENANT_B_ID }).expect(403);
    await base().post(`/api/v1/workflow/instances/${DEFINITION_B_ID}/resume`).set('Host', host(TENANT_A_SLUG)).send({ tenantId: TENANT_B_ID }).expect(403);
    await base().get(`/api/v1/workflow/definitions/${DEFINITION_B_ID}`).set('Host', host(TENANT_A_SLUG)).query({ tenantId: TENANT_B_ID }).expect(403);
    await base().post(`/api/v1/workflow/instances/${DEFINITION_B_ID}/suspend`).set('Host', host(TENANT_A_SLUG)).send({ tenantId: TENANT_B_ID }).expect(403);
    expect(create).not.toHaveBeenCalled(); expect(publish).not.toHaveBeenCalled(); expect(start).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled(); expect(get).not.toHaveBeenCalled(); expect(suspend).not.toHaveBeenCalled();
  });

  it.each([['operador', tokens.operatorA], ['lector', tokens.lectorA], ['unknown', tokens.unknownA]])(
    'denies unauthorized role %s before workflow access', async (_role, token) => {
      await request(app.getHttpServer()).get('/api/v1/workflow/definitions').set('Host', host(TENANT_A_SLUG)).set(auth(token)).expect(403);
    },
  );

  it('denies Host/org/session mismatch and all cross-tenant resource access', async () => {
    const routes = [
      { label: 'read definition', method: 'GET', path: `/api/v1/workflow/definitions/${DEFINITION_B_ID}`, request: () => request(app.getHttpServer()).get(`/api/v1/workflow/definitions/${DEFINITION_B_ID}`) },
      { label: 'publish definition', method: 'POST', path: `/api/v1/workflow/definitions/${DEFINITION_B_ID}/publish`, request: () => request(app.getHttpServer()).post(`/api/v1/workflow/definitions/${DEFINITION_B_ID}/publish`) },
      { label: 'start instance', method: 'POST', path: '/api/v1/workflow/instances', callerTenantId: TENANT_B_ID, request: () => request(app.getHttpServer()).post('/api/v1/workflow/instances').send({ definitionId: DEFINITION_B_ID, tenantId: TENANT_B_ID }) },
      { label: 'resume instance', method: 'POST', path: `/api/v1/workflow/instances/${DEFINITION_B_ID}/resume`, callerTenantId: TENANT_B_ID, request: () => request(app.getHttpServer()).post(`/api/v1/workflow/instances/${DEFINITION_B_ID}/resume`).send({ tenantId: TENANT_B_ID }) },
      { label: 'suspend instance', method: 'POST', path: `/api/v1/workflow/instances/${DEFINITION_B_ID}/suspend`, callerTenantId: TENANT_B_ID, request: () => request(app.getHttpServer()).post(`/api/v1/workflow/instances/${DEFINITION_B_ID}/suspend`).send({ tenantId: TENANT_B_ID }) },
    ];
    for (const route of routes) {
      const response = await route.request().set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA));
      if (response.status !== 403) {
        throw new Error(`Cross-tenant denial failed: ${route.method} ${route.path} (${route.label}) returned ${response.status}; operation=${route.label}; authenticatedAuthority=Tenant A owner (${OWNER_A_ID}); hostTenant=Tenant A (${TENANT_A_ID}); resourceTenant=Tenant B (${TENANT_B_ID}); callerTenantId=${route.callerTenantId ?? 'none'}`);
      }
    }
    await request(app.getHttpServer()).get('/api/v1/workflow/definitions').set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerB)).expect(403);
  });

  it('allows same-tenant owner/admin lifecycle and ignores forged tenantId', async () => {
    const ownerCreate = await request(app.getHttpServer()).post('/api/v1/workflow/definitions')
      .set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA)).send({ ...definition, tenantId: TENANT_B_ID }).expect(201);
    expect(ownerCreate.body.tenantId).toBe(TENANT_A_ID);
    const definitionId = ownerCreate.body.id;
    await request(app.getHttpServer()).post(`/api/v1/workflow/definitions/${definitionId}/publish`).set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA)).expect(201);
    const started = await request(app.getHttpServer()).post('/api/v1/workflow/instances').set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA)).send({ definitionId, tenantId: TENANT_B_ID }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/workflow/instances/${started.body.instanceId}/suspend`).set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA)).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/workflow/instances/${started.body.instanceId}/resume`).set('Host', host(TENANT_A_SLUG)).set(auth(tokens.ownerA)).expect(201);
    await request(app.getHttpServer()).get(`/api/v1/workflow/definitions/${definitionId}`).set('Host', host(TENANT_A_SLUG)).set(auth(tokens.adminA)).expect(200);
  });
});

if (!safeDatabase) {
  describe('DOORBELL safety gate', () => {
    it('blocks execution without SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL', () => {
      console.warn('[WORKFLOW DOORBELL] Blocked: provide SECURE_WORKFLOW_DISPOSABLE_DATABASE_URL for disposable real-Prisma proof.');
    });
  });
}
