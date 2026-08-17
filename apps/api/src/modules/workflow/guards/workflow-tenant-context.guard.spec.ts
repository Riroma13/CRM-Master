import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { WorkflowTenantContextGuard } from './workflow-tenant-context.guard';

const execution = (request: any) => ({
  switchToHttp: () => ({ getRequest: () => request }),
} as unknown as ExecutionContext);

describe('WorkflowTenantContextGuard', () => {
  const guard = new WorkflowTenantContextGuard();

  it('returns 401 for a missing direct provider session', () => {
    expect(() => guard.canActivate(execution({}))).toThrow(UnauthorizedException);
  });

  it.each([
    {},
    { hostTenantId: 'tenant-a', identitySession: { userId: 'user-a' } },
    { hostTenantId: 'tenant-a', identitySession: { userId: 'user-a' }, identityMembership: { role: 'operador' } },
  ])('denies incomplete or unauthorized context', (request) => {
    expect(() => guard.canActivate(execution({ identitySession: { userId: 'user-a' }, ...request }))).toThrow(ForbiddenException);
  });

  it('builds trusted context only from Host and verified Identity fields', () => {
    const request: any = {
      hostTenantId: 'tenant-a',
      query: { tenantId: 'tenant-b' },
      body: { tenantId: 'tenant-b' },
      identitySession: { userId: 'user-a' },
      identityMembership: { role: 'admin', organizationId: 'org-a' },
    };
    expect(guard.canActivate(execution(request))).toBe(true);
    expect(request.workflowContext).toEqual({ tenantId: 'tenant-a', actorId: 'user-a', role: 'admin' });
  });
});
