export type PermissionResource =
  | 'workflows'
  | 'documents'
  | 'notifications'
  | 'integrations'
  | 'users'
  | 'teams'
  | 'roles'
  | 'billing'
  | 'plugins'
  | 'audit'
  | 'reports'
  | 'api_keys';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'admin';

export type PermissionString = `${PermissionResource}:${PermissionAction}` | '*:admin';

export interface PermissionCheck {
  userId: string;
  permission: string;
  resourceId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  role?: string;
  grantedBy?: string;
}
