import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { OAuthProvider } from './oauth-provider';

@Controller('api/v1/integration/auth')
export class OAuthCallbackController {
  constructor(private readonly oauthProvider: OAuthProvider) {}

  @Get(':providerId/callback')
  @HttpCode(HttpStatus.OK)
  async callback(@Param('providerId') providerId: string, @Query('code') code: string, @Query('state') state: string) {
    // Validate state (anti-CSRF) — in production, compare against stored state from session
    if (!code || !state) {
      return { status: 'error', message: 'Missing code or state parameter' };
    }
    return { status: 'success', providerId };
  }
}
