import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataRowCell {
  label: string;
  value: ReactNode;
}

interface DataRowProps {
  label: string;
  cells: DataRowCell[];
  href?: string;
  className?: string;
}

export function DataRow({ label, cells, href, className }: DataRowProps) {
  const name = href ? <Link className="font-medium text-[#0F172A] hover:underline" href={href}>{label}</Link> : label;

  return (
    <div className={cn('border-b border-[#E2E8F0] bg-white last:border-b-0', className)} role="row">
      <div className="hidden min-h-14 items-center gap-4 px-4 py-3 md:grid md:grid-cols-[minmax(12rem,2fr)_repeat(auto-fit,minmax(8rem,1fr))]">
        <div role="cell">{name}</div>
        {cells.map((cell) => <div key={cell.label} role="cell">{cell.value}</div>)}
      </div>
      <div className="space-y-3 p-4 md:hidden">
        <div className="text-sm">{name}</div>
        {cells.map((cell) => (
          <div key={cell.label} className="flex items-start justify-between gap-4 text-sm">
            <span className="text-[#45464D]">{cell.label}</span>
            <span className="text-right text-[#1B1B1D]">{cell.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
