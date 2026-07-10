'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronRight, Search, ArrowRight } from 'lucide-react';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null!);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const token = sessionStorage.getItem('crm_session_token') || localStorage.getItem('crm_session_token');
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setOpen(true);
        }
      } catch {}
    }, 300);
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar..."
        className="w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white py-1.5 pl-9 pr-3 text-[13px] text-[#1B1B1D] outline-none focus:border-[#131B2E]"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-[0.5rem] border border-[#E2E8F0] bg-white shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}-${i}`}
              onClick={() => { router.push(r.link); setOpen(false); setQuery(''); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F8FAFC] border-b border-[#E2E8F0] last:border-0"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] w-20 shrink-0">{r.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1B1B1D] truncate">{r.title}</p>
                {r.subtitle && <p className="text-[11px] text-[#45464D] truncate">{r.subtitle}</p>}
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-[#45464D] shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import { Sidebar } from './sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ToastProvider } from '@/components/ui/toast';

const BREADCRUMB_LABELS: Record<string, string> = {
  admin: 'Dashboard',
  clientes: 'Clientes',
  pipeline: 'Pipeline',
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

        {/* Desktop top bar */}
        <div className="hidden md:flex md:absolute md:right-6 md:top-4 md:z-10 md:items-center md:gap-3">
          <GlobalSearch />
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
