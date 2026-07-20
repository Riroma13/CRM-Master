import { ProviderRegistry } from '../provider-registry';
import type { CommunicationProvider } from '@shared/communication';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  const mockProvider: CommunicationProvider = {
    id: 'test-provider', name: 'Test', channels: ['email', 'sms'],
    send: jest.fn(), verifyWebhookSignature: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => { registry = new ProviderRegistry(); });

  it('should register and retrieve a provider by id', () => {
    registry.register(mockProvider);
    expect(registry.getProvider('test-provider')).toBe(mockProvider);
  });

  it('should return undefined for unknown provider', () => {
    expect(registry.getProvider('unknown')).toBeUndefined();
  });

  it('should return providers by channel', () => {
    registry.register(mockProvider);
    const results = registry.getProvidersByChannel('email');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('test-provider');
  });

  it('should return empty array for channel with no providers', () => {
    expect(registry.getProvidersByChannel('fax')).toEqual([]);
  });

  it('should list all providers', () => {
    registry.register(mockProvider);
    expect(registry.getAllProviders()).toHaveLength(1);
  });
});
