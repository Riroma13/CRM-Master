import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './sidebar';

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
}));

describe('Sidebar', () => {
  it('renders brand section', () => {
    render(<Sidebar />);
    expect(screen.getByText('Mi Portal')).toBeInTheDocument();
    expect(screen.getByText('Panel de gestión')).toBeInTheDocument();
  });

  it('renders navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Sistemas')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    render(<Sidebar />);
    const calendarioLink = screen.getByText('Calendario').closest('a');
    expect(calendarioLink).toHaveClass('bg-[#DAE2FD]');
  });
});
