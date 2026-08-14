import { TenantProfileService } from './tenant-profile.service';

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
});
