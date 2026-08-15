import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { JobsTenantAuthorityService } from '../jobs/jobs-tenant-authority.service';
import { TrustedJobContext } from '../jobs/jobs.contracts';
import {
  CLIENTES_CSV_IMPORT_SCHEMA,
  validateClienteCsvRows,
} from './clientes-csv-import.definition';
import { ClienteCsvImportPayload } from './import-export.contracts';

@Processor('import-export-clientes')
@Injectable()
export class ClientesCsvImportProcessor extends WorkerHost {
  private readonly tenantAuthority: JobsTenantAuthorityService;

  constructor(tenantAuthority: JobsTenantAuthorityService) {
    super();
    this.tenantAuthority = tenantAuthority;
  }

  async process(job: Job<{ context: TrustedJobContext; data: ClienteCsvImportPayload }>) {
    return this.execute(job.data.context, job.data.data);
  }

  async execute(context: TrustedJobContext, payload: unknown): Promise<{ imported: number }> {
    await this.tenantAuthority.assertActiveTenant(context.tenantId);
    const parsed = CLIENTES_CSV_IMPORT_SCHEMA.parse(payload);
    if (context.actorId !== parsed.actorId || context.organizationId !== parsed.organizationId) {
      throw new Error('Trusted job identity mismatch');
    }
    const rows = validateClienteCsvRows(parsed.rows);

    const scoped = this.tenantAuthority.forTenant(context.tenantId) as any;
    const result = await scoped.$transaction(
      async (tx: any) => {
        const existing = await tx.cliente.findMany({
          select: { nombre: true },
        });
        const names = new Set(
          existing.map((item: { nombre: string }) => item.nombre.trim().toLocaleLowerCase()),
        );
        for (const row of rows) {
          const key = row.nombre.trim().toLocaleLowerCase();
          if (names.has(key)) throw new Error(`Duplicate nombre: ${row.nombre}`);
          names.add(key);
        }
        for (const row of rows) {
          await tx.cliente.create({
            data: {
              tenantId: context.tenantId,
              nombre: row.nombre.trim(),
              tipoNegocio: row.tipoNegocio,
              estadoRelacion: row.estadoRelacion,
              saludGeneral: row.saludGeneral,
              tags: row.tags,
            },
          });
        }
        return { imported: rows.length };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return result;
  }
}
