export interface RetentionPolicy {
  tenantId: string;
  retentionDays: number;
  archiveAfterDays?: number;
  purgeAfterDays?: number;
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldUntil?: string;
}

export interface AuditExporter {
  readonly format: string;
  export(events: unknown[]): Promise<Buffer | string>;
  contentType: string;
}
