import { z } from 'zod';

export const DOCUMENT_CATEGORIES = [
  'contrato',
  'factura',
  'informe',
  'modelo',
  'otro',
] as const;

export const UploadDocumentSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES).default('otro'),
  description: z.string().max(1000).optional(),
  clienteId: z.string().uuid().optional(),
});

export const CreateShareLinkSchema = z.object({
  expiresIn: z.string().regex(/^\d+[dhms]$/, 'Formato: 7d, 24h, 60m, 30s'),
  maxDownloads: z.number().int().positive().max(100).optional(),
});

export interface DocumentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  description?: string;
  storageKey: string;
  createdAt: string;
  shareLinks?: ShareLinkDto[];
}

export interface ShareLinkDto {
  id: string;
  token: string;
  url: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  createdAt: string;
}
