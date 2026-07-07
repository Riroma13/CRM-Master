'use client';

import { useState } from 'react';
import { CitaCard } from './cita-card';
import type { Cita } from '@/lib/api-types';

interface CitaListProps {
  citas: Cita[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

type Tab = 'proximas' | 'historial';

export function CitaList({
  citas,
  isLoading,
  isError,
  error,
  onConfirm,
  onCancel,
}: CitaListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('proximas');

  const filtered =
    activeTab === 'proximas'
      ? citas.filter((c) => c.estado === 'pendiente' || c.estado === 'confirmada')
      : citas.filter((c) => c.estado === 'cancelada' || c.estado === 'completada');

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-[0.375rem] bg-[#F0EDEF] p-1">
        {(['proximas', 'historial'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-[0.25rem] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors ${
              activeTab === tab
                ? 'bg-white text-[#1B1B1D] shadow-sm'
                : 'text-[#45464D] hover:text-[#1B1B1D]'
            }`}
          >
            {tab === 'proximas' ? 'Próximas' : 'Historial'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <p className="py-8 text-center text-[13px] text-[#45464D]">Cargando citas...</p>
      )}
      {isError && (
        <p className="py-8 text-center text-[13px] text-[#EF4444]">
          {error?.message || 'Error al cargar citas'}
        </p>
      )}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="py-8 text-center text-[13px] text-[#45464D]">
          No hay citas {activeTab === 'proximas' ? 'próximas' : 'en el historial'}.
        </p>
      )}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cita) => (
            <CitaCard
              key={cita.id}
              cita={cita}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
