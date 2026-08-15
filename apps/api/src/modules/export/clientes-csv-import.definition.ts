import { z } from 'zod';
import { JobDefinition } from '../jobs/jobs.contracts';
import {
  CLIENTE_CSV_IMPORT_PAYLOAD_SCHEMA,
  CLIENTE_CSV_ROW_SCHEMA,
  ClienteCsvImportPayload,
  ClienteCsvRow,
  ImportRetentionOptions,
} from './import-export.contracts';

export const CLIENTES_CSV_IMPORT_TARGET = 'clientes-csv-v1' as const;
export const CLIENTES_CSV_IMPORT_QUEUE = 'import-export-clientes' as const;
export const DEFAULT_IMPORT_RETENTION: ImportRetentionOptions = {
  removeOnComplete: true,
  removeOnFail: { age: 86_400, count: 100 },
};

export const CLIENTES_CSV_IMPORT_SCHEMA = CLIENTE_CSV_IMPORT_PAYLOAD_SCHEMA;

export function validateClienteCsvRows(rows: unknown[]): ClienteCsvRow[] {
  const parsed = z.array(CLIENTE_CSV_ROW_SCHEMA).min(1).safeParse(rows);
  if (!parsed.success) throw new Error('Invalid cliente CSV row');

  const seen = new Set<string>();
  for (const row of parsed.data) {
    const key = row.nombre.trim().toLocaleLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate nombre: ${row.nombre}`);
    seen.add(key);
  }
  return parsed.data;
}

export const CLIENTES_CSV_IMPORT_DEFINITION: JobDefinition<ClienteCsvImportPayload> = {
  key: CLIENTES_CSV_IMPORT_TARGET,
  queueName: CLIENTES_CSV_IMPORT_QUEUE,
  schema: CLIENTES_CSV_IMPORT_SCHEMA,
  attempts: 1,
  backoff: { type: 'exponential', delay: 1000 },
  concurrency: 1,
  handle: async () => undefined,
};
