import { NotFoundException } from '@nestjs/common';
import { TenantSistemasService } from './tenant-sistemas.service';

describe('TenantSistemasService ownership foundation contract', () => {
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
});
