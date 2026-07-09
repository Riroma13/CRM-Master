import { createAccessControl } from 'better-auth/plugins/access';

export const statement = {
  citas: ['create', 'read', 'update', 'delete', 'confirmar', 'cancelar'],
  documentos: ['create', 'read', 'update', 'delete', 'compartir'],
  incidencias: ['create', 'read', 'update', 'delete', 'asignar', 'cerrar'],
  clientes: ['create', 'read', 'update', 'delete'],
  tareas: ['create', 'read', 'update', 'delete'],
  sistemas: ['create', 'read', 'update', 'delete'],
  recursos: ['create', 'read', 'update', 'delete'],
  configuracion: ['read', 'update'],
} as const;

export const ac = createAccessControl(statement);

// Roles base (aplica a todos los tenants)
export const owner = ac.newRole({
  citas: ['create', 'read', 'update', 'delete', 'confirmar', 'cancelar'],
  documentos: ['create', 'read', 'update', 'delete', 'compartir'],
  incidencias: ['create', 'read', 'update', 'delete', 'asignar', 'cerrar'],
  clientes: ['create', 'read', 'update', 'delete'],
  tareas: ['create', 'read', 'update', 'delete'],
  sistemas: ['create', 'read', 'update', 'delete'],
  recursos: ['create', 'read', 'update', 'delete'],
  configuracion: ['read', 'update'],
});

export const operador = ac.newRole({
  citas: ['create', 'read', 'update', 'confirmar', 'cancelar'],
  documentos: ['create', 'read', 'compartir'],
  incidencias: ['create', 'read', 'update'],
  clientes: ['read'],
  tareas: ['create', 'read', 'update'],
  sistemas: ['read'],
  recursos: ['read'],
  configuracion: [],
});

export const lector = ac.newRole({
  citas: ['read'],
  documentos: ['read'],
  incidencias: ['read'],
  clientes: ['read'],
  tareas: ['read'],
  sistemas: ['read'],
  recursos: ['read'],
  configuracion: [],
});

export const ROLE_MAP: Record<string, ReturnType<typeof ac.newRole>> = {
  owner,
  operador,
  lector,
};
