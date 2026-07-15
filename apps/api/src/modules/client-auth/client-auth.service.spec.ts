import { Test, TestingModule } from '@nestjs/testing';
import { ClientAuthService } from './client-auth.service';
import { PrismaService } from '../../common/prisma.service';
import * as bcrypt from 'bcryptjs';

const TEST_IP = '127.0.0.1';

describe('ClientAuthService', () => {
  let service: ClientAuthService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-0000-0000-4000-000000000001';
  const TENANT_B_ID = 'cau-ten-0000-0000-4000-000000000002';
  const CLIENTE_ID = 'cau-cli-0000-0000-4000-000000000001';
  const CLIENTE_B_ID = 'cau-cli-0000-0000-4000-000000000002';
  const CLIENTUSER_ID = 'cau-cu-0000-0000-4000-000000000001';
  const CLIENTUSER_DEACTIVATED_ID = 'cau-cu-0000-0000-4000-000000000002';
  const PASSWORD_HASH = bcrypt.hashSync('testpass123', 12);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [ClientAuthService, PrismaService],
    }).compile();

    service = moduleRef.get(ClientAuthService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    await prisma.admin.cita.deleteMany({});
    await prisma.admin.documento.deleteMany({});
    await prisma.admin.clientUser.deleteMany({});
    await prisma.admin.cliente.deleteMany({});
    await prisma.admin.user.deleteMany({});
    await prisma.admin.tenant.deleteMany({});

    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_ID, slug: 'client-auth-tenant-a', name: 'Client Auth Tenant A', isActive: true },
        { id: TENANT_B_ID, slug: 'client-auth-tenant-b', name: 'Client Auth Tenant B', isActive: true },
      ],
    });

    await prisma.admin.cliente.createMany({
      data: [
        { id: CLIENTE_ID, tenantId: TENANT_ID, nombre: 'Cliente Test A' },
        { id: CLIENTE_B_ID, tenantId: TENANT_B_ID, nombre: 'Cliente Test B' },
      ],
    });

    await prisma.admin.clientUser.createMany({
      data: [
        {
          id: CLIENTUSER_ID, clienteId: CLIENTE_ID, tenantId: TENANT_ID,
          email: 'client@test.com', passwordHash: PASSWORD_HASH, isActive: true,
        },
        {
          id: CLIENTUSER_DEACTIVATED_ID, clienteId: CLIENTE_ID, tenantId: TENANT_ID,
          email: 'deactivated@test.com', passwordHash: bcrypt.hashSync('pass123', 12), isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.clientUser.deleteMany({});
      await prisma.admin.cliente.deleteMany({});
      await prisma.admin.tenant.deleteMany({});
      await moduleRef.close();
    }
  });

  describe('login', () => {
    it('should login with valid credentials and return token + user data', async () => {
      const result = await service.login(
        { email: 'client@test.com', password: 'testpass123' },
        TENANT_ID,
        TEST_IP,
      );

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.clientUser.id).toBe(CLIENTUSER_ID);
      expect(result.clientUser.email).toBe('client@test.com');
      expect(result.clientUser.isActive).toBe(true);
      expect(result.clientUser.passwordHash).toBeUndefined();
      expect(result.cliente.id).toBe(CLIENTE_ID);
      expect(result.cliente.nombre).toBe('Cliente Test A');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      await expect(
        service.login({ email: 'client@test.com', password: 'wrongpass' }, TENANT_ID, TEST_IP),
      ).rejects.toThrow(/Credenciales inválidas/);
    });

    it('should throw UnauthorizedException on unknown email (no existence leak)', async () => {
      await expect(
        service.login({ email: 'unknown@test.com', password: 'testpass123' }, TENANT_ID, TEST_IP),
      ).rejects.toThrow(/Credenciales inválidas/);
    });

    it('should throw UnauthorizedException for deactivated ClientUser', async () => {
      await expect(
        service.login({ email: 'deactivated@test.com', password: 'pass123' }, TENANT_ID, TEST_IP),
      ).rejects.toThrow(/Credenciales inválidas/);
    });

    it('should throw UnauthorizedException for email from different tenant (no leak)', async () => {
      await expect(
        service.login({ email: 'client@test.com', password: 'testpass123' }, TENANT_B_ID, TEST_IP),
      ).rejects.toThrow(/Credenciales inválidas/);
    });
  });

  describe('getMe', () => {
    it('should return clientUser without passwordHash field', async () => {
      const result = await service.getMe(CLIENTUSER_ID);

      expect(result).not.toBeNull();
      expect(result!.clientUser.id).toBe(CLIENTUSER_ID);
      expect(result!.clientUser.email).toBe('client@test.com');
      expect((result!.clientUser as any).passwordHash).toBeUndefined();
      expect(result!.cliente).toBeDefined();
      expect(result!.cliente.id).toBe(CLIENTE_ID);
    });

    it('should return null for unknown userId', async () => {
      const result = await service.getMe('00000000-0000-0000-0000-000000000099');
      expect(result).toBeNull();
    });
  });
});
