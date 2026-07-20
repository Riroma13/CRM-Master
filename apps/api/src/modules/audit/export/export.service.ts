import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { JsonExporter } from './json-exporter';
import { CsvExporter } from './csv-exporter';

export interface AuditExporter {
  readonly format: string;
  contentType: string;
  export(events: any[]): string;
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  actorType?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  outcome?: string;
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly exporters: Map<string, AuditExporter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    jsonExporter: JsonExporter,
    csvExporter: CsvExporter,
  ) {
    this.exporters.set(jsonExporter.format, jsonExporter);
    this.exporters.set(csvExporter.format, csvExporter);
  }

  async exportEvents(
    tenantId: string,
    format: string,
    filters: ExportFilters = {},
  ): Promise<{ data: string; contentType: string }> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new BadRequestException(`Unsupported export format: ${format}. Supported: ${Array.from(this.exporters.keys()).join(', ')}`);
    }

    const where: any = { tenantId };

    if (filters.dateFrom || filters.dateTo) {
      where.occurredAt = {};
      if (filters.dateFrom) where.occurredAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.occurredAt.lte = new Date(filters.dateTo);
    }
    if (filters.actorType) where.actorType = filters.actorType;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.action) where.action = filters.action;
    if (filters.outcome) where.outcome = filters.outcome;

    const client = this.prisma.forTenant(tenantId);
    const events = await client.auditEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { sequence: 'desc' }],
    });

    const data = exporter.export(events);
    return { data, contentType: exporter.contentType };
  }
}
