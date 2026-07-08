import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarLayout } from './sidebar-layout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/clientes',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock the Sidebar component
vi.mock('./sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Menu: () => <span data-testid="icon-menu">Menu</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Bell: () => <span data-testid="icon-bell">Bell</span>,
  ChevronRight: () => <span data-testid="icon-chevron">&gt;</span>,
}));

// Mock notification bell hook
vi.mock('@/hooks/use-notificaciones', () => ({
  useNotificaciones: () => ({ notificaciones: [], noLeidas: 0, refetch: vi.fn(), isLoading: false }),
}));

// Mock toast
vi.mock('@/components/ui/toast', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({ toast: vi.fn() }),
}));

describe('SidebarLayout', () => {
  it('renders sidebar (desktop + drawer) and children', () => {
    render(
      <SidebarLayout>
        <div data-testid="content">Main Content</div>
      </SidebarLayout>,
    );

    // Sidebar is rendered twice: desktop sidebar + mobile drawer sidebar
    const sidebars = screen.getAllByTestId('sidebar');
    expect(sidebars).toHaveLength(2);
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });

  it('renders mobile hamburger button', () => {
    render(
      <SidebarLayout>
        <div>Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByLabelText('Abrir menú')).toBeInTheDocument();
  });

  it('opens drawer when hamburger is clicked', () => {
    render(
      <SidebarLayout>
        <div>Content</div>
      </SidebarLayout>,
    );

    // No overlay before opening
    expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();

    const hamburger = screen.getByLabelText('Abrir menú');
    fireEvent.click(hamburger);

    // Sidebar is rendered twice: desktop + mobile drawer
    const sidebars = screen.getAllByTestId('sidebar');
    expect(sidebars).toHaveLength(2);
    // Overlay should appear
    expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();
  });

  it('closes drawer when overlay is clicked', () => {
    render(
      <SidebarLayout>
        <div>Content</div>
      </SidebarLayout>,
    );

    // Open drawer
    fireEvent.click(screen.getByLabelText('Abrir menú'));
    expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

    // Close drawer by clicking overlay
    fireEvent.click(screen.getByTestId('drawer-overlay'));
    expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
  });
});
