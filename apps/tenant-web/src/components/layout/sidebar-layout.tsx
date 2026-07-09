'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Sidebar } from './sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ToastProvider } from '@/components/ui/toast';

const BREADCRUMB_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  clientes: 'Clientes',
  documentos: 'Documentos',
  tareas: 'Tareas',
  calendario: 'Calendario',
  sistemas: 'Sistemas',
  perfil: 'Perfil',
};

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = BREADCRUMB_LABELS[seg] ?? seg;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-[#45464D] mb-4" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-[#C6C6CD]" />}
          {c.isLast ? (
            <span className="font-medium text-[#1B1B1D]">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-[#1B1B1D] transition-colors">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth guard: redirect to /login if no session token
  useEffect(() => {
    try {
      const token = sessionStorage.getItem('crm_session_token') || localStorage.getItem('crm_session_token');
      if (!token) router.replace('/login');
    } catch {
      // sessionStorage unavailable — SSR/test
    }
  }, [router]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with hamburger + notifications */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              className="rounded-[0.25rem] p-1.5 text-[#45464D] hover:bg-[#F0EDEF]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[15px] font-semibold text-[#1B1B1D]">Mi Portal</span>
          </div>
          <NotificationBell />
        </div>

        {/* Desktop notification bell — fixed position */}
        <div className="hidden md:flex md:absolute md:right-6 md:top-4 md:z-10">
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-6">
            <Breadcrumbs pathname={pathname} />
            <ToastProvider>{children}</ToastProvider>
          </div>
        </main>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          data-testid="drawer-overlay"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-over drawer */}
      <div
        className={
          'fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out md:hidden ' +
          (drawerOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        {/* Close button inside drawer */}
        <div className="absolute right-3 top-3 z-10">
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-[0.25rem] p-1.5 text-[#45464D] hover:bg-[#F0EDEF]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
