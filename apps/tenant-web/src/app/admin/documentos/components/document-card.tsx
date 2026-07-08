'use client';

import { FileText, Share2, Trash2, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DocumentDto } from '@/lib/api-types';

interface DocumentCardProps {
  documento: DocumentDto;
  onShare: (documento: DocumentDto) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  contrato: 'Contrato',
  factura: 'Factura',
  informe: 'Informe',
  modelo: 'Modelo',
  otro: 'Otro',
};

const CATEGORY_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  contrato: 'default',
  factura: 'warning',
  informe: 'secondary',
  modelo: 'success',
  otro: 'outline',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function DocumentCard({ documento, onShare, onDelete }: DocumentCardProps) {
  const categoryLabel = CATEGORY_LABELS[documento.category] ?? documento.category;
  const categoryVariant = CATEGORY_VARIANTS[documento.category] ?? 'outline';

  return (
    <div
      className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4 shadow-ambient transition-shadow hover:shadow-md"
      data-testid={`document-card-${documento.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.375rem] bg-[#F0EDEF]">
          <FileText className="h-5 w-5 text-[#45464D]" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="truncate text-[14px] font-medium text-[#1B1B1D]"
              title={documento.filename}
            >
              {documento.filename}
            </h3>
            <Badge variant={categoryVariant}>{categoryLabel}</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#45464D]">
            <span>{formatBytes(documento.sizeBytes)}</span>
            <span>{formatDate(documento.createdAt)}</span>
            {documento.shareLinks && documento.shareLinks.length > 0 && (
              <span className="text-[#0F172A]">
                {documento.shareLinks.length} enlace{documento.shareLinks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {documento.description && (
            <p className="mt-1.5 truncate text-[12px] text-[#45464D]" title={documento.description}>
              {documento.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2 border-t border-[#E2E8F0] pt-3">
        <a
          href={`/api/v1/tenant/documentos/${documento.id}/download`}
          className="flex items-center gap-1.5 rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
          data-testid={`document-download-${documento.id}`}
        >
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
        <button
          onClick={() => onShare(documento)}
          className="flex items-center gap-1.5 rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
          data-testid={`document-share-${documento.id}`}
        >
          <Share2 className="h-3.5 w-3.5" />
          Compartir
        </button>
        <button
          onClick={() => onDelete(documento.id)}
          className="flex items-center gap-1.5 rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#EF4444] transition-colors hover:bg-[#FEE2E2]"
          data-testid={`document-delete-${documento.id}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
