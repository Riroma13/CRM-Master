import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarLayout } from './sidebar-layout';

// Mock the Sidebar component
vi.mock('./sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Menu: () => <span data-testid="icon-menu">Menu</span>,
  X: () => <span data-testid="icon-x">X</span>,
}));

describe('SidebarLayout', () => {
  it('renders sidebar and children', () => {
    render(
      <SidebarLayout>
        <div data-testid="content">Main Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
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
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();

    const hamburger = screen.getByLabelText('Abrir menú');
    fireEvent.click(hamburger);

    // Sidebar is rendered twice: desktop + mobile drawer
    const sidebars = screen.getAllByTestId('sidebar');
    expect(sidebars).toHaveLength(2);
    // Overlay should appear
    expect(screen.getByRole('presentation')).toBeInTheDocument();
  });

  it('closes drawer when overlay is clicked', () => {
    render(
      <SidebarLayout>
        <div>Content</div>
      </SidebarLayout>,
    );

    // Open drawer
    fireEvent.click(screen.getByLabelText('Abrir menú'));
    expect(screen.getByRole('presentation')).toBeInTheDocument();

    // Close drawer by clicking overlay
    fireEvent.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });
});
