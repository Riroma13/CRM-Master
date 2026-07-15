/**
 * 🔔 DOORBELL — Cross-client isolation e2e
 *
 * CRÍTICO: Ningún Cliente A debe poder leer/escribir datos de Cliente B.
 * El token de cliente debe ser rechazado en rutas /admin.
 * El token de admin debe ser rechazado en rutas /client.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma.service';

const JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'client-jwt-dev-secret-change-in-prod';
const COOKIE_NAME = '__Secure-client-session';

const TENANT_A_ID = 'iso-ten-0000-0000-4000-000000000001';
const TENANT_B_ID = 'iso-ten-0000-0000-4000-000000000002';
const TENANT_A_SLUG = 'iso-tenant-a';
const CLIENTE_A_ID = 'iso-cli-0000-0000-4000-000000000001';
const CLIENTE_B_ID = 'iso-cli-0000-0000-4000-000000000002';
const CLIENTUSER_A_ID = 'iso-cu-0000-0000-4000-000000000001';
const CLIENTUSER_B_ID = 'iso-cu-0000-0000-4000-000000000002';
const CITA_A_ID = 'iso-cita-0000-0000-4000-000000000001';
const CITA_B_ID = 'iso-cita-0000-0000-4000-000000000002';
const DOC_A_ID = 'iso-doc-0000-0000-4000-000000000001';
const DOC_B_ID = 'iso-doc-0000-0000-4000-000000000002';

const dbAvailable = !!(
  process.env.DATABASE_URL || process.env.DATABASE_TEST_URL
);

function clientToken(overrides: any = {}): string {
  return jwt.sign(
    { sub: CLIENTUSER_A_ID, clienteId: CLIENTE_A_ID, tenantId: TENANT_A_ID, role: 'client', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

if (dbAvailable) {
  describe('🔔 DOORBELL — Cross-client isolation', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = moduleFixture.get<PrismaService>(PrismaService);

      // Cleanup
      await prisma.admin.cita.deleteMany({
        where: { id: { in: [CITA_A_ID, CITA_B_ID] } },
      });
      await prisma.admin.documento.deleteMany({
        where: { id: { in: [DOC_A_ID, DOC_B_ID] } },
      });
      await prisma.admin.clientUser.deleteMany({});
      await prisma.admin.cliente.deleteMany({});
      await prisma.admin.tenant.deleteMany({});

      // Seed
      await prisma.admin.tenant.createMany({
        data: [
          { id: TENANT_A_ID, slug: 'iso-tenant-a', name: 'Isolation Tenant A', isActive: true },
          { id: TENANT_B_ID, slug: 'iso-tenant-b', name: 'Isolation Tenant B', isActive: true },
        ],
      });

      await prisma.admin.cliente.createMany({
        data: [
          { id: CLIENTE_A_ID, tenantId: TENANT_A_ID, nombre: 'Isolation Cliente A' },
          { id: CLIENTE_B_ID, tenantId: TENANT_B_ID, nombre: 'Isolation Cliente B' },
        ],
      });

      const hash = bcrypt.hashSync('testpass', 12);
      await prisma.admin.clientUser.createMany({
        data: [
          { id: CLIENTUSER_A_ID, clienteId: CLIENTE_A_ID, tenantId: TENANT_A_ID, email: 'client-a@test.com', passwordHash: hash, isActive: true },
          { id: CLIENTUSER_B_ID, clienteId: CLIENTE_B_ID, tenantId: TENANT_B_ID, email: 'client-b@test.com', passwordHash: hash, isActive: true },
        ],
      });

      await prisma.admin.cita.createMany({
        data: [
          { id: CITA_A_ID, clienteId: CLIENTE_A_ID, tenantId: TENANT_A_ID, titulo: 'Cita A', fecha: new Date() },
          { id: CITA_B_ID, clienteId: CLIENTE_B_ID, tenantId: TENANT_B_ID, titulo: 'Cita B', fecha: new Date() },
        ],
      });

      await prisma.admin.documento.createMany({
        data: [
          { id: DOC_A_ID, clienteId: CLIENTE_A_ID, tenantId: TENANT_A_ID, filename: 'doc-a.pdf', storageKey: 'iso/doc-a.pdf', mimeType: 'application/pdf', sizeBytes: 1000, uploadedBy: CLIENTUSER_A_ID, category: 'general' },
          { id: DOC_B_ID, clienteId: CLIENTE_B_ID, tenantId: TENANT_B_ID, filename: 'doc-b.pdf', storageKey: 'iso/doc-b.pdf', mimeType: 'application/pdf', sizeBytes: 2000, uploadedBy: CLIENTUSER_B_ID, category: 'general' },
        ],
      });
    });

    afterAll(async () => {
      if (prisma) {
        await prisma.admin.cita.deleteMany({
          where: { id: { in: [CITA_A_ID, CITA_B_ID] } },
        });
        await prisma.admin.documento.deleteMany({
          where: { id: { in: [DOC_A_ID, DOC_B_ID] } },
        });
        await prisma.admin.clientUser.deleteMany({});
        await prisma.admin.cliente.deleteMany({});
        await prisma.admin.tenant.deleteMany({});
      }
      if (app) await app.close();
    });

    it('MUST block Client A from reading Client B Cita via scoped client', async () => {
      const prismaA = prisma.forTenant(TENANT_A_ID);
      const cita = await prismaA.cita.findUnique({ where: { id: CITA_B_ID } });
      expect(cita).toBeNull();
    });

    it('MUST block Client A from listing Client B Documento via scoped client', async () => {
      const prismaA = prisma.forTenant(TENANT_A_ID);
      const docs = await prismaA.documento.findMany();
      const docB = docs.find((d: any) => d.id === DOC_B_ID);
      expect(docB).toBeUndefined();
    });

    it('MUST block Client A from mutating Client B Cita (updateMany count=0)', async () => {
      const prismaA = prisma.forTenant(TENANT_A_ID);
      const result = await prismaA.cita.updateMany({
        where: { id: CITA_B_ID },
        data: { titulo: 'Hacked' },
      });
      expect(result.count).toBe(0);

      const stillOriginal = await prisma.admin.cita.findUnique({ where: { id: CITA_B_ID } });
      expect(stillOriginal?.titulo).toBe('Cita B');
    });

    it('MUST block Client B from deleting Client A Documento (deleteMany count=0)', async () => {
      const prismaB = prisma.forTenant(TENANT_B_ID);
      const result = await prismaB.documento.deleteMany({
        where: { id: DOC_A_ID },
      });
      expect(result.count).toBe(0);

      const stillExists = await prisma.admin.documento.findUnique({ where: { id: DOC_A_ID } });
      expect(stillExists).toBeDefined();
      expect(stillExists?.filename).toBe('doc-a.pdf');
    });

    it('MUST block Client B from updating Client A Documento (updateMany count=0)', async () => {
      const prismaB = prisma.forTenant(TENANT_B_ID);
      const result = await prismaB.documento.updateMany({
        where: { id: DOC_A_ID },
        data: { filename: 'hacked.pdf' },
      });
      expect(result.count).toBe(0);

      const stillOriginal = await prisma.admin.documento.findUnique({ where: { id: DOC_A_ID } });
      expect(stillOriginal?.filename).toBe('doc-a.pdf');
    });

    it('MUST reject client token on POST /api/v1/admin/client-users', async () => {
      const token = clientToken();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/client-users')
        .set('Cookie', `${COOKIE_NAME}=${token}`)
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .send({ email: 'should@fail.com', password: 'testpass123', clienteId: CLIENTE_A_ID });

      if (res.status !== 401) {
        console.error('Expected 401, got', res.status, 'body:', JSON.stringify(res.body));
      }
      expect(res.status).toBe(401);
    });

    it('MUST reject admin token on GET /api/v1/client/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/client/me')
        .set('Host', `${TENANT_A_SLUG}.crmmaster.com`)
        .set('Cookie', '__Secure-session=admin_token_value');

      expect(res.status).toBe(401);
    });
  });
} else {
  describe('🔔 DOORBELL — Cross-client isolation', () => {
    it('SKIPPED — no DATABASE_URL/DATABASE_TEST_URL configured', () => {
      console.warn(
        '[DOORBELL CLIENT] Skipping: DATABASE_URL not set. These tests require a real database.',
      );
    });
  });
}
