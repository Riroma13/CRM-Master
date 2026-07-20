import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRED_SCOPE_KEY = 'requiredScope';

export const RequireScope = (scope: string) => SetMetadata(REQUIRED_SCOPE_KEY, scope);

function scopeMatches(keyScopes: string[], required: string): boolean {
  const [reqResource, reqAction] = required.split(':');

  return keyScopes.some((ks) => {
    const [res, action] = ks.split(':');

    if (res === '*' && action === 'admin') return true;
    if (ks === required) return true;
    if (res === '*' && action === reqAction) return true;

    return false;
  });
}

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<string>(REQUIRED_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredScope) return true;

    const request = context.switchToHttp().getRequest();
    const keyScopes: string[] = request.apiKeyScopes ?? [];

    if (keyScopes.length === 0) {
      throw new ForbiddenException('Insufficient scope: no scopes assigned to this API key');
    }

    if (!scopeMatches(keyScopes, requiredScope)) {
      throw new ForbiddenException(`Insufficient scope: required ${requiredScope}`);
    }

    return true;
  }
}
