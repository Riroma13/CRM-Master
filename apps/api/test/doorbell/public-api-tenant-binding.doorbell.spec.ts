import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { TokenService } from '../../src/modules/public-api/auth/token.service';
import { randomUUID } from 'node:crypto';

const dbAvailable = Boolean(process.env.DATABASE_URL || process.env.DATABASE_TEST_URL);
const TENANT_A = '00000000-0000-0000-0000-000000000301';
const TENANT_B = '00000000-0000-0000-0000-000000000302';
const SLUG_A = 'public-binding-doorbell-a';
const SLUG_B = 'public-binding-doorbell-b';

describe('DOORBELL — public API tenant binding', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let tokenService: TokenService;
    let tokenA: string;
    let tokenB: string;
    let tokenAId: string;
    let workflowAId: string;
    let workflowBId: string;
    let documentAId: string;
    let documentBId: string;
    let documentARecordId: string;
    let documentBRecordId: string;
    let workflowDefinitionAId: string;
    let workflowDefinitionBId: string;

    beforeAll(async () => {
      if (!dbAvailable) throw new Error('DATABASE_URL or DATABASE_TEST_URL is required; refusing to skip doorbell scenarios');
      const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();
      prisma = moduleFixture.get(PrismaService);
      tokenService = moduleFixture.get(TokenService);

      await prisma.admin.tenant.upsert({
        where: { id: TENANT_A },
        create: { id: TENANT_A, slug: SLUG_A, name: 'Public Binding Doorbell A' },
        update: { slug: SLUG_A },
      });
      await prisma.admin.tenant.upsert({
        where: { id: TENANT_B },
        create: { id: TENANT_B, slug: SLUG_B, name: 'Public Binding Doorbell B' },
        update: { slug: SLUG_B },
      });

      await prisma.admin.apiKey.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
      const createdA = await tokenService.createToken(TENANT_A, 'Doorbell A', ['workflows:read', 'documents:read']);
      const createdB = await tokenService.createToken(TENANT_B, 'Doorbell B', ['workflows:read', 'documents:read']);
      tokenA = createdA.token;
      tokenAId = createdA.id;
      tokenB = createdB.token;

      const workflowA = await prisma.admin.workflowDefinition.create({
        data: {
          tenantId: TENANT_A,
          name: `Public API workflow A ${randomUUID()}`,
          versions: { create: { version: 1, nodes: [], startNode: 'start', isPublished: false } },
        },
      });
      const workflowB = await prisma.admin.workflowDefinition.create({
        data: {
          tenantId: TENANT_B,
          name: `Public API workflow B ${randomUUID()}`,
          versions: { create: { version: 1, nodes: [], startNode: 'start', isPublished: false } },
        },
      });
      workflowDefinitionAId = workflowA.id;
      workflowDefinitionBId = workflowB.id;
      const instanceA = await prisma.admin.workflowInstance.create({
        data: { definitionId: workflowA.id, definitionVersion: 1, tenantId: TENANT_A, status: 'running' },
      });
      const instanceB = await prisma.admin.workflowInstance.create({
        data: { definitionId: workflowB.id, definitionVersion: 1, tenantId: TENANT_B, status: 'running' },
      });
      workflowAId = instanceA.id;
      workflowBId = instanceB.id;

      const documentA = await prisma.admin.document.create({
        data: {
          documentId: randomUUID(),
          tenantId: TENANT_A,
          name: 'public-api-document-a.txt',
          mimeType: 'text/plain',
          sizeBytes: 1,
          hash: randomUUID(),
          tags: [],
          metadata: { fixture: 'public-api-tenant-binding' },
          status: 'ready',
          createdBy: 'doorbell',
        },
      });
      const documentB = await prisma.admin.document.create({
        data: {
          documentId: randomUUID(),
          tenantId: TENANT_B,
          name: 'public-api-document-b.txt',
          mimeType: 'text/plain',
          sizeBytes: 1,
          hash: randomUUID(),
          tags: [],
          metadata: { fixture: 'public-api-tenant-binding' },
          status: 'ready',
          createdBy: 'doorbell',
        },
      });
      documentAId = documentA.documentId;
      documentBId = documentB.documentId;
      documentARecordId = documentA.id;
      documentBRecordId = documentB.id;
    }, 30000);

    afterAll(async () => {
      if (prisma) {
        await prisma.admin.document.deleteMany({ where: { documentId: { in: [documentAId, documentBId] } } });
        await prisma.admin.workflowInstance.deleteMany({ where: { id: { in: [workflowAId, workflowBId] } } });
        await prisma.admin.workflowDefinition.deleteMany({ where: { id: { in: [workflowDefinitionAId, workflowDefinitionBId] } } });
        await prisma.admin.apiKey.deleteMany({ where: { tenantId: { in: [TENANT_A, TENANT_B] } } });
        await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
      }
      await app.close();
    });

    it('allows same-tenant list access and keeps neutral Host token-bound', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Host', 'api.crmmaster.com')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      const workflow = await request(app.getHttpServer())
        .get(`/api/v1/public/workflows/${workflowAId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      const document = await request(app.getHttpServer())
        .get(`/api/v1/public/documents/${documentAId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(workflow.status).toBe(200);
      expect(workflow.body.data.id).toBe(workflowAId);
      expect(document.status).toBe(200);
      expect(document.body.data.id).toBe(documentARecordId);
    });

    it('rejects a conflicting tenant selector and tenant Host before service access', async () => {
      const selector = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ tenantId: TENANT_B });
      expect(selector.status).toBe(403);

      const host = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Host', `${SLUG_B}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(host.status).toBe(403);
    });

    it('returns scoped 404 for actual Tenant B resources without disclosure or mutation', async () => {
      const workflowBefore = await prisma.admin.workflowInstance.findUnique({ where: { id: workflowBId } });
      const documentBefore = await prisma.admin.document.findUnique({ where: { id: documentBRecordId } });
      const workflow = await request(app.getHttpServer())
        .get(`/api/v1/public/workflows/${workflowBId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      const document = await request(app.getHttpServer())
        .get(`/api/v1/public/documents/${documentBId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(workflow.status).toBe(404);
      expect(document.status).toBe(404);
      expect(JSON.stringify(workflow.body)).not.toContain(TENANT_B);
      expect(JSON.stringify(workflow.body)).not.toContain(workflowBId);
      expect(JSON.stringify(document.body)).not.toContain(TENANT_B);
      expect(JSON.stringify(document.body)).not.toContain(documentBId);

      // There is no POST/PATCH/PUT/DELETE route under either public read-only
      // controller. These bounded probes prove denied mutation attempts do not
      // alter authoritative Tenant B state.
      const workflowMutation = await request(app.getHttpServer())
        .post(`/api/v1/public/workflows/${workflowBId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ status: 'cancelled' });
      const documentMutation = await request(app.getHttpServer())
        .delete(`/api/v1/public/documents/${documentBId}`)
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect([404, 405]).toContain(workflowMutation.status);
      expect([404, 405]).toContain(documentMutation.status);

      const workflowAfter = await prisma.admin.workflowInstance.findUnique({ where: { id: workflowBId } });
      const documentAfter = await prisma.admin.document.findUnique({ where: { id: documentBRecordId } });
      expect(workflowAfter).toEqual(workflowBefore);
      expect(documentAfter).toEqual(documentBefore);
    });

    it('preserves 401 for missing and revoked credentials', async () => {
      const missing = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Host', `${SLUG_A}.crmmaster.com`);
      expect(missing.status).toBe(401);

      await tokenService.revokeToken(tokenAId);
      const revoked = await request(app.getHttpServer())
        .get('/api/v1/public/workflows')
        .set('Host', `${SLUG_A}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(revoked.status).toBe(401);
    });

    it('keeps Tenant B authority independent from Tenant A', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/public/documents')
        .set('Host', `${SLUG_B}.crmmaster.com`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
});
