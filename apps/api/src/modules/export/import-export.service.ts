import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JobsClientService, JobsInfrastructureError } from '../jobs/jobs-client.service';
import { CLIENTES_CSV_IMPORT_DEFINITION } from './clientes-csv-import.definition';
import { ClienteCsvRow } from './import-export.contracts';

export const REQUIRED_CLIENTES_CSV_HEADERS = [
  'nombre',
  'tipo_negocio',
  'estado_relacion',
  'salud',
  'tags',
  'creado',
] as const;

const FORMULA_PREFIX = /^[=+\-@]/;

export function neutralizeCsvCell(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function quoteCsvCell(value: string): string {
  return `"${neutralizeCsvCell(value).replace(/"/g, '""')}"`;
}

export function buildClientesCsv(
  clientes: Array<{
    nombre: string;
    tipoNegocio?: string | null;
    estadoRelacion: string;
    saludGeneral: string;
    tags?: string[] | null;
    createdAt: Date;
  }>,
): string {
  const header = REQUIRED_CLIENTES_CSV_HEADERS.join(',');
  const rows = clientes.map((cliente) =>
    [
      cliente.nombre,
      cliente.tipoNegocio ?? '',
      cliente.estadoRelacion,
      cliente.saludGeneral,
      (cliente.tags ?? []).join('; '),
      cliente.createdAt.toISOString().slice(0, 10),
    ]
      .map(quoteCsvCell)
      .join(','),
  );
  return [header, ...rows].join('\r\n') + '\r\n';
}

function parseRfc4180(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        cell += char;
      }
    } else if (closedQuote) {
      if (char === ',') {
        row.push(cell);
        cell = '';
        closedQuote = false;
      } else if (char === '\r' && text[index + 1] === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        closedQuote = false;
        index++;
      } else {
        throw new BadRequestException('Invalid RFC-4180 quoted field');
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === '"') {
      throw new BadRequestException('Invalid RFC-4180 quoted field');
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\r' && text[index + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      index++;
    } else if (char === '\n' || char === '\r') {
      throw new BadRequestException('Invalid RFC-4180 line ending');
    } else {
      cell += char;
    }
  }
  if (quoted) throw new BadRequestException('Invalid RFC-4180 quoted field');
  if (cell.length > 0 || row.length > 0 || closedQuote) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseClientesCsv(buffer: Buffer): ClienteCsvRow[] {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new BadRequestException('CSV must be valid UTF-8');
  }
  if (buffer.byteLength > Number(process.env.IMPORT_CLIENTES_MAX_BYTES ?? 5 * 1024 * 1024)) {
    throw new BadRequestException('CSV exceeds byte limit');
  }
  const rows = parseRfc4180(text);
  if (rows.length < 2 || rows[0].join(',') !== REQUIRED_CLIENTES_CSV_HEADERS.join(',')) {
    throw new BadRequestException('Invalid clientes-csv-v1 header');
  }
  const maxRows = Number(process.env.IMPORT_CLIENTES_MAX_ROWS ?? 10_000);
  if (rows.length - 1 > maxRows) throw new BadRequestException('CSV exceeds row limit');
  return rows.slice(1).map((values) => {
    if (values.length !== REQUIRED_CLIENTES_CSV_HEADERS.length) {
      throw new BadRequestException('Invalid clientes-csv-v1 row');
    }
    const [nombre, tipoNegocio, estadoRelacion, saludGeneral, tags, created] = values;
    return {
      nombre,
      tipoNegocio: tipoNegocio || undefined,
      estadoRelacion,
      saludGeneral,
      tags: tags
        ? tags
            .split(';')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      created: created || undefined,
    };
  });
}

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsClientService,
    private readonly audit: AuditService,
  ) {}

  async exportClientesCsv(
    tenantId: string,
    actorId: string,
    organizationId: string,
    res: Response,
  ) {
    const client = this.prisma.forTenant(tenantId) as any;
    const clientes = await client.cliente.findMany({
      orderBy: { nombre: 'asc' },
    });
    const csv = buildClientesCsv(clientes);
    await this.audit.requiredLog({
      tenantId,
      actorId,
      organizationId,
      action: 'export',
      resource: 'configuration',
      outcome: 'success',
      correlationId: randomUUID(),
      metadata: { target: 'clientes-csv-v1' },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  async exportAllJson(tenantId: string, actorId: string, organizationId: string, res: Response) {
    const client = this.prisma.forTenant(tenantId) as any;
    const [clientes, tareas, citas, documentos, incidencias, sistemas] = await Promise.all([
      client.cliente.findMany(),
      client.tarea.findMany(),
      client.cita.findMany(),
      client.documento.findMany({
        where: { isDeleted: false },
        select: { id: true, filename: true, category: true, createdAt: true },
      }),
      client.incidencia.findMany(),
      client.sistema.findMany(),
    ]);
    await this.audit.requiredLog({
      tenantId,
      actorId,
      organizationId,
      action: 'export',
      resource: 'configuration',
      outcome: 'success',
      correlationId: randomUUID(),
      metadata: { target: 'all-json' },
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="datos-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.json({
      exportedAt: new Date().toISOString(),
      clientes,
      tareas,
      citas,
      documentos,
      incidencias,
      sistemas,
    });
  }

  async enqueueClientesCsvImport(
    tenantId: string,
    actorId: string,
    organizationId: string,
    idempotencyKey: string,
    file: Buffer,
  ) {
    if (!idempotencyKey) throw new BadRequestException('Idempotency-Key required');
    const rows = parseClientesCsv(file);
    const target = { target: 'clientes-csv-v1' as const, rows, actorId, organizationId };
    try {
      const correlationId = randomUUID();
      const job = await this.jobs.enqueue(
        CLIENTES_CSV_IMPORT_DEFINITION,
        { tenantId, actorId, organizationId, idempotencyKey, correlationId },
        target,
        { removeOnComplete: true, removeOnFail: { age: 86_400, count: 100 } },
      );
      return { jobId: job.id, correlationId, target: 'clientes-csv-v1' as const };
    } catch (error) {
      if (error instanceof JobsInfrastructureError) {
        throw new ServiceUnavailableException('IMPORT_JOBS_UNAVAILABLE');
      }
      throw error;
    } finally {
      file.fill(0);
    }
  }
}
