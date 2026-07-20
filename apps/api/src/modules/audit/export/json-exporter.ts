import { Injectable } from '@nestjs/common';
import { AuditExporter } from './export.service';

@Injectable()
export class JsonExporter implements AuditExporter {
  readonly format = 'json';
  contentType = 'application/json';

  export(events: any[]): string {
    return JSON.stringify(events, null, 2);
  }
}
