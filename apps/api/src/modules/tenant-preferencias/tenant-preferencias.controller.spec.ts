import { NotFoundException } from '@nestjs/common';
import { TenantPreferenciasController } from './tenant-preferencias.controller';

describe('TenantPreferenciasController self-only identity contract', () => {
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const prisma = { admin: { legacyUser: { findFirst, findUnique, update } } };
  let controller: TenantPreferenciasController;
  let subject: {
    get(request: { user: { id: string }; body?: unknown }, tenantId: string): Promise<unknown>;
    update(request: { user: { id: string }; body: Record<string, unknown> }, tenantId: string): Promise<unknown>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({ id: 'legacy-a', notifEmail: true, notifWhatsApp: false });
    controller = new TenantPreferenciasController(prisma as never);
    subject = controller as unknown as typeof subject;
  });

  it('gets preferences using the authenticated Better Auth ID and Host tenant', async () => {
    findFirst.mockResolvedValue({ id: 'legacy-a', notifEmail: true, notifWhatsApp: false });

    await expect(subject.get({ user: { id: 'ba-a' }, body: { email: 'forged@example.test' } }, 'tenant-a'))
      .resolves.toEqual({ notifEmail: true, notifWhatsApp: false });

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { betterAuthUserId: 'ba-a', tenantId: 'tenant-a' },
    }));
  });

  it('updates only notification flags on the resolved self row', async () => {
    findFirst.mockResolvedValue({ id: 'legacy-a', notifEmail: true, notifWhatsApp: false });
    update.mockResolvedValue({ id: 'legacy-a' });

    await subject.update(
      { user: { id: 'ba-a' }, body: { email: 'tenant-b@example.test', tenantId: 'tenant-b', password: 'forged', notifEmail: false, notifWhatsApp: true } } as never,
      'tenant-a',
    );

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { betterAuthUserId: 'ba-a', tenantId: 'tenant-a' },
    }));
    expect(update).toHaveBeenCalledWith({
      where: { id: 'legacy-a' },
      data: { notifEmail: false, notifWhatsApp: true },
    });
  });

  it.each([
    ['same-tenant forged email', 'tenant-a@example.test'],
    ['cross-tenant forged email', 'tenant-b@example.test'],
  ])('does not let %s retarget the update', async (_case, email) => {
    findFirst.mockResolvedValue({ id: 'legacy-a', notifEmail: true, notifWhatsApp: false });

    await subject.update({ user: { id: 'ba-a' }, body: { email, notifEmail: false, notifWhatsApp: true } }, 'tenant-a');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'legacy-a' } }));
    expect(update.mock.calls[0][0].where).not.toHaveProperty('email');
  });

  it('fails before mutation when the authenticated user is absent from the Host tenant', async () => {
    findFirst.mockResolvedValue(null);

    await expect(subject.update({ user: { id: 'ba-a' }, body: { notifEmail: false } }, 'tenant-b'))
      .rejects.toBeInstanceOf(NotFoundException);

    expect(update).not.toHaveBeenCalled();
  });
});
