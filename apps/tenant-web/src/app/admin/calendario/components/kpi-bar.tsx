'use client';

import { cn } from '@/lib/utils';

interface KPIs {
  hoy: number;
  pendientes: number;
  semana: number;
}

interface KpiBarProps {
  kpis: KPIs;
}

const kpiItems: { key: keyof KPIs; label: string; color: string }[] = [
  { key: 'hoy', label: 'Citas hoy', color: 'text-[#131B2E]' },
  { key: 'pendientes', label: 'Pendientes', color: 'text-[#F59E0B]' },
  { key: 'semana', label: 'Esta semana', color: 'text-[#10B981]' },
];

export function KpiBar({ kpis }: KpiBarProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpiItems.map((item) => (
        <div
          key={item.key}
          className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4 shadow-ambient"
        >
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#45464D]">
            {item.label}
          </p>
          <p className={cn('mt-1 text-[30px] font-semibold leading-tight', item.color)}>
            {kpis[item.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
