import { Injectable } from '@nestjs/common';
import { AuditExporter } from './export.service';

@Injectable()
export class CsvExporter implements AuditExporter {
  readonly format = 'csv';
  contentType = 'text/csv';

  private readonly HEADERS = [
    'id', 'tenantId', 'sequence', 'actorType', 'actorId', 'actorName',
    'resourceType', 'resourceId', 'resourceName', 'action', 'outcome',
    'ipAddress', 'userAgent', 'correlationId', 'occurredAt', 'receivedAt',
    'hash', 'prevHash', 'legalHold', 'legalHoldUntil', 'metadata',
  ];

  export(events: any[]): string {
    const rows = events.map((e) =>
      this.HEADERS.map((h) => this.escapeField(this.getField(e, h))).join(','),
    );
    return [this.HEADERS.join(','), ...rows].join('\n');
  }

  private getField(event: any, field: string): string {
    if (field === 'metadata') {
      return JSON.stringify(event.metadata ?? {});
    }
    const val = event[field];
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return val.toISOString();
    return String(val);
  }

  private escapeField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
