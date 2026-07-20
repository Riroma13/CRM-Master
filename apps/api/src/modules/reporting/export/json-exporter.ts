import { Injectable } from '@nestjs/common';
import type { Exporter, ExportContext } from '@shared/reporting/export.types';

@Injectable()
export class JsonExporter implements Exporter {
  readonly format = 'json' as const;
  readonly contentType = 'application/json';

  async export(data: unknown, _context: ExportContext): Promise<Buffer> {
    const json = JSON.stringify(data, null, 2);
    return Buffer.from(json, 'utf-8');
  }
}
