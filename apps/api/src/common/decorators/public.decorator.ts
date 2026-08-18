import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const AUTH_BOUNDARY_KEY = 'authBoundary';

export type AuthBoundaryKind =
  | 'identity-session'
  | 'client-session'
  | 'api-token-deferred';

/**
 * Decorator that marks a route handler or controller as public.
 * Routes decorated with @Public() bypass the global TenantScopeGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Classifies routes whose existing guard owns authentication after the global
 * Better Auth/Tenant Scope boundary. This is not an anonymous-access bypass.
 */
export const ExternalAuth = (kind: AuthBoundaryKind) =>
  SetMetadata(AUTH_BOUNDARY_KEY, kind);
