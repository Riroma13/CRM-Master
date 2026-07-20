import { describe, it, expect } from 'vitest';
import type { AuditEvent, ActorType, ResourceType, Action, Outcome } from '../audit.types';
import type { AuditPublisher } from '../audit-publisher';
import type { ComplianceContext, ComplianceRule, ComplianceViolation, ComplianceFramework } from '../compliance.types';
import type { RetentionPolicy, AuditExporter } from '../retention.types';

describe('AuditEvent shape', () => {
  it('valid AuditEvent shape passes type check', () => {
    const event: AuditEvent = {
      id: 'evt-001',
      tenantId: 'tenant-1',
      actorType: 'user',
      actorId: 'user-1',
      actorName: 'John Doe',
      resourceType: 'document',
      resourceId: 'doc-1',
      resourceName: 'report.pdf',
      action: 'create',
      outcome: 'success',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      correlationId: 'corr-1',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: { key: 'value' },
    };

    expect(event.id).toBe('evt-001');
    expect(event.tenantId).toBe('tenant-1');
    expect(event.actorType).toBe('user');
    expect(event.resourceType).toBe('document');
    expect(event.action).toBe('create');
    expect(event.outcome).toBe('success');
  });

  it('optional fields are not required', () => {
    const event: AuditEvent = {
      id: 'evt-002',
      tenantId: 'tenant-1',
      actorType: 'system',
      actorId: 'system-1',
      resourceType: 'configuration',
      resourceId: 'cfg-1',
      action: 'update',
      outcome: 'success',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: {},
    };

    expect(event.actorName).toBeUndefined();
    expect(event.resourceName).toBeUndefined();
    expect(event.ipAddress).toBeUndefined();
    expect(event.userAgent).toBeUndefined();
    expect(event.correlationId).toBeUndefined();
  });
});

describe('AuditEvent required fields', () => {
  it('requires tenantId', () => {
    const event: AuditEvent = {
      id: 'evt-003',
      tenantId: 'tenant-1',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'role',
      resourceId: 'role-1',
      action: 'assign',
      outcome: 'success',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: {},
    };
    expect(event.tenantId).toBeDefined();
    expect(typeof event.tenantId).toBe('string');
  });

  it('requires actorType', () => {
    const types: ActorType[] = ['user', 'system', 'integration', 'workflow', 'admin', 'api'];
    types.forEach(t => {
      const e: AuditEvent = {
        id: 'evt',
        tenantId: 't1',
        actorType: t,
        actorId: 'a1',
        resourceType: 'tenant',
        resourceId: 'r1',
        action: 'read',
        outcome: 'success',
        occurredAt: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      expect(e.actorType).toBe(t);
    });
  });

  it('requires actorId', () => {
    const event: AuditEvent = {
      id: 'evt-004',
      tenantId: 'tenant-1',
      actorType: 'user',
      actorId: 'user-42',
      resourceType: 'permission',
      resourceId: 'perm-1',
      action: 'revoke',
      outcome: 'success',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: {},
    };
    expect(event.actorId).toBe('user-42');
  });

  it('requires resourceType', () => {
    const types: ResourceType[] = [
      'user', 'role', 'permission', 'tenant', 'configuration',
      'workflow', 'notification', 'document', 'integration',
      'automation', 'communication', 'auth', 'api',
    ];
    types.forEach(t => {
      const e: AuditEvent = {
        id: 'evt',
        tenantId: 't1',
        actorType: 'admin',
        actorId: 'a1',
        resourceType: t,
        resourceId: 'r1',
        action: 'read',
        outcome: 'success',
        occurredAt: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      expect(e.resourceType).toBe(t);
    });
  });

  it('requires resourceId', () => {
    const event: AuditEvent = {
      id: 'evt-005',
      tenantId: 'tenant-1',
      actorType: 'user',
      actorId: 'user-1',
      resourceType: 'user',
      resourceId: 'target-user-1',
      action: 'create',
      outcome: 'success',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: {},
    };
    expect(event.resourceId).toBe('target-user-1');
  });

  it('requires action', () => {
    const actions: Action[] = [
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'authenticate',
      'authorize', 'deny',
      'assign', 'revoke',
      'start', 'complete', 'fail',
      'export', 'import', 'purge',
    ];
    actions.forEach(a => {
      const e: AuditEvent = {
        id: 'evt',
        tenantId: 't1',
        actorType: 'workflow',
        actorId: 'wf-1',
        resourceType: 'workflow',
        resourceId: 'r1',
        action: a,
        outcome: 'success',
        occurredAt: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      expect(e.action).toBe(a);
    });
  });

  it('requires outcome', () => {
    const outcomes: Outcome[] = ['success', 'failure', 'denied', 'error'];
    outcomes.forEach(o => {
      const e: AuditEvent = {
        id: 'evt',
        tenantId: 't1',
        actorType: 'integration',
        actorId: 'int-1',
        resourceType: 'integration',
        resourceId: 'r1',
        action: 'export',
        outcome: o,
        occurredAt: '2026-01-01T00:00:00Z',
        metadata: {},
      };
      expect(e.outcome).toBe(o);
    });
  });
});

describe('AuditPublisher interface', () => {
  it('AuditPublisher contract compiles', () => {
    const publisher: AuditPublisher = {
      async publish(event) {
        return { eventId: 'evt-generated' };
      },
    };
    expect(publisher.publish).toBeDefined();
    expect(typeof publisher.publish).toBe('function');
  });

  it('publish returns eventId', async () => {
    const publisher: AuditPublisher = {
      async publish(_event) {
        return { eventId: 'evt-123' };
      },
    };
    const result = await publisher.publish({
      tenantId: 't1',
      actorType: 'user',
      actorId: 'u1',
      resourceType: 'document',
      resourceId: 'd1',
      action: 'read',
      outcome: 'success',
      occurredAt: '2026-07-20T12:00:00Z',
      metadata: {},
    });
    expect(result.eventId).toBe('evt-123');
  });
});

describe('Compliance interfaces', () => {
  it('ComplianceContext interface compiles', () => {
    const context: ComplianceContext = {
      async getTenantConfig(_tenantId) {
        return { retentionDays: 365 };
      },
      async queryEvents(_query) {
        return [];
      },
      async getRetentionPolicy(_tenantId) {
        return null;
      },
    };
    expect(context.getTenantConfig).toBeDefined();
    expect(context.queryEvents).toBeDefined();
    expect(context.getRetentionPolicy).toBeDefined();
  });

  it('ComplianceRule interface compiles', () => {
    const rule: ComplianceRule = {
      name: 'test-rule',
      framework: 'gdpr' as ComplianceFramework,
      async evaluate(_context) {
        return [];
      },
    };
    expect(rule.name).toBe('test-rule');
    expect(rule.framework).toBe('gdpr');
  });

  it('ExpectationRule interface compiles', () => {
    const rule: ComplianceRule = {
      name: 'login-mfa-check',
      framework: 'soc2' as ComplianceFramework,
      async evaluate(_context) {
        const violation: ComplianceViolation = {
          id: 'v-1',
          tenantId: 't1',
          ruleName: 'login-mfa-check',
          framework: 'soc2',
          eventId: 'evt-1',
          severity: 'high',
          description: 'Login without MFA check',
          detectedAt: '2026-07-20T12:00:00Z',
        };
        return [violation];
      },
    };
    expect(rule.name).toBe('login-mfa-check');
  });

  it('ComplianceViolation with optional resolvedAt', () => {
    const violation: ComplianceViolation = {
      id: 'v-2',
      tenantId: 't1',
      ruleName: 'gdpr-retention',
      framework: 'gdpr',
      severity: 'critical',
      description: 'Personal data retained beyond policy',
      detectedAt: '2026-07-20T12:00:00Z',
      resolvedAt: '2026-07-21T12:00:00Z',
    };
    expect(violation.resolvedAt).toBe('2026-07-21T12:00:00Z');
    expect(violation.eventId).toBeUndefined();
  });
});

describe('Retention interfaces', () => {
  it('RetentionPolicy interface compiles', () => {
    const policy: RetentionPolicy = {
      tenantId: 't1',
      retentionDays: 365,
      archiveAfterDays: 90,
      purgeAfterDays: 730,
      legalHold: false,
    };
    expect(policy.retentionDays).toBe(365);
    expect(policy.legalHold).toBe(false);
  });

  it('AuditExporter interface compiles', () => {
    const exporter: AuditExporter = {
      format: 'json',
      contentType: 'application/json',
      async export(events) {
        return JSON.stringify(events);
      },
    };
    expect(exporter.format).toBe('json');
    expect(exporter.contentType).toBe('application/json');
  });
});
