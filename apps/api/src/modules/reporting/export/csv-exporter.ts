import { Injectable } from '@nestjs/common';
import type { Exporter, ExportContext } from '@shared/reporting/export.types';

@Injectable()
export class CsvExporter implements Exporter {
  readonly format = 'csv' as const;
  readonly contentType = 'text/csv';

  async export(data: unknown, _context: ExportContext): Promise<Buffer> {
    const rows = this.toArray(data);
    if (rows.length === 0) {
      return Buffer.from('', 'utf-8');
    }

    const headers = this.extractHeaders(rows);
    const csvLines: string[] = [];
    csvLines.push(this.escapeRow(headers));

    for (const row of rows) {
      const values = headers.map((h) => {
        const val = this.getNestedValue(row, h);
        return this.escapeField(val);
      });
      csvLines.push(values.join(','));
    }

    return Buffer.from(csvLines.join('\n'), 'utf-8');
  }

  private toArray(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      const arr = (data as any).rows ?? (data as any).data ?? (data as any).records;
      if (Array.isArray(arr)) return arr;
    }
    return [];
  }

  private extractHeaders(rows: Record<string, unknown>[]): string[] {
    const headerSet = new Set<string>();
    for (const row of rows) {
      Object.keys(row).forEach((k) => headerSet.add(k));
    }
    return Array.from(headerSet);
  }

  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((acc, part) => {
      if (acc != null && typeof acc === 'object') return acc[part];
      return undefined;
    }, obj);
  }

  private escapeField(value: unknown): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private escapeRow(values: string[]): string {
    return values
      .map((v) => {
        if (v.includes(',') || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      })
      .join(',');
  }
}
