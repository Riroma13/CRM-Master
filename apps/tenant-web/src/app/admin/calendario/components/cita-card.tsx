'use client';

import { Badge } from '@/components/ui/badge';
import type { Cita, CitaEstado } from '@/lib/api-types';

const statusConfig: Record<CitaEstado, { label: string; variant: 'warning' | 'success' | 'critical' | 'default' }> = {
  pendiente: { label: 'Pendiente', variant: 'warning' },
  confirmada: { label: 'Confirmada', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'critical' },
  completada: { label: 'Completada', variant: 'default' },
};

interface CitaCardProps {
  cita: Cita;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function CitaCard({ cita, onConfirm, onCancel }: CitaCardProps) {
  const status = statusConfig[cita.estado];
  const date = new Date(cita.fecha);
  const dateStr = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4 shadow-ambient">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold text-[#1B1B1D]">
            {cita.clienteNombre || 'Sin nombre'}
          </h3>
          {cita.clienteEmail && (
            <p className="mt-0.5 text-[13px] text-[#45464D]">{cita.clienteEmail}</p>
          )}
          <p className="mt-2 text-[13px] text-[#45464D]">
            {dateStr} · {timeStr} · {cita.duracion} min
          </p>
          {cita.descripcion && (
            <p className="mt-1 text-[13px] text-[#45464D]">{cita.descripcion}</p>
          )}
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {cita.estado === 'pendiente' && (onConfirm || onCancel) && (
        <div className="mt-3 flex gap-2 border-t border-[#E2E8F0] pt-3">
          {onConfirm && (
            <button
              onClick={() => onConfirm(cita.id)}
              className="rounded-[0.25rem] bg-[#10B981] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#059669]"
            >
              Confirmar
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(cita.id)}
              className="rounded-[0.25rem] border border-[#EF4444] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#EF4444] transition-colors hover:bg-[#FEE2E2]"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
