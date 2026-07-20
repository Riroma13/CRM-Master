import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../../../common/prisma.service';

describe('Revocation (integration)', () => {
  let service: TokenService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_ID = 'cau-ten-revoke-0001';

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

  it('should revoke a token and subsequent validateToken returns null', async () => {
    const created = await service.createToken(TENANT_ID, 'Revoke Test', ['workflows:read']);

    // Verify token was created in DB
    const dbRecord = await prisma.admin.apiKey.findUnique({ where: { id: created.id } });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.active).toBe(true);

    // Token works before revoke
    const before = await service.validateToken(created.token);
    expect(before).not.toBeNull();

    // Revoke
    await service.revokeToken(created.id);

    // Verify DB state
    const stored = await prisma.admin.apiKey.findUnique({ where: { id: created.id } });
    expect(stored!.active).toBe(false);

    // Subsequent call fails
    const after = await service.validateToken(created.token);
    expect(after).toBeNull();
  });

  it('should not affect other tokens when one is revoked', async () => {
    const keyA = await service.createToken(TENANT_ID, 'Key A', ['workflows:read']);
    const keyB = await service.createToken(TENANT_ID, 'Key B', ['documents:write']);

    await service.revokeToken(keyA.id);

    const resultA = await service.validateToken(keyA.token);
    expect(resultA).toBeNull();

    const resultB = await service.validateToken(keyB.token);
    expect(resultB).not.toBeNull();
    expect(resultB!.name).toBe('Key B');
  });

  it('should handle revoke on non-existent token without error', async () => {
    await expect(service.revokeToken('00000000-0000-0000-0000-000000000000')).resolves.not.toThrow();
  });

  it('should clear cache entry on revoke', async () => {
    const created = await service.createToken(TENANT_ID, 'Cached Key', ['workflows:read']);

    // First call populates cache
    await service.validateToken(created.token);

    // Revoke clears cache
    await service.revokeToken(created.id);

    // Should still return null (cache miss + DB check)
    const result = await service.validateToken(created.token);
    expect(result).toBeNull();
  });
});
