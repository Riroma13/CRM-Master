import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermission('clientes', 'create')
 * Requiere que el rol del usuario tenga permiso para la acción sobre el recurso.
 */
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, { resource, action });
