import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientAuthGuard } from './client-auth.guard';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'client-jwt-dev-secret-change-in-prod';

function makeToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function mockContext(cookieHeader: string): ExecutionContext {
  const request = {
    headers: { cookie: cookieHeader },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('ClientAuthGuard', () => {
  let guard: ClientAuthGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ClientAuthGuard, Reflector],
    }).compile();

    guard = moduleRef.get(ClientAuthGuard);
    reflector = moduleRef.get(Reflector);
  });

  describe('valid client cookie', () => {
    it('should allow access with valid __Secure-client-session and role client', () => {
      const token = makeToken({ sub: 'user1', clienteId: 'cliente1', tenantId: 'tenant1', role: 'client' });
      const context = mockContext(`__Secure-client-session=${token}`);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).not.toThrow();
      const req = (context.switchToHttp().getRequest() as any);
      expect(req.clientUserId).toBe('user1');
      expect(req.tenantId).toBe('tenant1');
      expect(req.clienteId).toBe('cliente1');
    });
  });

  describe('admin session cookie', () => {
    it('should reject __Secure-session cookie with UnauthorizedException', () => {
      const context = mockContext('__Secure-session=admin_token_value');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(/administrador/);
    });
  });

  describe('missing or invalid cookie', () => {
    it('should reject missing cookie with 401', () => {
      const context = mockContext('');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(/cookie de sesión/);
    });

    it('should reject expired token with 401', () => {
      const expiredToken = jwt.sign(
        { sub: 'user1', role: 'client' },
        JWT_SECRET,
        { expiresIn: '0s' },
      );

      const context = mockContext(`__Secure-client-session=${expiredToken}`);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should reject tampered token with 401', () => {
      const context = mockContext('__Secure-client-session=tampered.token.value');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('wrong role', () => {
    it('should reject token without client role with 403', () => {
      const token = makeToken({ sub: 'user1', role: 'admin', tenantId: 't1' });

      const context = mockContext(`__Secure-client-session=${token}`);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/Rol inválido/);
    });
  });

  describe('@Public() decorator', () => {
    it('should bypass guard when @Public() is set', () => {
      const context = mockContext('');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });
});
