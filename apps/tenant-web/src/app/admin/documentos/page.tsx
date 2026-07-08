'use client';

import { useState } from 'react';
import { Upload, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { useDocumentos } from '@/hooks/use-documentos';
import { DocumentCard } from './components/document-card';
import { UploadDialog } from './components/upload-dialog';
import { ShareDialog } from './components/share-dialog';
import type { DocumentDto } from '@/lib/api-types';

export default function AdminDocumentosPage() {
  const {
    documentos,
    isLoading,
    isError,
    error,
    refetch,
    uploadDocumento,
    deleteDocumento,
    createShareLink,
  } = useDocumentos();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareDocumento, setShareDocumento] = useState<DocumentDto | null>(null);

  const handleUpload = async (file: File, category: string, description?: string) => {
    await uploadDocumento(file, category, description);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este documento?')) return;
    await deleteDocumento(id);
  };

  const handleCreateShareLink = async (expiresIn: string, maxDownloads?: number) => {
    if (!shareDocumento) throw new Error('No hay documento seleccionado');
    return createShareLink(shareDocumento.id, expiresIn, maxDownloads);
  };

  return (
    <div className="space-y-6" data-testid="admin-documentos-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Documentos</h1>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] hover:bg-[#F0EDEF]"
            data-testid="documentos-refresh"
          >
            <RefreshCw className="mr-1.5 inline-block h-3.5 w-3.5" />
            Refrescar
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-[0.25rem] bg-[#0F172A] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90"
            data-testid="documentos-upload-btn"
          >
            <Upload className="mr-1.5 inline-block h-3.5 w-3.5" />
            Subir documento
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="documentos-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4 shadow-ambient"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-[0.375rem] bg-[#F0EDEF]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-[#F0EDEF]" />
                  <div className="h-3 w-1/2 rounded bg-[#F0EDEF]" />
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-[#E2E8F0] pt-3">
                <div className="h-7 w-20 rounded bg-[#F0EDEF]" />
                <div className="h-7 w-20 rounded bg-[#F0EDEF]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border border-[#E2E8F0] bg-white p-12 shadow-ambient">
          <AlertCircle className="mb-3 h-10 w-10 text-[#EF4444]" />
          <p className="mb-1 text-[14px] font-medium text-[#1B1B1D]">
            Error al cargar documentos
          </p>
          <p className="mb-4 text-[13px] text-[#45464D]">
            {error?.message || 'No se pudieron cargar los documentos. Intenta de nuevo.'}
          </p>
          <button
            onClick={refetch}
            className="rounded-[0.25rem] bg-[#0F172A] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && documentos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border border-[#E2E8F0] bg-white p-12 shadow-ambient" data-testid="documentos-empty">
          <FileText className="mb-3 h-10 w-10 text-[#45464D]" />
          <p className="mb-1 text-[14px] font-medium text-[#1B1B1D]">
            No hay documentos
          </p>
          <p className="mb-4 text-[13px] text-[#45464D]">
            Sube tu primer documento para empezar.
          </p>
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-[0.25rem] bg-[#0F172A] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90"
          >
            Subir documento
          </button>
        </div>
      )}

      {/* Document grid */}
      {!isLoading && !isError && documentos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="documentos-grid">
          {documentos.map((doc) => (
            <DocumentCard
              key={doc.id}
              documento={doc}
              onShare={setShareDocumento}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <ShareDialog
        open={shareDocumento !== null}
        onClose={() => setShareDocumento(null)}
        filename={shareDocumento?.filename ?? ''}
        onCreateLink={handleCreateShareLink}
      />
    </div>
  );
}
