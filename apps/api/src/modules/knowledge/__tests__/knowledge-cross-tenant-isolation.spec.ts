import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGuard } from '../guards/knowledge.guard';

describe('Knowledge Cross-Tenant Isolation (Doorbell)', () => {
  let guard: KnowledgeGuard;

  const mockRequest = (overrides: Record<string, any> = {}) => {
    const defaults = {
      user: { tenantId: 'tenant-a' },
      body: {},
      query: {},
      params: {},
      headers: {},
    };
    return { ...defaults, ...overrides };
  };

  const mockContext = (req: any) => ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeGuard],
    }).compile();

    guard = module.get<KnowledgeGuard>(KnowledgeGuard);
  });

  it('Tenant A can access with their own tenantId in body', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-a' },
      body: { tenantId: 'tenant-a' },
    });
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('Tenant A can access with their own tenantId in query', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-a' },
      query: { tenantId: 'tenant-a' },
    });
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('Tenant B cannot access with Tenant As tenantId in body', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-a' },
    });
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant B cannot access with Tenant As tenantId in query', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-b' },
      query: { tenantId: 'tenant-a' },
    });
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant B cannot access when route tenantId matches Tenant A', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-b' },
      tenantId: 'tenant-a',
    });
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant A can access when no tenantId is present in request', async () => {
    const req = mockRequest({
      user: { tenantId: 'tenant-a' },
      body: {},
      query: {},
    });
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('should reject unauthenticated requests', async () => {
    const req = mockRequest({ user: null });
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Authentication required',
    );
  });
});
