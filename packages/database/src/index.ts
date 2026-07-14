import { PrismaClient } from '@prisma/client';

/**
 * Creates a Prisma client with automatic tenant scoping.
 * Every query that touches a model with `tenantId` is filtered
 * to the active tenant — no manual `where: { tenantId }` needed.
 *
 * When called without a `tenantId`, the returned client is unscoped
 * (for admin paths only) and a warning is emitted in non-test environments.
 *
 * Raw SQL methods ($queryRaw, $queryRawUnsafe, $executeRaw) are blocked
 * on tenant-scoped clients to prevent bypassing the tenant_id filter.
 */
export function createPrismaClient(tenantId?: string) {
  if (!tenantId && process.env.NODE_ENV !== 'test') {
    console.warn(
      `[WARN] createPrismaClient() called without tenantId — creating unscoped admin client. ` +
        `This should only happen in trusted admin paths or database seed scripts.`,
    );
  }

  const client = new PrismaClient();

  if (!tenantId) return client;

  const scopedClient = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const scopedModels = [
            'User',
            'Cliente',
            'Sistema',
            'ItemInventario',
            'EventoBitacora',
            'Tarea',
            'Disponibilidad',
            'Cita',
            'Documento',
            'Resource',
            'Incidencia',
            'Presupuesto',
            'Webhook',
            'PlantillaDocumento',
            'PagoIntent',
            'AuditLog',
            'Comunicacion',
            'Encuesta',
            'EventoAcademico',
            'ClientUser',
          ];

          if (!scopedModels.includes(model)) return query(args);

          // Inject tenantId filter for read operations
          if (
            [
              'findUnique',
              'findFirst',
              'findMany',
              'count',
              'aggregate',
              'findUniqueOrThrow',
              'findFirstOrThrow',
            ].includes(operation)
          ) {
            args.where = { ...(args.where || {}), tenantId };
          }

          // Inject tenantId for create
          if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          }

          // Inject tenantId for createMany
          if (operation === 'createMany') {
            args.data = (args.data as any[]).map((d: any) => ({
              ...d,
              tenantId,
            }));
          }

          // Scope updates and deletes
          if (
            ['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(
              operation,
            )
          ) {
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

  // Block raw SQL methods on scoped clients — they bypass tenant_id filtering
  return scopedClient.$extends({
    client: {
      $queryRaw: () =>
        Promise.reject(
          new Error('Raw SQL not allowed on tenant-scoped client'),
        ),
      $queryRawUnsafe: () =>
        Promise.reject(
          new Error('Raw SQL not allowed on tenant-scoped client'),
        ),
      $executeRaw: () =>
        Promise.reject(
          new Error('Raw SQL not allowed on tenant-scoped client'),
        ),
    },
  }) as any;
}

export type ScopedPrismaClient = ReturnType<typeof createPrismaClient>;
