'use client';

import { useState } from 'react';

interface BlockedDatesProps {
  dates: string[];
  onChange: (dates: string[]) => void;
}

export function BlockedDates({ dates, onChange }: BlockedDatesProps) {
  const [newDate, setNewDate] = useState('');

  const addDate = () => {
    if (newDate && !dates.includes(newDate)) {
      onChange([...dates, newDate].sort());
      setNewDate('');
    }
  };

  const removeDate = (date: string) => {
    onChange(dates.filter((d) => d !== date));
  };

  return (
    <div data-testid="blocked-dates">
      <h3 className="mb-3 text-[16px] font-semibold text-[#1B1B1D]">
        Fechas bloqueadas
      </h3>

      {/* Add date */}
      <div className="mb-3 flex items-center gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="flex-1 rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1.5 text-[13px] text-[#1B1B1D]"
        />
        <button
          onClick={addDate}
          disabled={!newDate}
          className="rounded-[0.25rem] bg-[#131B2E] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A] disabled:opacity-50"
        >
          Bloquear
        </button>
      </div>

      {/* Date list */}
      {dates.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[#45464D]">
          No hay fechas bloqueadas. Añade una fecha para bloquear el día completo.
        </p>
      ) : (
        <div className="space-y-1">
          {dates.map((date) => (
            <div
              key={date}
              className="flex items-center justify-between rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2"
            >
              <span className="text-[13px] text-[#1B1B1D]">
                {new Date(date + 'T00:00:00Z').toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <button
                onClick={() => removeDate(date)}
                className="rounded-[0.25rem] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#EF4444] hover:bg-[#FEE2E2]"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
