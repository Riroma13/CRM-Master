import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../../../common/prisma.service';
import type { ApiKeyScope } from '@shared/public-api';

describe('TokenService', () => {
  let service: TokenService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-auth-0001';
  const TENANT_B_ID = 'cau-ten-auth-0002';

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TokenService, PrismaService],
    }).compile();

    service = moduleRef.get(TokenService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();
  });

  afterAll(async () => {
    if (moduleRef) {
      await prisma.admin.apiKey.deleteMany({});
      await moduleRef.close();
    }
  });

  afterEach(async () => {
    await prisma.admin.apiKey.deleteMany({});
    service.clearCache();
  });

  describe('createToken', () => {
    it('should create a token and return plaintext + metadata', async () => {
      const result = await service.createToken(TENANT_ID, 'Test Key', ['workflows:read']);

      expect(result.id).toBeDefined();
      expect(result.token).toMatch(/^crm_live_[a-f0-9]{64}$/);
      expect(result.scopes).toEqual(['workflows:read']);
      expect(result.expiresAt).toBeDefined();
    });

    it('should store hashed token in DB (cannot be recovered)', async () => {
      const result = await service.createToken(TENANT_ID, 'Secret Key', ['documents:write']);

      const stored = await prisma.admin.apiKey.findUnique({ where: { id: result.id } });
      expect(stored).not.toBeNull();
      expect(stored!.tokenHash).not.toBe(result.token);
      expect(stored!.tokenPrefix).toBe(result.token.substring(0, 12));
      expect(stored!.active).toBe(true);
    });

    it('should apply custom expiresInDays', async () => {
      const result = await service.createToken(TENANT_ID, 'Short-lived', ['*:admin'], 7);
      const stored = await prisma.admin.apiKey.findUnique({ where: { id: result.id } });

      const diffMs = stored!.expiresAt.getTime() - Date.now();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    it('should default to 90 days expiry', async () => {
      const result = await service.createToken(TENANT_ID, 'Default expiry', ['workflows:read']);
      const stored = await prisma.admin.apiKey.findUnique({ where: { id: result.id } });

      const diffMs = stored!.expiresAt.getTime() - Date.now();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(85);
      expect(diffDays).toBeLessThanOrEqual(90);
    });

    it('should accept multiple scopes', async () => {
      const scopes: ApiKeyScope[] = ['workflows:read', 'documents:write', 'webhooks:admin'];
      const result = await service.createToken(TENANT_ID, 'Multi-scope', scopes);

      expect(result.scopes).toHaveLength(3);
      expect(result.scopes).toEqual(expect.arrayContaining(scopes));
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid token', async () => {
      const created = await service.createToken(TENANT_ID, 'Valid Key', ['workflows:read']);
      const payload = await service.validateToken(created.token);

      expect(payload).not.toBeNull();
      expect(payload!.id).toBe(created.id);
      expect(payload!.tenantId).toBe(TENANT_ID);
      expect(payload!.scopes).toEqual(['workflows:read']);
      expect(payload!.active).toBe(true);
    });

    it('should return null for unknown token', async () => {
      const payload = await service.validateToken('crm_live_0000000000000000000000000000000000000000000000000000000000000000');
      expect(payload).toBeNull();
    });

    it('should return null for revoked (inactive) token', async () => {
      const created = await service.createToken(TENANT_ID, 'To revoke', ['workflows:read']);
      await service.revokeToken(created.id);

      const payload = await service.validateToken(created.token);
      expect(payload).toBeNull();
    });

    it('should return null for expired token', async () => {
      const created = await service.createToken(TENANT_ID, 'Expired Key', ['workflows:read'], 0);
      // Wait briefly to ensure expiry
      await new Promise(r => setTimeout(r, 10));

      // Force the expiresAt to be in the past
      await prisma.admin.apiKey.update({
        where: { id: created.id },
        data: { expiresAt: new Date(Date.now() - 86400000) },
      });

      const payload = await service.validateToken(created.token);
      expect(payload).toBeNull();
    });

    it('should update lastUsedAt on successful validation', async () => {
      const created = await service.createToken(TENANT_ID, 'Used Key', ['workflows:read']);

      const before = await prisma.admin.apiKey.findUnique({ where: { id: created.id } });
      expect(before!.lastUsedAt).toBeNull();

      await service.validateToken(created.token);

      const after = await prisma.admin.apiKey.findUnique({ where: { id: created.id } });
      expect(after!.lastUsedAt).not.toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('should set active = false', async () => {
      const created = await service.createToken(TENANT_ID, 'Revocable', ['workflows:read']);
      await service.revokeToken(created.id);

      const stored = await prisma.admin.apiKey.findUnique({ where: { id: created.id } });
      expect(stored!.active).toBe(false);
    });

    it('should cause subsequent validateToken to return null', async () => {
      const created = await service.createToken(TENANT_ID, 'Revocable2', ['workflows:read']);

      await service.revokeToken(created.id);
      const payload = await service.validateToken(created.token);
      expect(payload).toBeNull();
    });
  });

  describe('getTokens', () => {
    it('should return all tokens for a tenant', async () => {
      await service.createToken(TENANT_ID, 'Key A', ['workflows:read']);
      await service.createToken(TENANT_ID, 'Key B', ['documents:write']);

      const tokens = await service.getTokens(TENANT_ID);
      expect(tokens).toHaveLength(2);
    });

    it('should not return tokens from other tenants', async () => {
      await service.createToken(TENANT_ID, 'Tenant A Key', ['workflows:read']);
      await service.createToken(TENANT_B_ID, 'Tenant B Key', ['documents:write']);

      const tokens = await service.getTokens(TENANT_ID);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('Tenant A Key');
    });
  });
});
