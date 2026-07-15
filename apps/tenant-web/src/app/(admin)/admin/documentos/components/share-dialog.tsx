'use client';

import { useState } from 'react';
import { X, Copy, CheckCircle2, AlertCircle, Link } from 'lucide-react';

const EXPIRES_OPTIONS = [
  { value: '1h', label: '1 hora' },
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
];

type ShareState = 'idle' | 'creating' | 'success' | 'error';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  filename: string;
  onCreateLink: (expiresIn: string, maxDownloads?: number) => Promise<{ url: string }>;
}

export function ShareDialog({ open, onClose, filename, onCreateLink }: ShareDialogProps) {
  const [expiresIn, setExpiresIn] = useState('7d');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [state, setState] = useState<ShareState>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setExpiresIn('7d');
    setMaxDownloads('');
    setState('idle');
    setShareUrl('');
    setErrorMessage('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    setState('creating');
    setErrorMessage('');

    try {
      const parsedMaxDownloads = maxDownloads ? parseInt(maxDownloads, 10) : undefined;
      const link = await onCreateLink(expiresIn, parsedMaxDownloads);
      setShareUrl(link.url);
      setState('success');
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error al generar el enlace');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.querySelector<HTMLInputElement>('[data-testid="share-url-input"]');
      input?.select();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
      data-testid="share-dialog-overlay"
    >
      <div
        className="mx-4 w-full max-w-[480px] rounded-[0.5rem] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
        data-testid="share-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Compartir documento</h2>
            <p className="mt-0.5 text-[13px] text-[#45464D] truncate max-w-[360px]">{filename}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-[0.25rem] p-1 text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
            data-testid="share-dialog-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {state !== 'success' ? (
          <div className="space-y-4 px-5 py-4">
            {/* Expiration */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
                Expiración
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRES_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiresIn(opt.value)}
                    className={`rounded-[0.25rem] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${
                      expiresIn === opt.value
                        ? 'bg-[#0F172A] text-white'
                        : 'border border-[#E2E8F0] text-[#45464D] hover:bg-[#F0EDEF]'
                    }`}
                    data-testid={`share-expires-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max downloads */}
            <div>
              <label
                htmlFor="share-max-downloads"
                className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D]"
              >
                Descargas máximas{' '}
                <span className="font-normal normal-case text-[#45464D]/60">(opcional)</span>
              </label>
              <input
                id="share-max-downloads"
                type="number"
                min={1}
                max={100}
                value={maxDownloads}
                onChange={(e) => setMaxDownloads(e.target.value)}
                placeholder="Sin límite"
                className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] placeholder:text-[#45464D]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20 focus-visible:border-[#0F172A]"
                data-testid="share-max-downloads"
              />
            </div>

            {/* Error */}
            {state === 'error' && (
              <div className="flex items-start gap-2 rounded-[0.25rem] bg-[#FEF2F2] p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
                <p className="text-[13px] text-[#991B1B]">{errorMessage}</p>
              </div>
            )}
          </div>
        ) : (
          /* Success — show link */
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-2 rounded-[0.25rem] bg-[#D1FAE5] p-3">
              <CheckCircle2 className="h-4 w-4 text-[#065F46]" />
              <p className="text-[13px] text-[#065F46]">Enlace generado correctamente</p>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
                URL de descarga
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-[0.25rem] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#1B1B1D]"
                  data-testid="share-url-input"
                />
                <button
                  onClick={handleCopyUrl}
                  className="rounded-[0.25rem] bg-[#0F172A] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90"
                  data-testid="share-copy-url"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="mt-1 text-[11px] text-[#065F46]">Copiado al portapapeles</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] px-5 py-4">
          {state === 'success' ? (
            <button
              onClick={handleClose}
              className="rounded-[0.25rem] bg-[#0F172A] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="rounded-[0.25rem] border border-[#E2E8F0] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] transition-colors hover:bg-[#F0EDEF]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={state === 'creating'}
                className="rounded-[0.25rem] bg-[#0F172A] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A]/90 disabled:opacity-50"
                data-testid="share-create"
              >
                {state === 'creating' ? 'Generando...' : 'Generar enlace'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
