'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Calendar, FileText, LayoutDashboard, Users, ClipboardList, Settings, HardDrive } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/documentos', label: 'Documentos', icon: FileText },
  { href: '/admin/tareas', label: 'Tareas', icon: ClipboardList },
  { href: '/admin/calendario', label: 'Calendario', icon: Calendar },
  { href: '/admin/sistemas', label: 'Sistemas', icon: HardDrive },
  { href: '/admin/perfil', label: 'Perfil', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[#E2E8F0] bg-white" data-testid="sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-[#E2E8F0] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
          <span className="text-xs font-bold text-white">T</span>
        </div>
        <div>
          <h1 className="text-[16px] font-semibold leading-tight">Mi Portal</h1>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#45464D]">
            Panel de gestión
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
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
        })}
      </nav>
    </aside>
  );
}
