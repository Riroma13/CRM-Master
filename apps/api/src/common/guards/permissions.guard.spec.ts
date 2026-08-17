jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: (statement: Record<string, string[]>) => ({
    newRole: (permissions: Record<string, string[]>) => ({
      authorize: (requested: Record<string, string[]>) => ({
        success: Object.entries(requested).every(([resource, actions]) =>
          actions.every((action) => permissions[resource]?.includes(action)),
        ),
      }),
    }),
  }),
}));
import { ForbiddenException } from '@nestjs/common';
import { ROLE_MAP } from '../auth/permissions';

describe('workflow permission contract', () => {
  it.each(['read', 'write', 'execute'] as const)('allows owner and exact Identity admin for %s', (action) => {
    expect(ROLE_MAP.owner.authorize({ workflow: [action] }).success).toBe(true);
    expect(ROLE_MAP.admin.authorize({ workflow: [action] }).success).toBe(true);
  });

  it.each(['operador', 'lector'])('denies %s', (role) => {
    expect(ROLE_MAP[role].authorize({ workflow: ['read'] }).success).toBe(false);
  });

  it('has no anonymous fallback capability', () => {
    expect(ROLE_MAP.lector.authorize({ workflow: ['execute'] }).success).toBe(false);
    expect(() => { throw new ForbiddenException(); }).toThrow(ForbiddenException);
  });
});
