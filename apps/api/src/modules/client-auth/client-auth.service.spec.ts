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

  describe('register', () => {
    const TEST_EMAIL = 'new.register@test.com';

    it('should create Cliente + ClientUser and return id/nombre/email', async () => {
      const result = await service.register(
        { nombre: 'New Client', email: TEST_EMAIL, password: 'securePass1' },
        TENANT_ID,
        TEST_IP,
      );

      expect(result.id).toBeDefined();
      expect(result.nombre).toBe('New Client');
      expect(result.email).toBe(TEST_EMAIL);

      const saved = await prisma.admin.clientUser.findUnique({
        where: { email: TEST_EMAIL },
        include: { cliente: true },
      });
      expect(saved).not.toBeNull();
      expect(saved!.cliente.nombre).toBe('New Client');
      expect(saved!.tenantId).toBe(TENANT_ID);
      expect(saved!.isActive).toBe(true);
      expect(saved!.passwordHash).not.toBe(TEST_EMAIL);
      expect(saved!.passwordHash).toMatch(/^\$2b\$12\$/);
    });

    it('should map businessName to Cliente.nombre when provided', async () => {
      const email = 'business.register@test.com';
      const result = await service.register(
        { nombre: 'John Doe', email, password: 'securePass1', businessName: 'Mi Empresa SL' },
        TENANT_ID,
        TEST_IP,
      );

      const saved = await prisma.admin.clientUser.findUnique({
        where: { email },
        include: { cliente: true },
      });
      expect(saved).not.toBeNull();
      expect(saved!.cliente.nombre).toBe('Mi Empresa SL');
    });

    it('should throw 409 on duplicate email (same tenant)', async () => {
      await expect(
        service.register(
          { nombre: 'Dup', email: 'client@test.com', password: 'securePass1' },
          TENANT_ID,
          TEST_IP,
        ),
      ).rejects.toThrow(/registrado|already exists/i);
    });

    it('should throw 409 on duplicate email (cross-tenant, per ADR-003)', async () => {
      await expect(
        service.register(
          { nombre: 'Dup Cross', email: 'client@test.com', password: 'securePass1' },
          TENANT_B_ID,
          TEST_IP,
        ),
      ).rejects.toThrow(/registrado|already exists/i);
    });

    it('should throw BadRequestException on weak password (< 8 chars)', async () => {
      await expect(
        service.register(
          { nombre: 'Weak', email: 'weak@test.com', password: '1234567' },
          TENANT_ID,
          TEST_IP,
        ),
      ).rejects.toThrow(/contraseña|password/i);
    });

    it('should throw 429 on rate limit', async () => {
      // Exhaust rate limit for this ip:email pair
      for (let i = 0; i < 6; i++) {
        try {
          await service.register(
            { nombre: 'Rate', email: `rate${i}@test.com`, password: 'securePass1' },
            TENANT_ID,
            'rate-limit-ip',
          );
        } catch {
          // expected after limit exceeded
        }
      }

      await expect(
        service.register(
          { nombre: 'Rate Final', email: 'rate-final@test.com', password: 'securePass1' },
          TENANT_ID,
          'rate-limit-ip',
        ),
      ).rejects.toThrow(/intentos/i);
    });
  });

  describe('getMe', () => {
    it('should return clientUser without passwordHash field', async () => {
      const result = await service.getMe(CLIENTUSER_ID, TENANT_ID);

      expect(result).not.toBeNull();
      expect(result!.clientUser.id).toBe(CLIENTUSER_ID);
      expect(result!.clientUser.email).toBe('client@test.com');
      expect((result!.clientUser as any).passwordHash).toBeUndefined();
      expect(result!.cliente).toBeDefined();
      expect(result!.cliente.id).toBe(CLIENTE_ID);
    });

    it('should return null for unknown userId', async () => {
      const result = await service.getMe('00000000-0000-0000-0000-000000000099', TENANT_ID);
      expect(result).toBeNull();
    });

    it('should return null for deactivated user', async () => {
      const result = await service.getMe(CLIENTUSER_DEACTIVATED_ID, TENANT_ID);
      expect(result).toBeNull();
    });

    it('should return null when tenantId does not match (cross-tenant isolation)', async () => {
      const result = await service.getMe(CLIENTUSER_ID, TENANT_B_ID);
      expect(result).toBeNull();
    });
  });
});
