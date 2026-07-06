'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TabDef {
  key: string;
  label: string;
}

const tabs: TabDef[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'sistemas', label: 'Sistemas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'bitacora', label: 'Bitácora' },
  { key: 'tareas', label: 'Tareas' },
];

export function ClientTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'resumen';

  return (
    <nav className="flex border-b border-[#E2E8F0]" role="tablist">
      {tabs.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab.key);
        const href = `${pathname}?${params.toString()}`;
        const isActive = activeTab === tab.key;

        return (
          <Link
            key={tab.key}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'rounded-none border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] transition-colors',
              isActive
                ? 'border-[#0F172A] text-[#1B1B1D]'
                : 'border-transparent text-[#45464D] hover:text-[#1B1B1D]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
