import type { V1DocumentResponse } from '@shared/public-api';

export interface InternalDocument {
  documentId?: string;
  id?: string;
  name?: string;
  title?: string;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
}

function toISO(value: Date | string | undefined | null, fallback: Date = new Date()): string {
  const resolved = value ?? fallback;
  if (typeof resolved === 'string') return resolved;
  return resolved.toISOString();
}

export function toV1(document: InternalDocument): V1DocumentResponse {
  return {
    id: document.id ?? document.documentId ?? 'unknown',
    title: document.title ?? document.name ?? 'Untitled',
    status: document.status,
    createdAt: toISO(document.createdAt),
    updatedAt: toISO(document.updatedAt),
  };
}
