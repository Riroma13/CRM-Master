import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientTabs } from '../ClientTabs';

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/clients/test-id',
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
}));

describe('ClientTabs', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it('renders all 5 tabs', () => {
    render(<ClientTabs />);
    expect(screen.getByRole('tab', { name: /resumen/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sistemas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /inventario/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /bitácora/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tareas/i })).toBeInTheDocument();
  });

  it('shows Resumen as active by default', () => {
    render(<ClientTabs />);
    const resumenTab = screen.getByRole('tab', { name: /resumen/i });
    expect(resumenTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows Sistemas as active when tab=sistemas in URL', () => {
    mockSearchParams = new URLSearchParams('tab=sistemas');

    render(<ClientTabs />);
    const sistemasTab = screen.getByRole('tab', { name: /sistemas/i });
    const resumenTab = screen.getByRole('tab', { name: /resumen/i });
    expect(sistemasTab).toHaveAttribute('aria-selected', 'true');
    expect(resumenTab).toHaveAttribute('aria-selected', 'false');
  });

  it('generates correct href for each tab', () => {
    render(<ClientTabs />);
    const resumenLink = screen.getByRole('tab', { name: /resumen/i });
    expect(resumenLink).toHaveAttribute('href', '/clients/test-id?tab=resumen');
  });
});
