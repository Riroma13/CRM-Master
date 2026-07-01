import { PrismaClient } from '@prisma/client';

/**
 * Creates a Prisma client with automatic tenant scoping.
 * Every query that touches a model with `tenantId` is filtered
 * to the active tenant — no manual `where: { tenantId }` needed.
 */
export function createPrismaClient(tenantId?: string) {
  const client = new PrismaClient();

  if (!tenantId) return client;

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scopedModels = [
            'User', 'Cliente', 'Sistema', 'ItemInventario',
            'EventoBitacora', 'Tarea',
          ];

          if (!scopedModels.includes(model)) return query(args);

          // Inject tenantId filter for read operations
          if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          // Inject tenantId for create
          if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          }

          // Inject tenantId for createMany
          if (operation === 'createMany') {
            args.data = (args.data as any[]).map((d: any) => ({ ...d, tenantId }));
          }

          // Scope updates and deletes
          if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
            if (operation === 'upsert') {
              args.where = { ...args.where, tenantId };
              args.create = { ...args.create, tenantId };
            } else {
              args.where = { ...args.where, tenantId };
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type ScopedPrismaClient = ReturnType<typeof createPrismaClient>;
