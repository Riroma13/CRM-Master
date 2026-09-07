import { NotFoundException } from '@nestjs/common';
import { TenantTareasService } from './tenant-tareas.service';

describe('TenantTareasService ownership foundation contract', () => {
  it('rejects a foreign Client before creating a Task', async () => {
    const create = jest.fn();
    const prisma = { admin: {
      cliente: { findFirst: jest.fn().mockResolvedValue(null) },
      tarea: { create },
    } };
    const service = new TenantTareasService(prisma as any);

    await expect(service.create('tenant-a', {
      titulo: 'Foreign task', clienteId: 'client-b',
    })).rejects.toThrow(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a foreign System before updating a Task relation', async () => {
    const update = jest.fn();
    const prisma = { admin: {
      tarea: { findFirst: jest.fn().mockResolvedValue({ id: 'task-a', tenantId: 'tenant-a' }), update },
      sistema: { findFirst: jest.fn().mockResolvedValue(null) },
    } };
    const service = new TenantTareasService(prisma as any);

    await expect(service.update('tenant-a', 'task-a', { sistemaId: 'system-b' } as any))
      .rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});
