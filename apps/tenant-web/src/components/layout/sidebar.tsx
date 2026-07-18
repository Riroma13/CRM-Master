'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useModules } from '@/hooks/use-modules';
import { navigationRegistry } from '@/config/navigation';
import type { NavItem } from '@/config/navigation';

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      key={item.id}
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[#DAE2FD] text-[#0F172A]'
          : 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isEnabled } = useModules();
  const [tenantName, setTenantName] = useState('');
  const [tenantLogo, setTenantLogo] = useState('');

  useEffect(() => {
    api.get<{ name: string; logo?: string }>('/api/v1/tenant/profile', undefined, { auth: true })
      .then((d) => { setTenantName(d.name); setTenantLogo(d.logo || ''); })
      .catch(() => {});
  }, []);

  const visibleItems = navigationRegistry.getVisible(isEnabled);

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[#E2E8F0] bg-white" data-testid="sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-[#E2E8F0] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#0F172A] overflow-hidden">
          {tenantLogo ? (
            <img src={tenantLogo} alt={tenantName} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs font-bold text-white">{tenantName.charAt(0) || 'T'}</span>
          )}
        </div>
        <div>
          <h1 className="text-[16px] font-semibold leading-tight truncate max-w-[160px]">{tenantName || 'Mi Portal'}</h1>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#45464D]">
            Panel de gestión
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <div key={item.id}>
              {item.separator && (
                <div className="mt-4 border-t border-[#E2E8F0] pt-4" />
              )}
              <NavLink item={item} isActive={isActive} />
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
