import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ComplianceRuleRegistry } from './compliance-rule-registry';
import { ComplianceContext, ComplianceViolationData } from './types';

@Injectable()
export class ComplianceEngine {
  private readonly logger = new Logger(ComplianceEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ComplianceRuleRegistry,
  ) {}

  async evaluateForTenant(tenantId: string): Promise<{ violationsCreated: number }> {
    const rules = this.registry.getAll();
    const expectationRules = this.registry.getAllExpectations();

    let totalViolations = 0;

    const context: ComplianceContext = {
      tenantId,
      queryEvents: async (query) => {
        const client = this.prisma.forTenant(tenantId);
        const where: any = { tenantId: query.tenantId };

        if (query.actorType) where.actorType = query.actorType;
        if (query.actorId) where.actorId = query.actorId;
        if (query.action) where.action = query.action;
        if (query.outcome) where.outcome = query.outcome;
        if (query.dateFrom || query.dateTo) {
          where.occurredAt = {};
          if (query.dateFrom) where.occurredAt.gte = new Date(query.dateFrom);
          if (query.dateTo) where.occurredAt.lte = new Date(query.dateTo);
        }

        return client.auditEvent.findMany({ where, orderBy: { occurredAt: 'desc' } });
      },
    };

    for (const rule of rules) {
      try {
        const violations = await rule.evaluate(context);
        for (const v of violations) {
          await this.persistViolation(v);
          totalViolations++;
        }
      } catch (error) {
        this.logger.error(`Rule ${rule.name} failed for tenant ${tenantId}: ${(error as Error).message}`);
      }
    }

    for (const rule of expectationRules) {
      try {
        const violations = await rule.evaluate(context);
        for (const v of violations) {
          await this.persistViolation(v);
          totalViolations++;
        }
      } catch (error) {
        this.logger.error(`Expectation rule ${rule.name} failed for tenant ${tenantId}: ${(error as Error).message}`);
      }
    }

    await this.recordRun(tenantId);

    return { violationsCreated: totalViolations };
  }

  private async persistViolation(violation: ComplianceViolationData): Promise<void> {
    const client = this.prisma.forTenant(violation.tenantId);

    await client.complianceViolation.create({
      data: {
        tenantId: violation.tenantId,
        ruleName: violation.ruleName,
        framework: violation.framework,
        eventId: violation.eventId,
        severity: violation.severity,
        description: violation.description,
      },
    });
  }

  private async recordRun(tenantId: string): Promise<void> {
    const client = this.prisma.forTenant(tenantId);

    const lastEvent = await client.auditEvent.findFirst({
      where: { tenantId },
      orderBy: { sequence: 'desc' },
    });

    await client.complianceExpectationRun.create({
      data: {
        tenantId,
        ruleName: 'compliance-engine-run',
        evaluatedAt: new Date(),
        violationsCount: 0,
      },
    });
  }
}
