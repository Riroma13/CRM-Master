import { Parser } from 'expr-eval';

const DANGEROUS_PATTERNS = ['__proto__', 'constructor', 'require', 'eval', 'import', 'function', 'prototype'];

const ALLOWED_CHARS = /^[0-9+\-*/().\s_a-zA-Z]+$/;

export interface KpiEvaluationStrategy {
  readonly name: string;
  evaluate(formula: string, metrics: Record<string, number>): number;
}

export class SafeEvalStrategy implements KpiEvaluationStrategy {
  readonly name = 'safe-eval';

  evaluate(formula: string, metrics: Record<string, number>): number {
    const lower = formula.toLowerCase();
    for (const pattern of DANGEROUS_PATTERNS) {
      if (lower.includes(pattern)) {
        throw new Error(`Blocked: "${pattern}" is not allowed in formulas`);
      }
    }

    if (!ALLOWED_CHARS.test(formula)) {
      throw new Error('Formula contains disallowed characters');
    }

    const parser = new Parser();
    const expression = parser.parse(formula);
    const result = expression.evaluate({ ...metrics });

    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Formula did not produce a finite number');
    }

    return result;
  }
}
