type MiddlewareParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

type MiddlewareNext = (params: MiddlewareParams) => Promise<any>;

export function createAuditAppendOnlyMiddleware(): (params: MiddlewareParams, next: MiddlewareNext) => Promise<any> {
  return async (params, next) => {
    if (params.args?.__internalRedact === true) {
      const clean = { ...params, args: { ...params.args } };
      delete clean.args.__internalRedact;
      return next(clean);
    }

    if (params.model === 'AuditEvent') {
      if (params.action === 'update' || params.action === 'updateMany') {
        throw new Error(
          'Audit events are append-only. Updates are not permitted. ' +
          'Use the redaction service with __internalRedact flag for GDPR compliance operations.',
        );
      }
      if (params.action === 'delete' || params.action === 'deleteMany') {
        throw new Error(
          'Audit events are append-only. Deletions are not permitted.',
        );
      }
    }

    return next(params);
  };
}

export function computeGenesisHash(tenantId: string): string {
  const secret = process.env.AUDIT_CHAIN_SECRET;
  if (!secret) {
    throw new Error('AUDIT_CHAIN_SECRET environment variable is required');
  }
  const crypto = require('node:crypto');
  return crypto.createHash('sha256')
    .update(`${tenantId}${secret}genesis`)
    .digest('hex');
}

export function computeAuditEventHash(data: {
  tenantId: string;
  actorType: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  outcome: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}, prevHash: string, sequence: number): string {
  const crypto = require('node:crypto');
  const contentString = JSON.stringify({
    tenantId: data.tenantId,
    actorType: data.actorType,
    actorId: data.actorId,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    action: data.action,
    outcome: data.outcome,
    occurredAt: data.occurredAt,
    metadata: data.metadata,
  });
  return crypto.createHash('sha256')
    .update(contentString + prevHash + String(sequence))
    .digest('hex');
}
