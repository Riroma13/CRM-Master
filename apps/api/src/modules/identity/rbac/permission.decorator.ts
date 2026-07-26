import { SetMetadata } from '@nestjs/common';

export const IDENTITY_PERMISSIONS_KEY = 'identity_permissions';

export const RequirePermission = (permission: string) =>
  SetMetadata(IDENTITY_PERMISSIONS_KEY, permission);
