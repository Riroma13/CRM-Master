'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useModules } from '@/hooks/use-modules';
import {
  Calendar, FileText, LayoutDashboard, Users,
  ClipboardList, Settings, HardDrive, Briefcase, ToggleLeft, Bell, AlertTriangle, Rocket, History, TrendingUp, BarChart, Wallet, Webhook, FileDigit, Mail, Zap, CreditCard, Star, BookOpen,
} from 'lucide-react';

const MODULE_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  clientes: Users,
  pipeline: TrendingUp,
  reportes: BarChart,
  presupuestos: Wallet,
  webhooks: Webhook,
  plantillas: FileDigit,
  email: Mail,
  automations: Zap,
  pagos: CreditCard,
  calendar: Calendar,
  encuestas: Star,
  planes: CreditCard,
  calendarioAcademico: BookOpen,
  preferencias: Bell,
  documentos: FileText,
  tareas: ClipboardList,
  calendario: Calendar,
  recursos: Briefcase,
  sistemas: HardDrive,
  notificaciones: Bell,
  incidencias: AlertTriangle,
  perfil: Settings,
};

const MODULE_HREF: Record<string, string> = {
  dashboard: '/admin',
  clientes: '/admin/clientes',
  pipeline: '/admin/pipeline',
  reportes: '/admin/reportes',
  presupuestos: '/admin/presupuestos',
  webhooks: '/admin/webhooks',
  plantillas: '/admin/plantillas',
  email: '/admin/email',
  automations: '/admin/automations',
  pagos: '/admin/pagos',
  calendar: '/admin/calendar-sync',
  encuestas: '/admin/encuestas',
  planes: '/admin/planes',
  calendarioAcademico: '/admin/calendario-academico',
  preferencias: '/admin/preferencias',
  documentos: '/admin/documentos',
  tareas: '/admin/tareas',
  calendario: '/admin/calendario',
  recursos: '/admin/recursos',
  sistemas: '/admin/sistemas',
  notificaciones: '/admin/notificaciones',
  incidencias: '/admin/incidencias',
  perfil: '/admin/perfil',
};

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

  const visibleModules = Object.entries(MODULE_HREF).filter(([id]) => isEnabled(id));

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
        {visibleModules.map(([id, href]) => {
          const Icon = MODULE_ICONS[id];
          const label = id.charAt(0).toUpperCase() + id.slice(1);
          const isActive =
            pathname === href || (href !== '/admin' && pathname.startsWith(href));

          return (
            <Link
              key={id}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#DAE2FD] text-[#0F172A]'
                  : 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{label}</span>
            </Link>
          );
        })}
        {/* Onboarding — always visible */}
        <Link
          href="/admin/onboarding"
          className={cn(
            'flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/admin/onboarding'
              ? 'bg-[#DAE2FD] text-[#0F172A]'
              : 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
          )}
        >
          <Rocket className="h-4 w-4" />
          <span>Onboarding</span>
        </Link>

        {/* Módulos — always visible */}
        <Link
          href="/admin/audit"
          className={cn(
            'flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/admin/audit'
              ? 'bg-[#DAE2FD] text-[#0F172A]'
              : 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
          )}
        >
          <History className="h-4 w-4" />
          <span>Auditoría</span>
        </Link>

        <Link
          href="/admin/modules"
          className={cn(
            'flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium transition-colors mt-4 border-t border-[#E2E8F0] pt-4',
            pathname === '/admin/modules'
              ? 'bg-[#DAE2FD] text-[#0F172A]'
              : 'text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]',
          )}
        >
          <ToggleLeft className="h-4 w-4" />
          <span>Módulos</span>
        </Link>
      </nav>
    </aside>
  );
}
