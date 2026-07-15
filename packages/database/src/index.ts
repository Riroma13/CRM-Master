import { PrismaClient } from '@prisma/client';
import { injectWhere, injectData, injectDataArray } from './prisma-helpers';

interface CreatePrismaClientOptions {
  tenantId?: string;
  clienteId?: string;
}

const clienteIdModels = ['Cita', 'Documento'];

/**
 * Creates a Prisma client with automatic tenant scoping.
 * Every query that touches a model with `tenantId` is filtered
 * to the active tenant — no manual `where: { tenantId }` needed.
 *
 * When called without a `tenantId`, the returned client is unscoped
 * (for admin paths only) and a warning is emitted in non-test environments.
 *
 * When `clienteId` is provided, client-scoped models (Cita, Documento) also
 * receive automatic `clienteId` filtering.
 *
 * Raw SQL methods ($queryRaw, $queryRawUnsafe, $executeRaw) are blocked
 * on tenant-scoped clients to prevent bypassing the tenant_id filter.
 */
export function createPrismaClient(opts?: CreatePrismaClientOptions | string) {
  const tenantId = typeof opts === 'string' ? opts : opts?.tenantId;
  const clienteId = typeof opts === 'object' ? opts?.clienteId : undefined;

  if (!tenantId && process.env.NODE_ENV !== 'test') {
    console.warn(
      `[WARN] createPrismaClient() called without tenantId — creating unscoped admin client. ` +
        `This should only happen in trusted admin paths or database seed scripts.`,
    );
  }

  const client = new PrismaClient();

  if (!tenantId) return client;

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

  const readOps = [
    'findUnique', 'findFirst', 'findMany', 'count',
    'aggregate', 'findUniqueOrThrow', 'findFirstOrThrow',
  ];

  const writeOps = ['update', 'updateMany', 'delete', 'deleteMany'];

  const scopedClient = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!scopedModels.includes(model)) return query(args);

          const fields: Record<string, string> = { tenantId };
          if (clienteId && clienteIdModels.includes(model)) {
            fields.clienteId = clienteId;
          }

          if (readOps.includes(operation)) {
            injectWhere(args, fields);
          } else if (operation === 'create') {
            injectData(args, fields);
          } else if (operation === 'createMany') {
            injectDataArray(args, fields);
          } else if (writeOps.includes(operation)) {
            injectWhere(args, { tenantId });
            if (clienteId && clienteIdModels.includes(model)) {
              injectWhere(args, { clienteId });
            }
          } else if (operation === 'upsert') {
            injectWhere(args, { tenantId });
            if (args.create) args.create.tenantId = tenantId;
            if (clienteId && clienteIdModels.includes(model)) {
              injectWhere(args, { clienteId });
              if (args.create) args.create.clienteId = clienteId;
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
