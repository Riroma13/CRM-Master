'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@crm-master/ui';
import { api } from '@/lib/api';
import type { SistemaDetail, CreateEventoInput, EventoItem } from '@/lib/api-types';

interface EventoFormProps {
  clienteId: string;
  sistemas: SistemaDetail[];
  onClose: () => void;
  onCreated: (evento: EventoItem) => void;
}

const TIPOS = [
  'cambio', 'incidencia', 'mantenimiento', 'reunion', 'nota', 'alerta',
];

export function EventoForm({ clienteId, sistemas, onClose, onCreated }: EventoFormProps) {
  const [sistemaId, setSistemaId] = useState(sistemas[0]?.id ?? '');
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [siguienteAccion, setSiguienteAccion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    if (!sistemaId) { setError('Selecciona un sistema'); return; }

    setIsSubmitting(true);
    setError('');

    try {
      const payload: CreateEventoInput = {
        sistemaId,
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        siguienteAccion: siguienteAccion.trim() || undefined,
      };
      const evento = await api.post<EventoItem>(
        `/api/v1/admin/clientes/${clienteId}/eventos`,
        payload,
      );
      onCreated(evento);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[0.5rem] bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#1B1B1D]">Nuevo Evento</h3>
          <button onClick={onClose} className="rounded p-1 text-[#45464D] hover:bg-[#F0EDEF]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sistema */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Sistema
            </label>
            <select
              value={sistemaId}
              onChange={(e) => setSistemaId(e.target.value)}
              className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] outline-none focus:border-[#131B2E]"
            >
              {sistemas.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.nombreSistema}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] outline-none focus:border-[#131B2E]"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Título
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Describe el evento..."
              className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] outline-none focus:border-[#131B2E]"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales..."
              className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] outline-none focus:border-[#131B2E] resize-none"
            />
          </div>

          {/* Siguiente acción */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Siguiente Acción
            </label>
            <input
              value={siguienteAccion}
              onChange={(e) => setSiguienteAccion(e.target.value)}
              placeholder="Próximo paso..."
              className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1B1B1D] outline-none focus:border-[#131B2E]"
            />
          </div>

          {error && (
            <p className="text-sm text-[#EF4444]">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="bg-[#0F172A] text-white" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Evento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
