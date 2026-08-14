import { TenantSettingsService } from '../tenant-settings.service';

describe('TenantSettingsService', () => {
  const profile = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  };
  let service: TenantSettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantSettingsService(profile as never);
  });

  it('maps only the tenant identity fields on read', async () => {
    profile.getProfile.mockResolvedValue({
      id: 'tenant-a', slug: 'tenant-a', name: 'Acme', logo: null, isActive: true,
      config: { secret: true }, password: 'excluded',
    });

    await expect(service.getSettings('tenant-a')).resolves.toEqual({
      id: 'tenant-a', slug: 'tenant-a', name: 'Acme', logo: null, isActive: true,
    });
  });

  it('forwards partial updates, including a nullable logo clear, and maps the result', async () => {
    profile.updateProfile.mockResolvedValue({
      id: 'tenant-a', slug: 'tenant-a', name: 'New name', logo: null, isActive: true,
      config: { ignored: true },
    });

    await expect(service.updateSettings('tenant-a', { logo: null })).resolves.toEqual({
      id: 'tenant-a', slug: 'tenant-a', name: 'New name', logo: null, isActive: true,
    });
    expect(profile.updateProfile).toHaveBeenCalledWith('tenant-a', { logo: null });
  });

  it('preserves omitted fields and rejects excluded fields before the profile boundary', async () => {
    profile.updateProfile.mockResolvedValue({
      id: 'tenant-a', slug: 'tenant-a', name: 'Same', logo: 'logo.png', isActive: true,
    });

    await service.updateSettings('tenant-a', { name: 'Same' });
    expect(profile.updateProfile).toHaveBeenCalledWith('tenant-a', { name: 'Same' });
    expect(() => service.assertAllowedKeys({ password: 'secret' })).toThrow();
    expect(() => service.assertAllowedKeys({ config: {} })).toThrow();
  });

  it('keeps an equivalent PATCH state-idempotent', async () => {
    const current = { id: 'tenant-a', slug: 'tenant-a', name: 'Same', logo: null, isActive: true };
    profile.updateProfile.mockResolvedValue(current);
    await expect(service.updateSettings('tenant-a', { name: 'Same', logo: null })).resolves.toEqual(current);
    await expect(service.updateSettings('tenant-a', { name: 'Same', logo: null })).resolves.toEqual(current);
    expect(profile.updateProfile).toHaveBeenCalledTimes(2);
  });
});
