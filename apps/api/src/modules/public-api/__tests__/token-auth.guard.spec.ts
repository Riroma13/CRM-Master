import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../../../common/prisma.service';

describe('TokenAuthGuard', () => {
  let guard: TokenAuthGuard;
  let service: TokenService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-guard-0001';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TokenAuthGuard, TokenService, PrismaService, Reflector],
    }).compile();

    guard = moduleRef.get(TokenAuthGuard);
    service = moduleRef.get(TokenService);
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    service.clearCache();
  });

  function mockContext(authHeader?: string, overrides: Record<string, unknown> = {}): ExecutionContext {
    const request: any = { headers: {}, ...overrides };
    if (authHeader) {
      request.headers['authorization'] = authHeader;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  describe('valid token', () => {
    it('should allow access and attach tenantId + scopes', async () => {
      const created = await service.createToken(TENANT_ID, 'Guard Test', ['workflows:read']);
      const ctx = mockContext(`Bearer ${created.token}`);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);

      const req = ctx.switchToHttp().getRequest();
      expect(req.tenantId).toBe(TENANT_ID);
      expect(req.apiKeyScopes).toEqual(['workflows:read']);
    });
  });

  describe('missing or malformed header', () => {
    it('should throw 401 when no Authorization header', async () => {
      const ctx = mockContext();
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when token does not start with crm_live_', async () => {
      const ctx = mockContext('Bearer invalid_token');
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when Authorization is not Bearer', async () => {
      const ctx = mockContext('Basic xyz');
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('invalid token', () => {
    it('should throw 401 when token is not found', async () => {
      const ctx = mockContext('Bearer crm_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when token is revoked', async () => {
      const created = await service.createToken(TENANT_ID, 'Revocable Guard', ['workflows:read']);
      await service.revokeToken(created.id);

      const ctx = mockContext(`Bearer ${created.token}`);
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 when token is expired', async () => {
      const created = await service.createToken(TENANT_ID, 'Expiring Guard', ['workflows:read'], 0);
      const ctx = mockContext(`Bearer ${created.token}`);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('tenant binding', () => {
    it('rejects a conflicting tenant selector before the handler', async () => {
      const created = await service.createToken(TENANT_ID, 'Selector Guard', ['workflows:read']);
      const ctx = mockContext(`Bearer ${created.token}`, {
        query: { tenantId: 'different-tenant' },
        params: {},
        body: {},
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(ctx.switchToHttp().getRequest().tenantId).toBeUndefined();
    });

    it('rejects a conflicting Host tenant before the handler', async () => {
      const created = await service.createToken(TENANT_ID, 'Host Guard', ['workflows:read']);
      const ctx = mockContext(`Bearer ${created.token}`, { hostTenantId: 'different-tenant' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('does not allow an existing request tenant to overwrite token authority', async () => {
      const created = await service.createToken(TENANT_ID, 'Overwrite Guard', ['workflows:read']);
      const ctx = mockContext(`Bearer ${created.token}`, { tenantId: 'different-tenant' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('binds token provenance when Host agrees', async () => {
      const created = await service.createToken(TENANT_ID, 'Agreement Guard', ['workflows:read']);
      const ctx = mockContext(`Bearer ${created.token}`, { hostTenantId: TENANT_ID });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(ctx.switchToHttp().getRequest()).toMatchObject({
        tenantId: TENANT_ID,
        apiTokenTenantId: TENANT_ID,
      });
    });
  });
});
