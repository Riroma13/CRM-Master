import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class OAuthProvider {
  private readonly logger = new Logger(OAuthProvider.name);

  getAuthUrl(config: { authUrl: string; clientId: string; redirectUri: string; scopes: string[] }): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const url = `${config.authUrl}?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&scope=${config.scopes.join(' ')}&state=${state}&response_type=code`;
    return { url, state };
  }

  validateState(expected: string, received: string): boolean {
    if (!expected || !received) return false;
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }
}
