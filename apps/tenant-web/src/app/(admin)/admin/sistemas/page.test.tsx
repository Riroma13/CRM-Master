import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SistemasPage from './page';
import { useSistemas } from '@/hooks/use-sistemas';

vi.mock('@/hooks/use-sistemas', () => ({ useSistemas: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/forms/sistema-form', () => ({ SistemaForm: () => null }));
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('SistemasPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders live systems as keyboard-accessible row links', () => {
    vi.mocked(useSistemas).mockReturnValue({
      sistemas: [{ id: 'sys-1', nombreSistema: 'ERP', tipo: 'SaaS', estadoTecnico: '🟢', cliente: { id: 'c-1', nombre: 'Acme' }, _count: { items: 2 } }],
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    });

    render(<SistemasPage />);

    expect(screen.getByRole('heading', { name: 'Systems' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'ERP' })[0]).toHaveAttribute('href', '/admin/sistemas/sys-1');
    expect(screen.getAllByText('Acme')).toHaveLength(2);
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('renders loading, empty, and retryable error states', () => {
    vi.mocked(useSistemas).mockReturnValue({ sistemas: [], isLoading: true, isError: false, error: null, refetch: vi.fn() });
    const { rerender } = render(<SistemasPage />);
    expect(screen.getByRole('status', { name: 'Loading systems' })).toBeInTheDocument();

    vi.mocked(useSistemas).mockReturnValue({ sistemas: [], isLoading: false, isError: false, error: null, refetch: vi.fn() });
    rerender(<SistemasPage />);
    expect(screen.getByRole('status')).toHaveTextContent('No systems yet');

    const retry = vi.fn();
    vi.mocked(useSistemas).mockReturnValue({ sistemas: [], isLoading: false, isError: true, error: new Error('secret'), refetch: retry });
    rerender(<SistemasPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
