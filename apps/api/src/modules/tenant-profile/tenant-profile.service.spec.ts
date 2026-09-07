import { TenantProfileService } from './tenant-profile.service';
import { TenantProfileController } from './tenant-profile.controller';

describe('TenantProfileService nullable logo boundary', () => {
  const update = jest.fn();
  const findUnique = jest.fn();
  const prisma = { admin: { tenant: { findUnique, update } } };
  let service: TenantProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({ id: 'tenant-a', name: 'Acme', logo: 'old.png' });
    update.mockResolvedValue({ id: 'tenant-a', name: 'Acme', logo: null });
    service = new TenantProfileService(prisma as never);
  });

  it('persists an explicitly supplied null logo', async () => {
    await service.updateProfile('tenant-a', { logo: null });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { logo: null } }));
  });

  it('does not write logo when it is omitted', async () => {
    await service.updateProfile('tenant-a', { name: 'Acme Updated' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Acme Updated' } }));
  });

  it('does not expose a password mutation service', () => {
    expect((service as TenantProfileService & { updatePassword?: unknown }).updatePassword).toBeUndefined();
  });

  it('routes a password-bearing profile request through the business profile contract', async () => {
    const updateProfile = jest.fn().mockResolvedValue({ id: 'tenant-a' });
    const updatePassword = jest.fn();
    const controller = new TenantProfileController({ updateProfile, updatePassword } as never);

    await controller.updateProfile('tenant-a', { password: 'must-not-be-used', name: 'Acme Updated' });

    expect(updatePassword).not.toHaveBeenCalled();
    expect(updateProfile).toHaveBeenCalledWith('tenant-a', { name: 'Acme Updated' });
  });
});
