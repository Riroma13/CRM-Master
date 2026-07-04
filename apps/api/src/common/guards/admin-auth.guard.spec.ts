import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminAuthGuard } from './admin-auth.guard';
import { SessionService, SessionData } from '../../modules/auth/session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    mockSessionService = {
      createSession: jest.fn(),
      validateSession: jest.fn(),
      destroySession: jest.fn(),
    } as any;

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new AdminAuthGuard(mockReflector as any, mockSessionService as any);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createContext(overrides: {
    path?: string;
    headers?: Record<string, string>;
    isPublic?: boolean;
  }) {
    const path = overrides.path ?? '/api/v1/admin/users';
    const headers = overrides.headers ?? {};
    const isPublic = overrides.isPublic ?? false;

    mockReflector.getAllAndOverride.mockReturnValue(isPublic ? true : undefined);

    const request: Record<string, any> = {
      path,
      headers,
      originalUrl: path,
      route: { path },
    };

    return {
      getHandler: () => ({} as any),
      getClass: () => ({} as any),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  describe('@Public() bypass', () => {
    it('should bypass auth when @Public() is set, even on admin routes', () => {
      const context = createContext({
        path: '/api/v1/admin/health',
        isPublic: true,
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('non-admin routes', () => {
    it('should pass through for non-admin routes without a token', () => {
      const context = createContext({
        path: '/api/v1/auth/login',
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Authorization header', () => {
    it('should throw UnauthorizedException when no Authorization header is present on admin route', () => {
      const context = createContext({
        path: '/api/v1/admin/users',
        headers: {},
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Authorization header has no Bearer token', () => {
      const context = createContext({
        path: '/api/v1/admin/users',
        headers: { authorization: 'Basic abc123' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('session validation', () => {
    it('should throw UnauthorizedException for an invalid token', () => {
      mockSessionService.validateSession.mockReturnValue(null);

      const context = createContext({
        path: '/api/v1/admin/users',
        headers: { authorization: 'Bearer sess_invalid' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for an expired token', () => {
      const expiredSession: SessionData = {
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
        expiresAt: new Date(Date.now() - 1000), // already expired
      };
      mockSessionService.validateSession.mockReturnValue(expiredSession);

      const context = createContext({
        path: '/api/v1/admin/users',
        headers: { authorization: 'Bearer sess_expired' },
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('role validation', () => {
    it('should throw ForbiddenException when role is not superadmin', () => {
      const userSession: SessionData = {
        userId: 'user-1',
        email: 'user@test.com',
        name: 'Regular User',
        tenantId: 'tenant-1',
        role: 'user',
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockSessionService.validateSession.mockReturnValue(userSession);

      const context = createContext({
        path: '/api/v1/admin/users',
        headers: { authorization: 'Bearer sess_user' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when role is admin (not superadmin)', () => {
      const adminSession: SessionData = {
        userId: 'user-2',
        email: 'admin@test.com',
        name: 'Admin User',
        tenantId: 'tenant-1',
        role: 'admin',
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockSessionService.validateSession.mockReturnValue(adminSession);

      const context = createContext({
        path: '/api/v1/admin/users',
        headers: { authorization: 'Bearer sess_admin' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('successful auth', () => {
    it('should return true and populate request.user for superadmin', () => {
      const superadminSession: SessionData = {
        userId: 'user-1',
        email: 'super@admin.com',
        name: 'Super Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockSessionService.validateSession.mockReturnValue(superadminSession);

      const request: Record<string, any> = {
        path: '/api/v1/admin/users',
        headers: { authorization: 'Bearer sess_valid' },
        originalUrl: '/api/v1/admin/users',
        route: { path: '/api/v1/admin/users' },
      };
      const context = {
        getHandler: () => ({} as any),
        getClass: () => ({} as any),
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any;
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBeDefined();
      expect(request.user!.id).toBe('user-1');
      expect(request.user!.email).toBe('super@admin.com');
      expect(request.user!.name).toBe('Super Admin');
      expect(request.user!.role).toBe('superadmin');
      expect(request.user!.tenantId).toBe('tenant-1');
    });
  });
});
