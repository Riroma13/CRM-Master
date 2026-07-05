import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator that marks a route handler or controller as public.
 * Routes decorated with @Public() bypass the global TenantScopeGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
