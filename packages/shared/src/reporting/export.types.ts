import type { ExportFormat } from './reporting.types';

export type { ExportFormat };

export interface ExportContext {
  tenantId: string;
  userId: string;
  format: ExportFormat;
  options?: Record<string, unknown>;
  correlationId?: string;
}

export interface Exporter {
  readonly format: ExportFormat;
  export(data: unknown, context: ExportContext): Promise<Buffer>;
  contentType: string;
}
