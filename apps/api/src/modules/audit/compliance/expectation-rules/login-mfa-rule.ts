import { Injectable } from '@nestjs/common';
import { ExpectationRule, ComplianceContext, ComplianceViolationData } from '../types';

@Injectable()
export class LoginMFAExpectationRule implements ExpectationRule {
  readonly name = 'login-mfa-required';
  readonly framework = 'soc2';

  async evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]> {
    const violations: ComplianceViolationData[] = [];

    const successfulLogins = await context.queryEvents({
      tenantId: context.tenantId,
      action: 'login',
      outcome: 'success',
      dateFrom: new Date(Date.now() - 86400000).toISOString(),
    });

    for (const loginEvent of successfulLogins) {
      const loginTime = loginEvent.occurredAt instanceof Date
        ? loginEvent.occurredAt
        : new Date(loginEvent.occurredAt);

      const windowStart = new Date(loginTime.getTime() - 300000).toISOString();
      const windowEnd = new Date(loginTime.getTime() + 300000).toISOString();

      const mfaEvents = await context.queryEvents({
        tenantId: context.tenantId,
        actorId: loginEvent.actorId,
        action: 'authenticate',
        outcome: 'success',
        dateFrom: windowStart,
        dateTo: windowEnd,
      });

      if (mfaEvents.length === 0) {
        violations.push({
          tenantId: context.tenantId,
          ruleName: this.name,
          framework: this.framework,
          eventId: loginEvent.id,
          severity: 'high',
          description: `Login by ${loginEvent.actorId} without corresponding MFA authentication within 5 minutes`,
        });
      }
    }

    return violations;
  }
}
