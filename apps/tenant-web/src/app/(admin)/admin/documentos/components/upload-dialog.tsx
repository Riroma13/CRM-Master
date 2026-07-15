'use client';

import { useRef, useState } from 'react';
import { Upload, X, File, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DocumentCategory } from '@/lib/api-types';

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'factura', label: 'Factura' },
  { value: 'informe', label: 'Informe' },
  { value: 'modelo', label: 'Modelo' },
  { value: 'otro', label: 'Otro' },
];

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: File, category: string, description?: string) => Promise<void>;
}

export function UploadDialog({ open, onClose, onUpload }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('otro');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

  const resetForm = () => {
    setSelectedFile(null);
    setCategory('otro');
    setDescription('');
    setState('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_BYTES) {
      return `El archivo excede el tamaño máximo de 50 MB`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setSelectedFile(null);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setState('uploading');
    setErrorMessage('');

    try {
      await onUpload(selectedFile, category, description || undefined);
      setState('success');
      // Auto-close after 2 seconds on success
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error al subir el documento');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
      data-testid="upload-dialog-overlay"
    >
      <div
        className="mx-4 w-full max-w-[480px] rounded-[0.5rem] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
        data-testid="upload-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Subir documento</h2>
          <button
            onClick={handleClose}
            className="rounded-[0.25rem] p-1 text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
            data-testid="upload-dialog-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Drop zone / File input */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? 'border-[#0F172A] bg-[#F0EDEF]'
                : 'border-[#E2E8F0] hover:border-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
            data-testid="upload-dropzone"
          >
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <File className="h-8 w-8 text-[#0F172A]" />
                <div>
                  <p className="text-[13px] font-medium text-[#1B1B1D]">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-[#45464D]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-[#45464D]" />
                <p className="text-[13px] font-medium text-[#1B1B1D]">
                  Arrastra un archivo o haz clic para seleccionar
                </p>
                <p className="mt-1 text-[11px] text-[#45464D]">
                  PDF, DOC, XLS, JPG, PNG — Máx 50 MB
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="upload-file-input"
            />
          </div>

          {/* Validation error */}
          {errorMessage && state !== 'uploading' && (
            <div className="flex items-start gap-2 rounded-[0.25rem] bg-[#FEF2F2] p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
              <p className="text-[13px] text-[#991B1B]">{errorMessage}</p>
            </div>
          )}

          {/* Category selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
              Categoría
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-[0.25rem] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${
                    category === cat.value
                      ? 'bg-[#0F172A] text-white'
                      : 'border border-[#E2E8F0] text-[#45464D] hover:bg-[#F0EDEF]'
                  }`}
                  data-testid={`upload-category-${cat.value}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="upload-description"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D]"
            >
              Descripción <span className="font-normal normal-case text-[#45464D]/60">(opcional)</span>
            </label>
            <textarea
              id="upload-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              className="w-full resize-none rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] placeholder:text-[#45464D]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20 focus-visible:border-[#0F172A]"
              placeholder="Descripción opcional del documento..."
              data-testid="upload-description"
            />
          </div>

          {/* State feedback */}
          {state === 'uploading' && (
            <div className="flex items-center gap-2 rounded-[0.25rem] bg-[#EFF6FF] p-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
              <p className="text-[13px] text-[#1B1B1D]">Subiendo documento...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex items-center gap-2 rounded-[0.25rem] bg-[#D1FAE5] p-3">
              <CheckCircle2 className="h-4 w-4 text-[#065F46]" />
              <p className="text-[13px] text-[#065F46]">Documento subido correctamente</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-2 rounded-[0.25rem] bg-[#FEF2F2] p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
              <p className="text-[13px] text-[#991B1B]">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] px-5 py-4">
          <button
            onClick={handleClose}
            className="rounded-[0.25rem] border border-[#E2E8F0] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || state === 'uploading'}
            className="rounded-[0.25rem] bg-[#0F172A] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90 disabled:opacity-50"
            data-testid="upload-submit"
          >
            {state === 'uploading' ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      </div>
    </div>
  );
}
