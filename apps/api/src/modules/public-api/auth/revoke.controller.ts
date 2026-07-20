import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('api/v1/internal/api-keys')
export class RevokeController {
  constructor(private readonly tokenService: TokenService) {}

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Param('id') id: string): Promise<{ revoked: boolean; revokedAt: string }> {
    await this.tokenService.revokeToken(id);
    return { revoked: true, revokedAt: new Date().toISOString() };
  }
}
