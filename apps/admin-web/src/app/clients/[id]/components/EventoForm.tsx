'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import type { ClienteDetail, CreateEventoInput } from '@/lib/api-types';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface EventoFormProps {
  clienteId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const tiposEvento = [
  'Decisión',
  'Incidencia',
  'Revisión',
  'Configuración',
];

export function EventoForm({ clienteId, onClose, onSuccess }: EventoFormProps) {
  const [sistemas, setSistemas] = useState<ClienteDetail['sistemas']>([]);
  const [loadingSistemas, setLoadingSistemas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [sistemaId, setSistemaId] = useState('');
  const [tipo, setTipo] = useState(tiposEvento[0]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [siguienteAccion, setSiguienteAccion] = useState('');

  // Load sistemas for the select
  useEffect(() => {
    api
      .get<ClienteDetail>(`/api/v1/admin/clientes/${clienteId}`)
      .then((data) => {
        setSistemas(data.sistemas);
        if (data.sistemas.length > 0) {
          setSistemaId(data.sistemas[0].id);
        }
      })
      .catch(() => setError('Error al cargar sistemas'))
      .finally(() => setLoadingSistemas(false));
  }, [clienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!titulo.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateEventoInput = {
        sistemaId,
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        siguienteAccion: siguienteAccion.trim() || undefined,
      };

      await api.post(`/api/v1/admin/clientes/${clienteId}/eventos`, payload);
      setSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          typeof err.body === 'object' &&
            err.body !== null &&
            'message' in err.body
            ? String((err.body as { message: string }).message)
            : `Error ${err.status}: no se pudo crear el evento.`,
        );
      } else {
        setError('Error de red. Intente nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Evento</DialogTitle>
          <DialogDescription>
            Registre un nuevo evento en la bitácora del cliente.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
            <p className="text-sm font-medium text-[#1B1B1D]">
              Evento creado correctamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sistema selector */}
            <div className="space-y-1.5">
              <Label htmlFor="sistema">Sistema</Label>
              {loadingSistemas ? (
                <div className="flex items-center gap-2 text-sm text-[#45464D]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando sistemas...
                </div>
              ) : (
                <select
                  id="sistema"
                  value={sistemaId}
                  onChange={(e) => setSistemaId(e.target.value)}
                  required
                  className="h-9 w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 text-sm text-[#1B1B1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
                >
                  {sistemas.length === 0 && (
                    <option value="">Sin sistemas disponibles</option>
                  )}
                  {sistemas.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.nombreSistema}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
                className="h-9 w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 text-sm text-[#1B1B1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
              >
                {tiposEvento.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Migrar a PostgreSQL 16"
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles del evento..."
                rows={3}
                className="flex w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] placeholder:text-[#45464D]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
              />
            </div>

            {/* Siguiente acción */}
            <div className="space-y-1.5">
              <Label htmlFor="siguienteAccion">Próximo paso</Label>
              <textarea
                id="siguienteAccion"
                value={siguienteAccion}
                onChange={(e) => setSiguienteAccion(e.target.value)}
                placeholder="Ej: Programar ventana de mantenimiento"
                rows={2}
                className="flex w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] placeholder:text-[#45464D]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-[0.25rem] bg-[#FEE2E2] p-3 text-sm text-[#991B1B]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || loadingSistemas}
                className="gap-1.5"
              >
                {submitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {submitting ? 'Guardando...' : 'Crear Evento'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
