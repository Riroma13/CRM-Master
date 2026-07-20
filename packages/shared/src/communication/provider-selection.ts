import type { CommunicationProvider } from './provider.interface';

export interface ChannelProviderConfig {
  channelId: string;
  providers: Array<{ providerId: string; priority: number }>;
}

export interface ChannelProviderConfigStore {
  getConfig(tenantId: string, channel: string): Promise<ChannelProviderConfig | null>;
}

export interface ProviderSelectionStrategy {
  select(channel: string, tenantId: string): Promise<CommunicationProvider | null>;
}
