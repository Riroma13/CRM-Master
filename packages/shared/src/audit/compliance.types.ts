import type { AuditEvent } from './audit.types';
import type { RetentionPolicy } from './retention.types';

export type ComplianceFramework = 'gdpr' | 'soc2' | 'iso27001';

export interface ComplianceViolation {
  id: string;
  tenantId: string;
  ruleName: string;
  framework: ComplianceFramework;
  eventId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface ComplianceContext {
  getTenantConfig(tenantId: string): Promise<Record<string, unknown>>;
  queryEvents(query: { tenantId: string; eventType?: string; dateFrom?: string; dateTo?: string }): Promise<AuditEvent[]>;
  getRetentionPolicy(tenantId: string): Promise<RetentionPolicy | null>;
}

export interface ComplianceRule {
  readonly name: string;
  readonly framework: ComplianceFramework;
  evaluate(context: ComplianceContext): Promise<ComplianceViolation[]>;
}

export interface ExpectationRule {
  readonly name: string;
  readonly framework: ComplianceFramework;
  evaluate(context: ComplianceContext): Promise<ComplianceViolation[]>;
}
