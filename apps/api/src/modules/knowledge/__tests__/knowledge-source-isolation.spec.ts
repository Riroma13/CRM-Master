import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGuard } from '../guards/knowledge.guard';

describe('Knowledge Source Isolation (Doorbell)', () => {
  let guard: KnowledgeGuard;

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

  it('Tenant A can delete their own source', async () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      body: { tenantId: 'tenant-a' },
      query: {},
      params: { sourceType: 'document', sourceId: 'doc-a' },
      headers: {},
      tenantId: undefined,
    };
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('Tenant A can reindex their own source', async () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      body: { tenantId: 'tenant-a' },
      query: {},
      params: { sourceType: 'document', sourceId: 'doc-a' },
      headers: {},
      tenantId: undefined,
    };
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('Tenant B cannot delete Tenant As source via body tenantId', async () => {
    const req = {
      user: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-a' },
      query: {},
      params: { sourceType: 'document', sourceId: 'doc-a' },
      headers: {},
      tenantId: undefined,
    };
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant B cannot reindex Tenant As source via body tenantId', async () => {
    const req = {
      user: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-a', content: 'new content' },
      query: {},
      params: { sourceType: 'document', sourceId: 'doc-a' },
      headers: {},
      tenantId: undefined,
    };
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant B cannot delete Tenant As source via query tenantId', async () => {
    const req = {
      user: { tenantId: 'tenant-b' },
      body: {},
      query: { tenantId: 'tenant-a' },
      params: { sourceType: 'document', sourceId: 'doc-a' },
      headers: {},
      tenantId: undefined,
    };
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });

  it('Tenant A list sources only sees their own', async () => {
    const req = {
      user: { tenantId: 'tenant-a' },
      body: {},
      query: { tenantId: 'tenant-a' },
      params: {},
      headers: {},
      tenantId: undefined,
    };
    const result = guard.canActivate(mockContext(req) as any);
    expect(result).toBe(true);
  });

  it('Tenant B cannot list sources of Tenant A', async () => {
    const req = {
      user: { tenantId: 'tenant-b' },
      body: {},
      query: { tenantId: 'tenant-a' },
      params: {},
      headers: {},
      tenantId: undefined,
    };
    expect(() => guard.canActivate(mockContext(req) as any)).toThrow(
      'Cross-tenant access denied',
    );
  });
});
