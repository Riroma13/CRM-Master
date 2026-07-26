import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import { RBACEngine } from '../rbac-engine';
import { IDENTITY_PERMISSIONS_KEY } from '../permission.decorator';
import { PrismaService } from '../../../../common/prisma.service';

function createMockContext(metadata: string | undefined, user?: any, tenantId?: string) {
  const handler = () => {};
  const request: any = { user, tenantId };

  if (metadata !== undefined) {
    Reflect.defineMetadata(IDENTITY_PERMISSIONS_KEY, metadata, handler);
  }

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => handler,
    getClass: () => class MockClass {},
  } as any;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let rbacEngine: RBACEngine;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        RBACEngine,
        PrismaService,
        Reflector,
      ],
    }).compile();

    guard = moduleRef.get(PermissionGuard);
    rbacEngine = moduleRef.get(RBACEngine);
    await moduleRef.init();
  });

  afterAll(async () => {
    const prisma = moduleRef.get(PrismaService);
    await prisma.admin.membership.deleteMany({});
    await prisma.admin.role.deleteMany({});
    await prisma.admin.team.deleteMany({});
    await prisma.admin.user.deleteMany({});
    await prisma.admin.tenant.deleteMany({});
    await moduleRef.close();
  });

  describe('canActivate', () => {
    it('should return true when no permission required', async () => {
      const context = createMockContext(undefined, { id: 'user-1' }, 'tenant-1');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is missing', async () => {
      const context = createMockContext('documents:read', undefined, 'tenant-1');
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should throw ForbiddenException when tenantId is missing', async () => {
      const context = createMockContext('documents:read', { id: 'user-1' }, undefined);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should throw ForbiddenException when permission is denied', async () => {
      jest.spyOn(rbacEngine, 'checkPermission').mockResolvedValue({ allowed: false });

      const context = createMockContext('workflows:delete', { id: 'user-1' }, 'tenant-1');
      await expect(guard.canActivate(context)).rejects.toThrow('Access denied');
    });

    it('should return true when permission is allowed', async () => {
      jest.spyOn(rbacEngine, 'checkPermission').mockResolvedValue({
        allowed: true,
        role: 'admin',
        grantedBy: '*:admin',
      });

      const context = createMockContext('workflows:admin', { id: 'user-1' }, 'tenant-1');
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
