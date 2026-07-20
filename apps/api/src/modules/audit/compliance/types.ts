export interface ComplianceContext {
  tenantId: string;
  queryEvents(query: {
    tenantId: string;
    actorType?: string;
    actorId?: string;
    action?: string;
    outcome?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any[]>;
}

export interface ComplianceRule {
  readonly name: string;
  readonly framework: string;
  evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]>;
}

export interface ExpectationRule {
  readonly name: string;
  readonly framework: string;
  evaluate(context: ComplianceContext): Promise<ComplianceViolationData[]>;
}

export interface ComplianceViolationData {
  tenantId: string;
  ruleName: string;
  framework: string;
  eventId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}
