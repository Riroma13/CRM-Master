import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthService tenant-admin foundation contract', () => {
  function service(passwordHash: string | null) {
    const prisma = {
      admin: {
        legacyUser: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'legacy-a', email: 'admin-a@example.test', name: 'Admin A', role: 'admin',
            passwordHash, isActive: true, betterAuthUserId: 'ba-user-a',
            tenantId: 'tenant-a', tenant: { id: 'tenant-a', slug: 'tenant-a', name: 'Tenant A', isActive: true },
          }),
        },
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
      },
    };
    return { service: new AuthService(prisma as any, { publish: jest.fn() } as any), prisma };
  }

  it('never accepts a predictable fallback password when the stored hash is absent', async () => {
    const { service: auth } = service(null);

    await expect(auth.login({ email: 'admin-a@example.test', password: 'password' } as any))
      .rejects.toThrow(UnauthorizedException);
  });

  it('returns safe display data without a reusable session token', async () => {
    const { service: auth } = service('$2b$04$y0mxroHWqDyOj7qht1vWheaPRH.iXPMWY67Ex4VMOWzMVwjNPAcJm');

    const result = await auth.login({ email: 'admin-a@example.test', password: 'correct-password' } as any, 'tenant-a');

    expect(result.session).toBeUndefined();
  });

  it('uses the same unauthorized response for an unknown identity and an inactive tenant', async () => {
    const unknownFixture = service(null);
    const unknown = unknownFixture.service;
    unknownFixture.prisma.admin.legacyUser.findUnique.mockResolvedValue(null);
    const inactivePrisma = service(null).prisma;
    inactivePrisma.admin.legacyUser.findUnique.mockResolvedValue({
      id: 'legacy-a', email: 'admin-a@example.test', isActive: true,
      tenantId: 'tenant-a', tenant: { id: 'tenant-a', isActive: false },
    });

    const unknownError = await unknown.login({ email: 'missing@example.test', password: 'wrong' } as any)
      .catch(error => error);
    const inactiveError = await new AuthService(inactivePrisma as any, { publish: jest.fn() } as any)
       .login({ email: 'admin-a@example.test', password: 'wrong' } as any, 'tenant-a')
      .catch(error => error);

    expect(unknownError.getStatus()).toBe(401);
    expect(inactiveError.getStatus()).toBe(401);
    expect(unknownError.message).toBe(inactiveError.message);
  });

  it('rejects an otherwise valid identity when trusted Host tenant context is absent', async () => {
    const { service: auth } = service('$2b$04$y0mxroHWqDyOj7qht1vWheaPRH.iXPMWY67Ex4VMOWzMVwjNPAcJm');

    await expect(auth.login({ email: 'admin-a@example.test', password: 'correct-password' } as any))
      .rejects.toThrow(UnauthorizedException);
  });

  it('sets an HttpOnly cookie on login and revokes the exact cookie on logout', async () => {
    const authService = { login: jest.fn().mockResolvedValue({ user: { id: 'u' }, tenant: { id: 't' } }), logout: jest.fn() };
    const controller = new AuthController(authService as any, {} as any);
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };

    await (controller.login as any)({}, response);
    await (controller.logout as any)({ headers: { cookie: '__Secure-better-auth.session_token=opaque' } }, response);

    expect(response.cookie).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(authService.logout).toHaveBeenCalledWith('opaque');
    expect(response.clearCookie).toHaveBeenCalled();
  });
});
