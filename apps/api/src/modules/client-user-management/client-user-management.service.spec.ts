import { Test, TestingModule } from '@nestjs/testing';
import {
  ClientUserManagementService,
} from './client-user-management.service';
import { PrismaService } from '../../common/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

describe('ClientUserManagementService', () => {
  let service: ClientUserManagementService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cum-ten-0000-0000-4000-000000000001';
  const TENANT_B_ID = 'cum-ten-0000-0000-4000-000000000002';
  const CLIENTE_A_ID = 'cum-cli-0000-0000-4000-000000000001';
  const CLIENTE_B_ID = 'cum-cli-0000-0000-4000-000000000002';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [ClientUserManagementService, PrismaService],
    }).compile();

    service = moduleRef.get(ClientUserManagementService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    await prisma.admin.cita.deleteMany({});
    await prisma.admin.documento.deleteMany({});
    await prisma.admin.clientUser.deleteMany({});
    await prisma.admin.cliente.deleteMany({});
    await prisma.admin.tenant.deleteMany({});

    await prisma.admin.tenant.createMany({
      data: [
        { id: TENANT_ID, slug: 'cum-tenant-a', name: 'CUM Tenant A', isActive: true },
        { id: TENANT_B_ID, slug: 'cum-tenant-b', name: 'CUM Tenant B', isActive: true },
      ],
    });

    await prisma.admin.cliente.createMany({
      data: [
        { id: CLIENTE_A_ID, tenantId: TENANT_ID, nombre: 'CUM Cliente A' },
        { id: CLIENTE_B_ID, tenantId: TENANT_B_ID, nombre: 'CUM Cliente B' },
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

  afterEach(async () => {
    await prisma.admin.clientUser.deleteMany({});
  });

  describe('create', () => {
    it('should create a ClientUser with bcrypt hash and isActive=true', async () => {
      const result = await service.create(
        { email: 'newuser@test.com', password: 'mypassword123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      expect(result.id).toBeDefined();
      expect(result.email).toBe('newuser@test.com');
      expect(result.isActive).toBe(true);
      expect(result.clienteId).toBe(CLIENTE_A_ID);
      expect((result as any).passwordHash).toBeUndefined();

      const raw = await prisma.admin.clientUser.findUnique({
        where: { id: result.id },
      });
      expect(raw).toBeDefined();
      expect(bcrypt.compareSync('mypassword123', raw!.passwordHash)).toBe(true);
    });

    it('should throw ForbiddenException when cliente from another tenant', async () => {
      await expect(
        service.create(
          { email: 'cross@test.com', password: 'mypassword123', clienteId: CLIENTE_B_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(/no pertenece/);
    });

    it('should throw ConflictException on duplicate email within same tenant', async () => {
      await service.create(
        { email: 'dupe@test.com', password: 'mypassword123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      await expect(
        service.create(
          { email: 'dupe@test.com', password: 'anotherpass123', clienteId: CLIENTE_A_ID },
          TENANT_ID,
        ),
      ).rejects.toThrow(/Ya existe/);
    });

    it('should throw ConflictException for same email even in different tenant (globally unique)', async () => {
      await service.create(
        { email: 'globally@unique.com', password: 'mypassword123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      await expect(
        service.create(
          { email: 'globally@unique.com', password: 'anotherpass123', clienteId: CLIENTE_B_ID },
          TENANT_B_ID,
        ),
      ).rejects.toThrow();
    });
  });

  describe('disable', () => {
    it('should set isActive=false on a ClientUser', async () => {
      const created = await service.create(
        { email: 'toban@test.com', password: 'mypassword123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      const disabled = await service.disable(created.id, TENANT_ID);

      expect(disabled.isActive).toBe(false);

      const raw = await prisma.admin.clientUser.findUnique({
        where: { id: created.id },
      });
      expect(raw!.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      await expect(
        service.disable('00000000-0000-0000-0000-000000000099', TENANT_ID),
      ).rejects.toThrow(/no encontrado/);
    });

    it('should not allow disabling user from another tenant', async () => {
      const created = await service.create(
        { email: 'cross2@test.com', password: 'mypassword123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      await expect(
        service.disable(created.id, TENANT_B_ID),
      ).rejects.toThrow(/no encontrado/);
    });
  });

  describe('resetPassword', () => {
    it('should change passwordHash and allow login with new password', async () => {
      const created = await service.create(
        { email: 'resetme@test.com', password: 'oldpass123', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      const updated = await service.resetPassword(
        created.id,
        { password: 'newpass456' },
        TENANT_ID,
      );

      expect(updated.id).toBe(created.id);
      expect((updated as any).passwordHash).toBeUndefined();

      const raw = await prisma.admin.clientUser.findUnique({
        where: { id: created.id },
      });
      expect(bcrypt.compareSync('newpass456', raw!.passwordHash)).toBe(true);
      expect(bcrypt.compareSync('oldpass123', raw!.passwordHash)).toBe(false);
    });

    it('should throw NotFoundException for cross-tenant reset', async () => {
      const created = await service.create(
        { email: 'cross3@test.com', password: 'pass12345', clienteId: CLIENTE_A_ID },
        TENANT_ID,
      );

      await expect(
        service.resetPassword(created.id, { password: 'newpass456' }, TENANT_B_ID),
      ).rejects.toThrow(/no encontrado/);
    });
  });
});
