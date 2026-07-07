'use client';

import type { DaySchedule } from '@/lib/api-types';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ScheduleEditorProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
}

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const addDay = (day: number) => {
    onChange([...schedule, { day, start: '09:00', end: '14:00' }]);
  };

  const addRow = (day: number) => {
    onChange([...schedule, { day, start: '09:00', end: '14:00' }]);
  };

  const removeRow = (index: number) => {
    onChange(schedule.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'start' | 'end', value: string) => {
    onChange(schedule.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const daysWithSchedule = [...new Set(schedule.map((s) => s.day))].sort();

  return (
    <div>
      <h3 className="mb-3 text-[16px] font-semibold text-[#1B1B1D]">
        Horario semanal
      </h3>

      {/* Quick-add day buttons */}
      <div className="mb-3 flex flex-wrap gap-1">
        {DAY_LABELS.map((label, day) =>
          daysWithSchedule.includes(day) ? null : (
            <button
              key={day}
              onClick={() => addDay(day)}
              className="rounded-[0.25rem] border border-[#E2E8F0] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] hover:bg-[#F0EDEF]"
            >
              + {label}
            </button>
          ),
        )}
      </div>

      {daysWithSchedule.map((day) => {
        const dayRows = schedule.filter((s) => s.day === day);
        const firstIndex = schedule.findIndex((s) => s.day === day);

        return (
          <div
            key={day}
            className="mb-3 rounded-[0.5rem] border border-[#E2E8F0] bg-white p-3"
          >
            <p className="mb-2 text-[13px] font-medium text-[#1B1B1D]">
              {DAY_LABELS[day]}
            </p>
            {dayRows.map((row, i) => {
              const idx = firstIndex + i;
              return (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={row.start}
                    onChange={(e) => updateRow(idx, 'start', e.target.value)}
                    className="rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1 text-[13px] text-[#1B1B1D]"
                  />
                  <span className="text-[13px] text-[#45464D]">→</span>
                  <input
                    type="time"
                    value={row.end}
                    onChange={(e) => updateRow(idx, 'end', e.target.value)}
                    className="rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1 text-[13px] text-[#1B1B1D]"
                  />
                  <button
                    onClick={() => removeRow(idx)}
                    className="ml-1 rounded-[0.25rem] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
                    Quitar
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => addRow(day)}
              className="mt-1 rounded-[0.25rem] px-2 py-1 text-[11px] font-medium uppercase tracking-[0.05em] text-[#131B2E] hover:bg-[#DAE2FD]"
            >
              + Añadir horario
            </button>
          </div>
        );
      })}

      {daysWithSchedule.length === 0 && (
        <p className="py-4 text-center text-[13px] text-[#45464D]">
          No hay horarios configurados. Haz clic en un día para añadir horario.
        </p>
      )}
    </div>
  );
}
