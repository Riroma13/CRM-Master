import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.['authorization'] as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization format. Expected: Bearer crm_live_xxx');
    }

    const token = parts[1];
    if (!token.startsWith('crm_live_')) {
      throw new UnauthorizedException('Invalid token format');
    }

    const payload = await this.tokenService.validateToken(token);
    if (!payload) {
      throw new UnauthorizedException('Token invalid, expired, or revoked');
    }

    request.tenantId = payload.tenantId;
    request.apiKeyScopes = payload.scopes;
    request.apiKeyId = payload.id;

    return true;
  }
}
