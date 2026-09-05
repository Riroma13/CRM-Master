import { BadRequestException, NotFoundException } from '@nestjs/common';
import { normalizeInventoryDateForStorage, TenantSistemasService } from './tenant-sistemas.service';

describe('TenantSistemasService ownership foundation contract', () => {
  it('updates a System when the System and replacement Client belong to the tenant', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'system-a',
      tenantId: 'tenant-a',
      clienteId: 'client-a',
      nombreSistema: 'Updated system',
    });
    const prisma = { admin: {
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'client-a', tenantId: 'tenant-a' }) },
      sistema: {
        findFirst: jest.fn().mockResolvedValue({ id: 'system-a', tenantId: 'tenant-a', clienteId: 'client-a' }),
        update,
      },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.update('tenant-a', 'system-a', {
      nombreSistema: 'Updated system', clienteId: 'client-a', tenantId: 'tenant-b',
    })).resolves.toEqual(expect.objectContaining({ nombreSistema: 'Updated system' }));
    expect(update).toHaveBeenCalledWith({
      where: { id: 'system-a' },
      data: { nombreSistema: 'Updated system', clienteId: 'client-a' },
    });
  });

  it('updates an Item without allowing tenant ownership reassignment', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'item-a',
      tenantId: 'tenant-a',
      sistemaId: 'system-a',
      nombre: 'Updated item',
      fechaImplementacion: new Date('2026-09-12T00:00:00.000Z'),
    });
    const prisma = { admin: {
      itemInventario: {
        findFirst: jest.fn().mockResolvedValue({ id: 'item-a', tenantId: 'tenant-a', sistemaId: 'system-a' }),
        update,
      },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.updateItem('tenant-a', 'item-a', {
      nombre: 'Updated item', fechaImplementacion: '2026-09-12', tenantId: 'tenant-b',
    })).resolves.toEqual(expect.objectContaining({ nombre: 'Updated item' }));
    expect(update).toHaveBeenCalledWith({
      where: { id: 'item-a' },
      data: { nombre: 'Updated item', fechaImplementacion: '2026-09-12T00:00:00.000Z' },
    });
  });

  it('rejects an Item PATCH for a foreign tenant before mutating it', async () => {
    const update = jest.fn();
    const prisma = { admin: {
      itemInventario: { findFirst: jest.fn().mockResolvedValue(null), update },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.updateItem('tenant-a', 'item-b', {
      nombre: 'Must not change',
    })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    '2026-02-30',
    '2026/09/12',
    '2026-09-12T00:00:00.000Z',
  ])('rejects invalid inventory date %s before touching Prisma', async (fechaImplementacion) => {
    const findFirst = jest.fn();
    const update = jest.fn();
    const prisma = { admin: {
      itemInventario: { findFirst, update },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.updateItem('tenant-a', 'item-a', { fechaImplementacion }))
      .rejects.toThrow(BadRequestException);
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('normalizes a valid inventory date at UTC midnight and preserves null', () => {
    expect(normalizeInventoryDateForStorage('2026-09-12')).toBe('2026-09-12T00:00:00.000Z');
    expect(normalizeInventoryDateForStorage(null)).toBeNull();
  });

  it('rejects a foreign System PATCH without mutating it', async () => {
    const update = jest.fn();
    const prisma = { admin: {
      sistema: { findFirst: jest.fn().mockResolvedValue(null), update },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.update('tenant-a', 'system-b', {
      nombreSistema: 'Must not change',
    })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a foreign replacement Client without mutating the tenant-owned System', async () => {
    const update = jest.fn();
    const prisma = { admin: {
      cliente: { findFirst: jest.fn().mockResolvedValue(null) },
      sistema: {
        findFirst: jest.fn().mockResolvedValue({ id: 'system-a', tenantId: 'tenant-a', clienteId: 'client-a' }),
        update,
      },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.update('tenant-a', 'system-a', {
      nombreSistema: 'Must not change', clienteId: 'client-b',
    })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a foreign Client before creating a System', async () => {
    const create = jest.fn();
    const prisma = { admin: {
      cliente: { findFirst: jest.fn().mockResolvedValue(null) },
      sistema: { create },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.create('tenant-a', {
      nombreSistema: 'Foreign system', tipo: 'web', clienteId: 'client-b',
    })).rejects.toThrow(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a foreign System before creating Inventory', async () => {
    const create = jest.fn();
    const prisma = { admin: {
      sistema: { findFirst: jest.fn().mockResolvedValue(null) },
      itemInventario: { create },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);

    await expect(service.createItem('tenant-a', 'system-b', {
      nombre: 'Foreign item', categoria: 'hosting',
    })).rejects.toThrow(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it.each([undefined, null])('allows an omitted or null inventory date (%s)', async (fechaImplementacion) => {
    const create = jest.fn().mockResolvedValue({ id: 'item-a', fechaImplementacion });
    const prisma = { admin: {
      sistema: { findFirst: jest.fn().mockResolvedValue({ id: 'system-a', tenantId: 'tenant-a' }) },
      itemInventario: { create },
    } };
    const service = new TenantSistemasService(prisma as any, { publish: jest.fn() } as any);
    const data: Record<string, unknown> = { nombre: 'Inventory item', categoria: 'software' };
    if (fechaImplementacion !== undefined) data.fechaImplementacion = fechaImplementacion;

    await expect(service.createItem('tenant-a', 'system-a', data)).resolves.toEqual(expect.objectContaining({ id: 'item-a' }));
    expect(create).toHaveBeenCalledWith({
      data: { nombre: 'Inventory item', categoria: 'software', ...(fechaImplementacion === null ? { fechaImplementacion: null } : {}), tenantId: 'tenant-a', sistemaId: 'system-a' },
    });
  });
});
