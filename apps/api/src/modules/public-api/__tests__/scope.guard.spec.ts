import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from '../guards/scope.guard';
import { REQUIRED_SCOPE_KEY } from '../guards/scope.guard';

function mockContext(handlerScope?: string): ExecutionContext {
  const request = {
    apiKeyScopes: ['workflows:read', 'documents:write'],
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: Reflector;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [ScopeGuard, Reflector],
    }).compile();

    guard = moduleRef.get(ScopeGuard);
    reflector = moduleRef.get(Reflector);
  });

  describe('exact scope match', () => {
    it('should allow access when scopes include the required scope', () => {
      const context = mockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:read');

      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny access when required scope is not in key scopes', () => {
      const context = mockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:write');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(/Insufficient scope/);
    });
  });

  describe('wildcard scope match', () => {
    it('should allow *:read scope to access any resource:read', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ apiKeyScopes: ['*:read'] }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:read');

      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny *:read scope for write actions', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ apiKeyScopes: ['*:read'] }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:write');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow *:admin scope for any action', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ apiKeyScopes: ['*:admin'] }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:write');

      expect(() => guard.canActivate(context)).not.toThrow();
    });

    it('should deny *:admin scope when check is more specific and mismatched', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ apiKeyScopes: ['*:admin'] }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:read');

      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });

  describe('no scope required', () => {
    it('should allow access when no @RequireScope decorator is set', () => {
      const context = mockContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      expect(() => guard.canActivate(context)).not.toThrow();
    });
  });

  describe('missing apiKeyScopes on request', () => {
    it('should deny with 403 when no scopes are attached', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('workflows:read');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
