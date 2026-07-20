import { Injectable } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceViolationData } from './types';

@Injectable()
export class GDPRComplianceRule implements ComplianceRule {
  readonly name = 'gdpr-consent-check';
  readonly framework = 'gdpr';

  async evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]> {
    const violations: ComplianceViolationData[] = [];

    const failedAuthEvents = await context.queryEvents({
      tenantId: context.tenantId,
      action: 'authenticate',
      outcome: 'failure',
    });

    for (const event of failedAuthEvents) {
      violations.push({
        tenantId: context.tenantId,
        ruleName: this.name,
        framework: this.framework,
        eventId: event.id,
        severity: 'medium',
        description: `Authentication failure detected — potential GDPR consent issue for actor ${event.actorId}`,
      });
    }

    return violations;
  }
}

@Injectable()
export class SOC2ComplianceRule implements ComplianceRule {
  readonly name = 'soc2-delete-trail';
  readonly framework = 'soc2';

  async evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]> {
    const violations: ComplianceViolationData[] = [];

    const deleteEvents = await context.queryEvents({
      tenantId: context.tenantId,
      action: 'delete',
    });

    for (const event of deleteEvents) {
      const auditTrail = await context.queryEvents({
        tenantId: context.tenantId,
        resourceId: event.resourceId,
        dateFrom: new Date(new Date(event.occurredAt).getTime() - 3600000).toISOString(),
        dateTo: event.occurredAt instanceof Date ? event.occurredAt.toISOString() : event.occurredAt,
      });

      if (auditTrail.length < 2) {
        violations.push({
          tenantId: context.tenantId,
          ruleName: this.name,
          framework: this.framework,
          eventId: event.id,
          severity: 'high',
          description: `Delete action on ${event.resourceType}/${event.resourceId} without sufficient audit trail`,
        });
      }
    }

    return violations;
  }
}
