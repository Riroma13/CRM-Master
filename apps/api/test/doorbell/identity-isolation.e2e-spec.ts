/**
 * 🔔 DOORBELL — SPEC-0025 Identity tenant isolation
 *
 * Requires DATABASE_URL or DATABASE_TEST_URL. This suite uses the real Nest
 * HTTP pipeline and real tenant-scoped Prisma clients; it is intentionally not
 * replaced by mocked unit coverage.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

// The API e2e Jest config does not map the unrelated shared-plugin alias.
// Keep this boundary stubbed so the real AppModule/Identity HTTP pipeline boots.
jest.mock('@shared/plugin', () => ({ validatePluginManifest: jest.fn() }), { virtual: true });

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';
import { IdentityAuthorizationService } from '../../src/modules/identity/identity-authorization.service';

const TENANT_A_ID = '00000000-0000-0000-0000-000000000025';
const TENANT_B_ID = '00000000-0000-0000-0000-000000000026';
const TENANT_A_SLUG = 'identity-doorbell-a';
const TENANT_B_SLUG = 'identity-doorbell-b';
const ORG_A_ID = '00000000-0000-0000-0000-000000000027';
const ORG_B_ID = '00000000-0000-0000-0000-000000000028';
const BA_USER_ID = '00000000-0000-0000-0000-000000000029';
const LEGACY_USER_ID = '00000000-0000-0000-0000-000000000030';
const SESSION_TOKEN = 'identity-doorbell-session-0025';
const OPERATION_B_ID = '00000000-0000-0000-0000-000000000031';
const OUTBOX_B_ID = '00000000-0000-0000-0000-000000000032';
const MUTATION_B_ID = '00000000-0000-0000-0000-000000000033';

const dbAvailable = !!(process.env.DATABASE_URL || process.env.DATABASE_TEST_URL);

if (dbAvailable) {
  describe('🔔 DOORBELL — Identity tenant isolation', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let identity: IdentityAuthorizationService;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();
      prisma = moduleFixture.get(PrismaService);
      identity = moduleFixture.get(IdentityAuthorizationService);

      await prisma.admin.identityAuditOutbox.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.identityAuthorizationOperation.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.legacyUser.deleteMany({ where: { id: LEGACY_USER_ID } });
      await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE user_id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE user_id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1, $2)', ORG_A_ID, ORG_B_ID);

      await prisma.admin.tenant.createMany({
        data: [
          { id: TENANT_A_ID, slug: TENANT_A_SLUG, name: 'Identity Doorbell A', betterAuthOrganizationId: ORG_A_ID },
          { id: TENANT_B_ID, slug: TENANT_B_SLUG, name: 'Identity Doorbell B', betterAuthOrganizationId: ORG_B_ID },
        ],
      });
      await prisma.admin.legacyUser.create({
        data: { id: LEGACY_USER_ID, tenantId: TENANT_A_ID, email: 'identity-doorbell@example.test', role: 'superadmin', betterAuthUserId: BA_USER_ID },
      });
      await prisma.admin.$executeRawUnsafe(
        'INSERT INTO ba_organizations (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW()), ($4, $5, $6, NOW())',
        ORG_A_ID, 'Identity Doorbell A', TENANT_A_SLUG, ORG_B_ID, 'Identity Doorbell B', TENANT_B_SLUG,
      );
      await prisma.admin.$executeRawUnsafe(
        'INSERT INTO ba_users (id, email, "emailVerified", name, "createdAt", "updatedAt") VALUES ($1, $2, true, $3, NOW(), NOW())',
        BA_USER_ID, 'identity-doorbell@example.test', 'Identity Doorbell User',
      );
      await prisma.admin.$executeRawUnsafe(
        'INSERT INTO ba_members (id, organization_id, user_id, role, "createdAt") VALUES ($1, $2, $3, $4, NOW())',
        '00000000-0000-0000-0000-000000000034', ORG_A_ID, BA_USER_ID, 'admin',
      );
      await prisma.admin.$executeRawUnsafe(
        'INSERT INTO ba_sessions (id, user_id, token, expires_at, active_organization_id, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        '00000000-0000-0000-0000-000000000035', BA_USER_ID, SESSION_TOKEN, new Date(Date.now() + 60 * 60 * 1000), ORG_B_ID,
      );
      await prisma.admin.identityAuthorizationOperation.create({
        data: { id: OPERATION_B_ID, tenantId: TENANT_B_ID, subjectId: 'subject-b', mutationId: MUTATION_B_ID },
      });
      await prisma.admin.identityAuditOutbox.create({
        data: { id: OUTBOX_B_ID, eventId: '00000000-0000-0000-0000-000000000036', tenantId: TENANT_B_ID, mutationId: MUTATION_B_ID, eventType: 'identity.member.removed', payload: {} },
      });
    });

    afterAll(async () => {
      if (!prisma) return;
      await prisma.admin.identityAuditOutbox.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.identityAuthorizationOperation.deleteMany({ where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.legacyUser.deleteMany({ where: { id: LEGACY_USER_ID } });
      await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } } });
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_sessions WHERE user_id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_members WHERE user_id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_users WHERE id = $1', BA_USER_ID);
      await prisma.admin.$executeRawUnsafe('DELETE FROM ba_organizations WHERE id IN ($1, $2)', ORG_A_ID, ORG_B_ID);
      await app.close();
    });

    it('rejects Host A with provider organization B and preserves Host authority', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/identity/invitations')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Authorization', `Bearer ${SESSION_TOKEN}`)
        .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440000')
        .send({ subjectId: 'subject-a', payload: {} });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('IDENTITY_ORGANIZATION_MISMATCH');
      expect(response.body.message).not.toContain(TENANT_B_ID);
    });

    it('prevents tenant A from reading, claiming, completing, or mutating tenant B state', async () => {
      const scopedA = prisma.forTenant(TENANT_A_ID) as any;
      const scopedB = prisma.forTenant(TENANT_B_ID) as any;

      expect(await scopedA.identityAuthorizationOperation.findMany()).toHaveLength(0);
      expect(await scopedA.identityAuditOutbox.findMany()).toHaveLength(0);
      await expect(identity.claim(TENANT_A_ID, OPERATION_B_ID, 'tenant-a-worker')).resolves.toBeNull();
      await expect(identity.complete(TENANT_A_ID, OPERATION_B_ID, 'tenant-a-worker')).resolves.toBeNull();
      await expect(identity.mutate({
        tenantId: TENANT_A_ID,
        subjectId: 'subject-b',
        operation: 'member.remove',
        resourceId: 'member-b',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
        eventType: 'identity.member.removed',
        payload: {},
      })).resolves.toMatchObject({ denied: false });

      await expect(scopedB.identityAuthorizationOperation.findUnique({ where: { id: OPERATION_B_ID } })).resolves.toMatchObject({ status: 'PENDING', attempts: 0 });
      await expect(scopedB.identityAuditOutbox.findUnique({ where: { id: OUTBOX_B_ID } })).resolves.toMatchObject({ status: 'PENDING', attempts: 0 });
    });
  });
} else {
  describe('🔔 DOORBELL — Identity tenant isolation', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn('[DOORBELL] Skipping Identity isolation: DATABASE_URL not set.');
    });
  });
}
