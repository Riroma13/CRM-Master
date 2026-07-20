import { Injectable } from '@nestjs/common';
import type { CommunicationProvider } from "@shared/communication";

@Injectable()
export class ProviderRegistry {
  private providers = new Map<string, CommunicationProvider>();

  register(provider: CommunicationProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): CommunicationProvider | undefined {
    return this.providers.get(id);
  }

  getProvidersByChannel(channel: string): CommunicationProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.channels.includes(channel));
  }

  getAllProviders(): CommunicationProvider[] {
    return Array.from(this.providers.values());
  }
}
