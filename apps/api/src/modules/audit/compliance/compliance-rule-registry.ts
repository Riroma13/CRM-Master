import { Injectable } from '@nestjs/common';
import { ComplianceRule, ExpectationRule } from './types';

@Injectable()
export class ComplianceRuleRegistry {
  private readonly rules: ComplianceRule[] = [];
  private readonly expectationRules: ExpectationRule[] = [];

  register(rule: ComplianceRule): void {
    this.rules.push(rule);
  }

  registerExpectation(rule: ExpectationRule): void {
    this.expectationRules.push(rule);
  }

  getAll(): ComplianceRule[] {
    return [...this.rules];
  }

  getAllExpectations(): ExpectationRule[] {
    return [...this.expectationRules];
  }

  getByFramework(framework: string): ComplianceRule[] {
    return this.rules.filter(r => r.framework === framework);
  }
}
