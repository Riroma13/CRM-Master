import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './sidebar';

vi.mock('@/lib/api', () => ({
  api: { get: () => Promise.resolve({ name: 'Demo Test', logo: '' }) },
}));

vi.mock('@/hooks/use-modules', () => ({
  useModules: () => ({
    isEnabled: (id: string) =>
      ['dashboard', 'clientes', 'documentos', 'tareas', 'calendario', 'recursos', 'sistemas', 'notificaciones', 'perfil'].includes(id),
    available: [],
    enabled: ['dashboard', 'clientes', 'documentos', 'tareas', 'calendario', 'recursos', 'sistemas', 'notificaciones', 'perfil'],
    isLoading: false,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/calendario',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="icon-calendar">Cal</span>,
  FileText: () => <span data-testid="icon-filetext">Ft</span>,
  LayoutDashboard: () => <span data-testid="icon-dashboard">Db</span>,
  Users: () => <span data-testid="icon-users">Us</span>,
  ClipboardList: () => <span data-testid="icon-tasks">Tk</span>,
  Settings: () => <span data-testid="icon-settings">St</span>,
  HardDrive: () => <span data-testid="icon-harddrive">Hd</span>,
  Briefcase: () => <span data-testid="icon-briefcase">Bc</span>,
  ToggleLeft: () => <span data-testid="icon-toggle">Tg</span>,
  Bell: () => <span data-testid="icon-bell">Be</span>,
  AlertTriangle: () => <span data-testid="icon-alert">At</span>,
  Rocket: () => <span data-testid="icon-rocket">Rk</span>,
  TrendingUp: () => <span data-testid="icon-trending">Tr</span>,
  BarChart: () => <span data-testid="icon-barchart">Bc</span>,
  Wallet: () => <span data-testid="icon-wallet">Wl</span>,
  Webhook: () => <span data-testid="icon-webhook">Wh</span>,
  FileDigit: () => <span data-testid="icon-filedigit">Fd</span>,
  Mail: () => <span data-testid="icon-mail">Ml</span>,
  Zap: () => <span data-testid="icon-zap">Zp</span>,
  CreditCard: () => <span data-testid="icon-creditcard">Cc</span>,
  Star: () => <span data-testid="icon-star">Sr</span>,
  BookOpen: () => <span data-testid="icon-bookopen">Bo</span>,
  Lock: () => <span data-testid="icon-lock">Lk</span>,
  History: () => <span data-testid="icon-history">Hy</span>,
}));

describe('Sidebar', () => {
  it('renders brand section', async () => {
    render(<Sidebar />);
    expect(await screen.findByText('Demo Test')).toBeInTheDocument();
    expect(screen.getByText('Panel de gestión')).toBeInTheDocument();
  });

  it('renders navigation items from registry', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  it('renders always-visible items (Onboarding, Auditoría, Módulos)', () => {
    render(<Sidebar />);
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Auditoría')).toBeInTheDocument();
    expect(screen.getByText('Módulos')).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    render(<Sidebar />);
    const calendarioLink = screen.getByText('Calendario').closest('a');
    expect(calendarioLink).toHaveClass('bg-[#DAE2FD]');
  });
});
