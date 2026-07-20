import { Test, TestingModule } from '@nestjs/testing';
import { ProviderSelectionStrategyImpl } from '../provider-selection';
import { ProviderRegistry } from '../provider-registry';
import { DatabaseChannelProviderConfigStore } from '../channel-provider-config-store';
import type { CommunicationProvider } from '@shared/communication';

describe('ProviderSelectionStrategyImpl', () => {
  let strategy: ProviderSelectionStrategyImpl;
  let registry: ProviderRegistry;
  let configStore: any;

  const mockProvider = (id: string, channels: string[]): CommunicationProvider => ({
    id, name: id, channels,
    send: jest.fn(), verifyWebhookSignature: jest.fn().mockReturnValue(true),
  });

  beforeEach(async () => {
    registry = new ProviderRegistry();
    configStore = { getConfig: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderSelectionStrategyImpl,
        { provide: ProviderRegistry, useValue: registry },
        { provide: DatabaseChannelProviderConfigStore, useValue: configStore },
      ],
    }).compile();

    strategy = module.get<ProviderSelectionStrategyImpl>(ProviderSelectionStrategyImpl);
  });

  it('should select provider from config by priority', async () => {
    const p1 = mockProvider('backup', ['email']);
    const p2 = mockProvider('primary', ['email']);
    registry.register(p1);
    registry.register(p2);

    configStore.getConfig.mockResolvedValue({
      channelId: 'email',
      providers: [{ providerId: 'primary', priority: 1 }, { providerId: 'backup', priority: 2 }],
    });

    const result = await strategy.select('email', 'tenant-1');
    expect(result?.id).toBe('primary');
  });

  it('should fallback to first registered provider when no config', async () => {
    const p = mockProvider('default', ['email']);
    registry.register(p);
    configStore.getConfig.mockResolvedValue(null);

    const result = await strategy.select('email', 'tenant-1');
    expect(result?.id).toBe('default');
  });

  it('should return null when no providers available', async () => {
    configStore.getConfig.mockResolvedValue(null);
    const result = await strategy.select('fax', 'tenant-1');
    expect(result).toBeNull();
  });
});
