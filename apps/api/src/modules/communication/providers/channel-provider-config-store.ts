import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { ChannelProviderConfig, ChannelProviderConfigStore } from "@shared/communication";

@Injectable()
export class DatabaseChannelProviderConfigStore implements ChannelProviderConfigStore {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(tenantId: string, channel: string): Promise<ChannelProviderConfig | null> {
    const tenant = await this.prisma.admin.tenant.findUnique({
      where: { id: tenantId },
      select: { config: true },
    });
    if (!tenant?.config) return null;

    const config = tenant.config as Record<string, unknown>;
    const channels = config.channelProviders as Record<string, unknown> | undefined;
    if (!channels?.[channel]) return null;

    const providerConfig = channels[channel] as { providers: Array<{ providerId: string; priority: number }> };
    return {
      channelId: channel,
      providers: providerConfig.providers ?? [],
    };
  }
}
