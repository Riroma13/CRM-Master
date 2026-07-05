import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantScopeGuard } from './tenant-scope.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('TenantScopeGuard', () => {
  let guard: TenantScopeGuard;
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new TenantScopeGuard(mockReflector as any);
  });

  function createContext(overrides?: {
    isPublic?: boolean;
    isAdminRequest?: boolean;
    tenantId?: string;
    user?: { id?: string; email?: string; name?: string | null; role?: string; tenantId?: string };
  }) {
    const isPublic = overrides?.isPublic ?? false;
    const isAdminRequest = overrides?.isAdminRequest ?? false;
    const tenantId = overrides?.tenantId;
    const user = overrides?.user;

    mockReflector.getAllAndOverride.mockReturnValue(isPublic ? true : undefined);

    return {
      getHandler: () => ({} as any),
      getClass: () => ({} as any),
      switchToHttp: () => ({
        getRequest: () => ({
          isAdminRequest,
          tenantId,
          user,
        }),
      }),
    } as any;
  }

  describe('@Public() bypass', () => {
    it('should allow request when @Public() metadata is set', () => {
      const context = createContext({ isPublic: true });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should call getAllAndOverride with IS_PUBLIC_KEY', () => {
      const context = createContext({ isPublic: true });
      guard.canActivate(context);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
    });
  });

  describe('isAdminRequest with auth', () => {
    it('should throw UnauthorizedException when isAdminRequest is true but user not authenticated', () => {
      const context = createContext({ isAdminRequest: true, user: undefined });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when isAdminRequest is true but user role is not superadmin', () => {
      const context = createContext({
        isAdminRequest: true,
        user: { id: 'user-1', email: 'admin@test.com', name: 'Admin', role: 'admin', tenantId: 'tenant-1' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow request when isAdminRequest is true and user has superadmin role', () => {
      const context = createContext({
        isAdminRequest: true,
        user: { id: 'user-1', email: 'super@admin.com', name: 'Super', role: 'superadmin', tenantId: 'tenant-1' },
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('missing tenantId', () => {
    it('should throw ForbiddenException when tenantId is missing', () => {
      const context = createContext({});
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with message about tenant resolution', () => {
      const context = createContext({});
      try {
        guard.canActivate(context);
        fail('Expected ForbiddenException');
      } catch (e: any) {
        expect(e.message).toMatch(/tenant/i);
      }
    });
  });

  describe('user tenantId mismatch', () => {
    it('should throw ForbiddenException when user tenantId differs from request tenantId', () => {
      const context = createContext({
        tenantId: 'tenant-a',
        user: { tenantId: 'tenant-b' },
      });
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow when user tenantId matches request tenantId', () => {
      const context = createContext({
        tenantId: 'tenant-a',
        user: { tenantId: 'tenant-a' },
      });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow when user has no tenantId', () => {
      const context = createContext({
        tenantId: 'tenant-a',
        user: {},
      });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('guard ordering', () => {
    it('should check @Public() before isAdminRequest', () => {
      const context = createContext({ isPublic: true, isAdminRequest: true });
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
