import { Injectable, Logger } from '@nestjs/common';
import type { CommunicationProvider, ProviderSelectionStrategy } from "@shared/communication";
import { ProviderRegistry } from './provider-registry';
import { DatabaseChannelProviderConfigStore } from './channel-provider-config-store';

@Injectable()
export class ProviderSelectionStrategyImpl implements ProviderSelectionStrategy {
  private readonly logger = new Logger(ProviderSelectionStrategyImpl.name);

  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly configStore: DatabaseChannelProviderConfigStore,
  ) {}

  async select(channel: string, tenantId: string): Promise<CommunicationProvider | null> {
    const config = await this.configStore.getConfig(tenantId, channel);
    if (config && config.providers.length > 0) {
      // Sort by priority (lower = higher priority)
      const sorted = [...config.providers].sort((a, b) => a.priority - b.priority);
      for (const entry of sorted) {
        const provider = this.providerRegistry.getProvider(entry.providerId);
        if (provider) return provider;
      }
    }

    // Fallback: first registered provider for this channel
    const providers = this.providerRegistry.getProvidersByChannel(channel);
    if (providers.length > 0) {
      this.logger.warn(`No channel config for tenant ${tenantId}/${channel}; using first registered provider`);
      return providers[0];
    }

    return null;
  }
}
