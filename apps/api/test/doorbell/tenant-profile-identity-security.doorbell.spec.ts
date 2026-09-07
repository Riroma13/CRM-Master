import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const TENANT_A = '00000000-0000-0000-0000-000000000701';
const TENANT_B = '00000000-0000-0000-0000-000000000702';
const ORG_A = '00000000-0000-0000-0000-000000000711';
const ORG_B = '00000000-0000-0000-0000-000000000712';
const BA_A = '00000000-0000-0000-0000-000000000721';
const BA_B = '00000000-0000-0000-0000-000000000722';
const LEGACY_A = '00000000-0000-0000-0000-000000000731';
const LEGACY_B = '00000000-0000-0000-0000-000000000732';
const HOST_A = 'identity-fix-a.crmmaster.com';
const HOST_B = 'identity-fix-b.crmmaster.com';

const isolatedDatabase = () => {
  const value = process.env.TENANT_ADMIN_MVP_DATABASE_URL;
  if (!value) throw new Error('TENANT_ADMIN_MVP_DATABASE_URL is required for the isolated doorbell');
  return value;
};

describe('DOORBELL — tenant profile identity and tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookieA: string;
  let cookieB: string;

  const http = () => request(app.getHttpServer());
  const cookie = (response: request.Response) => response.headers['set-cookie'][0].split(';')[0];

  beforeAll(async () => {
    process.env.DATABASE_URL = isolatedDatabase();
    const sharedPrisma = new PrismaService();
    await sharedPrisma.onModuleInit();
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(sharedPrisma).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = sharedPrisma;

    await prisma.admin.legacyUser.deleteMany({ where: { id: { in: [LEGACY_A, LEGACY_B] } } });
    await prisma.admin.member.deleteMany({ where: { userId: { in: [BA_A, BA_B] } } });
    await prisma.admin.user.deleteMany({ where: { id: { in: [BA_A, BA_B] } } });
    await prisma.admin.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.admin.tenant.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.admin.tenant.createMany({ data: [
      { id: TENANT_A, slug: 'identity-fix-a', name: 'Identity A', betterAuthOrganizationId: ORG_A },
      { id: TENANT_B, slug: 'identity-fix-b', name: 'Identity B', betterAuthOrganizationId: ORG_B },
    ] });
    await prisma.admin.organization.createMany({ data: [
      { id: ORG_A, slug: 'identity-fix-a', name: 'Identity A' },
      { id: ORG_B, slug: 'identity-fix-b', name: 'Identity B' },
    ] });
    await prisma.admin.user.createMany({ data: [
      { id: BA_A, email: 'identity-a@example.test', name: 'Identity A', emailVerified: true },
      { id: BA_B, email: 'identity-b@example.test', name: 'Identity B', emailVerified: true },
    ] });
    await prisma.admin.member.createMany({ data: [
      { id: '00000000-0000-0000-0000-000000000741', organizationId: ORG_A, userId: BA_A, role: 'admin' },
      { id: '00000000-0000-0000-0000-000000000742', organizationId: ORG_B, userId: BA_B, role: 'admin' },
    ] });
    await prisma.admin.legacyUser.createMany({ data: [
      { id: LEGACY_A, tenantId: TENANT_A, email: 'identity-a@example.test', name: 'Identity A', role: 'superadmin', isActive: true, betterAuthUserId: BA_A },
      { id: LEGACY_B, tenantId: TENANT_B, email: 'identity-b@example.test', name: 'Identity B', role: 'superadmin', isActive: true, betterAuthUserId: BA_B },
    ] });
    const loginA = await http().post('/api/v1/auth/login').set('Host', HOST_A).send({ email: 'identity-a@example.test', password: 'unused' });
    const loginB = await http().post('/api/v1/auth/login').set('Host', HOST_B).send({ email: 'identity-b@example.test', password: 'unused' });
    cookieA = cookie(loginA); cookieB = cookie(loginB);
  }, 30000);

  afterAll(async () => { await app?.close(); await prisma?.onModuleDestroy(); });

  it('keeps profile password payloads from changing credentials while preserving profile data', async () => {
    const response = await http().patch('/api/v1/tenant/profile').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ name: 'Identity A Updated', logo: null, password: 'must-not-mutate' });
    expect(response.status).toBe(200);
    expect(await prisma.admin.tenant.findUnique({ where: { id: TENANT_A }, select: { name: true, logo: true } }))
      .toEqual({ name: 'Identity A Updated', logo: null });
  });

  it('updates only the authenticated tenant user and rejects Host/session mismatch', async () => {
    const self = await http().patch('/api/v1/tenant/preferencias').set('Host', HOST_A).set('Cookie', cookieA)
      .send({ email: 'identity-b@example.test', tenantId: TENANT_B, notifEmail: false, notifWhatsApp: true });
    expect(self.status).toBe(200);
    expect((await prisma.admin.legacyUser.findUnique({ where: { id: LEGACY_A }, select: { notifEmail: true, notifWhatsApp: true } })))
      .toEqual({ notifEmail: false, notifWhatsApp: true });
    const before = await prisma.admin.legacyUser.findUnique({ where: { id: LEGACY_B }, select: { notifEmail: true, notifWhatsApp: true } });
    const mismatch = await http().patch('/api/v1/tenant/preferencias').set('Host', HOST_B).set('Cookie', cookieA)
      .send({ notifEmail: true, notifWhatsApp: true });
    expect([401, 403]).toContain(mismatch.status);
    expect(await prisma.admin.legacyUser.findUnique({ where: { id: LEGACY_B }, select: { notifEmail: true, notifWhatsApp: true } })).toEqual(before);
    expect(cookieB).toBeTruthy();
  });
});
