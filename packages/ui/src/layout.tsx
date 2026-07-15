import { LayoutDashboard, Users, Package, ListChecks, TrendingUp, ChevronRight, Bell, HelpCircle, Search, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/inventory', label: 'Global Inventory', icon: Package },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/timeline', label: 'Timeline', icon: TrendingUp },
];

function Sidebar() {
  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-[#E2E8F0] bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-[#E2E8F0] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
          <span className="text-xs font-bold text-white">MC</span>
        </div>
        <div>
          <h1 className="text-[16px] font-semibold leading-tight">Mission Control</h1>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#45464D]">Second Brain v2.4</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm font-medium text-[#45464D] transition-colors hover:bg-[#F0EDEF] hover:text-[#1B1B1D]"
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
        <input
          placeholder="Search clients, tasks, or systems..."
          className="h-9 w-full rounded-[0.25rem] border-0 bg-[#F8FAFC] pl-9 text-sm outline-none ring-1 ring-inset ring-[#E2E8F0] focus:ring-2 focus:ring-[#0F172A]"
        />
      </div>
      <div className="flex items-center gap-2">
        {[Bell, Settings, HelpCircle].map((Icon, i) => (
          <button
            key={i}
            className="flex h-8 w-8 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </header>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
