import { z } from 'zod';

export const IMPORT_TARGETS = ['clientes-csv-v1'] as const;
export type ImportTarget = (typeof IMPORT_TARGETS)[number];

export interface ClienteCsvRow {
  nombre: string;
  tipoNegocio?: string;
  estadoRelacion: string;
  saludGeneral: string;
  tags: string[];
  created?: string;
}

export interface ClienteCsvImportPayload {
  target: 'clientes-csv-v1';
  rows: ClienteCsvRow[];
  actorId: string;
  organizationId: string;
}

export interface ImportRetentionOptions {
  removeOnComplete: true;
  removeOnFail: { age: number; count: number };
}

export const CLIENTE_CSV_ROW_SCHEMA = z
  .object({
    nombre: z.string().trim().min(1).max(200),
    tipoNegocio: z.string().max(200).optional(),
    estadoRelacion: z.string().min(1).max(100),
    saludGeneral: z.string().min(1).max(100),
    tags: z.array(z.string().max(100)).max(100),
    created: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

export const CLIENTE_CSV_IMPORT_PAYLOAD_SCHEMA = z
  .object({
    target: z.literal('clientes-csv-v1'),
    rows: z.array(CLIENTE_CSV_ROW_SCHEMA).min(1),
    actorId: z.string().min(1),
    organizationId: z.string().min(1),
  })
  .strict();
