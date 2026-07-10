import { Injectable, Logger } from '@nestjs/common';

interface GCalToken { tenantId: string; accessToken: string; refreshToken?: string; email?: string; }

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private tokens: GCalToken[] = [];

  // Simulated OAuth — in production, use googleapis package
  storeToken(tenantId: string, token: { accessToken: string; refreshToken?: string; email?: string }) {
    const existing = this.tokens.findIndex(t => t.tenantId === tenantId);
    if (existing >= 0) this.tokens[existing] = { tenantId, ...token };
    else this.tokens.push({ tenantId, ...token });
    this.logger.log(`Google Calendar connected for tenant ${tenantId}`);
    return { connected: true, email: token.email };
  }

  getStatus(tenantId: string) {
    const t = this.tokens.find(x => x.tenantId === tenantId);
    return { connected: !!t, email: t?.email };
  }

  disconnect(tenantId: string) {
    this.tokens = this.tokens.filter(t => t.tenantId !== tenantId);
    return { connected: false };
  }
}
