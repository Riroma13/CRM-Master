import { NotFoundException } from '@nestjs/common';
import { TenantClientesService } from './tenant-clientes.service';

describe('TenantClientesService update ownership contract', () => {
  it('updates an owned Client and persists explicit contact clearing without tenant reassignment', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'client-a',
      tenantId: 'tenant-a',
      nombre: 'Updated client',
      email: null,
      telefono: null,
    });
    const prisma = { admin: {
      cliente: {
        findFirst: jest.fn().mockResolvedValue({ id: 'client-a', tenantId: 'tenant-a' }),
        update,
      },
    } };
    const service = new TenantClientesService(
      prisma as any,
      { log: jest.fn() } as any,
      { emit: jest.fn() } as any,
    );

    await expect(service.update('tenant-a', 'client-a', {
      nombre: 'Updated client', email: null, telefono: null, tenantId: 'tenant-b',
    })).resolves.toEqual(expect.objectContaining({ email: null, telefono: null }));
    expect(update).toHaveBeenCalledWith({
      where: { id: 'client-a' },
      data: { nombre: 'Updated client', email: null, telefono: null },
    });
  });

  it('rejects a foreign Client PATCH before mutation', async () => {
    const update = jest.fn();
    const prisma = { admin: {
      cliente: { findFirst: jest.fn().mockResolvedValue(null), update },
    } };
    const service = new TenantClientesService(
      prisma as any,
      { log: jest.fn() } as any,
      { emit: jest.fn() } as any,
    );

    await expect(service.update('tenant-a', 'client-b', { nombre: 'Must not change' }))
      .rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
