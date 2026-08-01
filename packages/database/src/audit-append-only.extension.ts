type AuditQueryArgs = Record<string, any>;

type AuditQueryContext = {
  model?: string;
  operation: string;
  args: AuditQueryArgs;
  query: (args: AuditQueryArgs) => Promise<any>;
};

const UPDATE_OPERATIONS = new Set(['update', 'updateMany']);
const DELETE_OPERATIONS = new Set(['delete', 'deleteMany']);

export const auditAppendOnlyExtension = {
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: AuditQueryContext) {
        if (model !== 'AuditEvent') return query(args);

        if (DELETE_OPERATIONS.has(operation)) {
          throw new Error('Audit events are append-only. Deletions are not permitted.');
        }

        if (!UPDATE_OPERATIONS.has(operation) || args?.__internalRedact !== true) {
          if (UPDATE_OPERATIONS.has(operation)) {
            throw new Error(
              'Audit events are append-only. Updates are not permitted. ' +
              'Use the redaction service with __internalRedact flag for GDPR compliance operations.',
            );
          }
          return query(args);
        }

        const cleanArgs = { ...args };
        delete cleanArgs.__internalRedact;
        return query(cleanArgs);
      },
    },
  },
};
