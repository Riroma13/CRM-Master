import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { ComplianceEngine } from '../compliance/compliance-engine';
import { ComplianceRuleRegistry } from '../compliance/compliance-rule-registry';
import { ComplianceRule, ComplianceContext, ComplianceViolationData, ExpectationRule } from '../compliance/types';

const TENANT_ID = 'tenant-test';

class TestPassRule implements ComplianceRule {
  readonly name = 'test-pass';
  readonly framework = 'test';
  async evaluate(_context: ComplianceContext): Promise<ComplianceViolationData[]> {
    return [];
  }
}

class TestFailRule implements ComplianceRule {
  readonly name = 'test-fail';
  readonly framework = 'test';
  async evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]> {
    return [{
      tenantId: context.tenantId,
      ruleName: this.name,
      framework: this.framework,
      eventId: 'evt-1',
      severity: 'high',
      description: 'Test violation',
    }];
  }
}

class TestExpectationFailRule implements ExpectationRule {
  readonly name = 'test-expectation-fail';
  readonly framework = 'test';
  async evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]> {
    return [{
      tenantId: context.tenantId,
      ruleName: this.name,
      framework: this.framework,
      eventId: 'evt-2',
      severity: 'medium',
      description: 'Missing expected event',
    }];
  }
}

describe('ComplianceEngine', () => {
  let engine: ComplianceEngine;
  let registry: ComplianceRuleRegistry;
  let prisma: any;

  beforeEach(async () => {
    const mockClient = {
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'last-evt', sequence: 5 }),
        count: jest.fn().mockResolvedValue(0),
      },
      complianceViolation: {
        create: jest.fn().mockResolvedValue({}),
      },
      complianceExpectationRun: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      forTenant: jest.fn().mockReturnValue(mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceEngine,
        ComplianceRuleRegistry,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    engine = module.get<ComplianceEngine>(ComplianceEngine);
    registry = module.get<ComplianceRuleRegistry>(ComplianceRuleRegistry);
  });

  it('should persist compliance violations for failing rules', async () => {
    registry.register(new TestFailRule());
    registry.register(new TestPassRule());

    const result = await engine.evaluateForTenant(TENANT_ID);

    expect(result.violationsCreated).toBe(1);
  });

  it('should create 0 violations when all rules pass', async () => {
    registry.register(new TestPassRule());

    const result = await engine.evaluateForTenant(TENANT_ID);

    expect(result.violationsCreated).toBe(0);
  });

  it('should evaluate expectation rules', async () => {
    registry.registerExpectation(new TestExpectationFailRule());

    const result = await engine.evaluateForTenant(TENANT_ID);

    expect(result.violationsCreated).toBe(1);
  });

  it('should record a compliance expectation run after evaluation', async () => {
    registry.register(new TestPassRule());

    await engine.evaluateForTenant(TENANT_ID);

    const mockClient = prisma.forTenant();
    expect(mockClient.complianceExpectationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          ruleName: 'compliance-engine-run',
        }),
      }),
    );
  });

  it('should call forTenant with the correct tenantId', async () => {
    registry.register(new TestPassRule());

    await engine.evaluateForTenant(TENANT_ID);

    expect(prisma.forTenant).toHaveBeenCalledWith(TENANT_ID);
  });

  it('should handle rules that throw errors gracefully', async () => {
    const throwingRule: ComplianceRule = {
      name: 'throw-rule',
      framework: 'test',
      async evaluate(_context: ComplianceContext): Promise<ComplianceViolationData[]> {
        throw new Error('Unexpected error');
      },
    };
    registry.register(new TestPassRule());
    registry.register(throwingRule);

    const result = await engine.evaluateForTenant(TENANT_ID);

    expect(result.violationsCreated).toBe(0);
  });
});
