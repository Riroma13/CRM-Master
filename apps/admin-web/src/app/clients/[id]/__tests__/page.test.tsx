import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ClientDetailPage from '../page';
import { createMockCliente } from '@/test/factories';

// ── Mock next/navigation ────────────────────────────────────────

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' }),
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock api ─────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

// ── Tests ────────────────────────────────────────────────────────

describe('ClientDetailPage — states (5.1) + integration (5.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('tab=resumen');
  });

  // ── 5.1: Loading state ─────────────────────────────────────

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ClientDetailPage />);
    expect(screen.getByText('Cargando cliente...')).toBeInTheDocument();
  });

  // ── 5.1: Error state ───────────────────────────────────────

  it('shows error message when API call fails', async () => {
    mockGet.mockRejectedValue(new Error('Error al cargar cliente'));
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar cliente')).toBeInTheDocument();
    });
  });

  it('shows "Cliente no encontrado" when client is null after error', async () => {
    mockGet.mockRejectedValue(new Error('Not found'));
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Volver a clientes'),
      ).toBeInTheDocument();
    });
  });

  // ── 5.1: Data state + 5.3: tab rendering ──────────────────

  it('renders client header with nombre on success', async () => {
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Asesoría García')).toBeInTheDocument();
    });
  });

  it('renders breadcrumb with client name', async () => {
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      const breadcrumb = screen.getByText(
        (content) =>
          content.includes('ASESORÍA') && content.includes('GARCÍA'),
      );
      expect(breadcrumb).toBeInTheDocument();
    });
  });

  it('renders ClientTabs navigation', async () => {
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /resumen/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sistemas/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /inventario/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /bitácora/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tareas/i })).toBeInTheDocument();
    });
  });

  // ── 5.3: Tab switching via URL ─────────────────────────────

  it('shows TabResumen content by default (tab=resumen)', async () => {
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      // TabResumen shows indicadores
      expect(screen.getByText('Sistemas')).toBeInTheDocument();
      expect(screen.getByText('Items Inventario')).toBeInTheDocument();
      expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
    });
  });

  it('shows TabSistemas when tab=sistemas', async () => {
    mockSearchParams = new URLSearchParams('tab=sistemas');
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('BeeHive producción'),
      ).toBeInTheDocument();
    });
  });

  it('shows TabInventario when tab=inventario', async () => {
    mockSearchParams = new URLSearchParams('tab=inventario');
    mockGet.mockResolvedValue(createMockCliente());
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('MÓDULO FUNCIONAL')).toBeInTheDocument();
    });
  });

  it('shows TabBitacora when tab=bitacora', async () => {
    mockSearchParams = new URLSearchParams('tab=bitacora');
    mockGet.mockResolvedValueOnce(createMockCliente()); // Page fetch
    mockGet.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    }); // TabBitacora fetch
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay eventos registrados para este cliente.'),
      ).toBeInTheDocument();
    });
  });

  it('shows TabTareas when tab=tareas', async () => {
    mockSearchParams = new URLSearchParams('tab=tareas');
    mockGet.mockResolvedValueOnce(createMockCliente()); // Page fetch
    mockGet.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    }); // TabTareas fetch
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay tareas con este filtro.'),
      ).toBeInTheDocument();
    });
  });

  // ── 5.3: Event creation flow ───────────────────────────────

  it('opens EventoForm when clicking "Nuevo Evento" on Tareas tab', async () => {
    mockSearchParams = new URLSearchParams('tab=tareas');
    mockGet.mockResolvedValueOnce(createMockCliente()); // Page fetch
    mockGet.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    }); // TabTareas fetch
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /nuevo evento/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /nuevo evento/i }));

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });
  });

  it('completes full event creation flow from Tareas tab', async () => {
    mockSearchParams = new URLSearchParams('tab=tareas');
    mockGet
      .mockResolvedValueOnce(createMockCliente()) // Page fetch
      .mockResolvedValueOnce({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }) // TabTareas fetch
      .mockResolvedValueOnce(createMockCliente()); // EventoForm sistemas fetch

    mockPost.mockResolvedValue({ id: 'new-evento' });

    render(<ClientDetailPage />);

    // Open form
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /nuevo evento/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /nuevo evento/i }));

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // Fill in titulo
    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, {
      target: { value: 'Evento desde test de integración' },
    });

    // Submit
    fireEvent.click(screen.getByText('Crear Evento'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/eventos'),
        expect.objectContaining({
          titulo: 'Evento desde test de integración',
        }),
      );
    });
  });

  // ── 5.3: Tab switching interaction ─────────────────────────

  it('navigates between tabs via URL changes', async () => {
    mockGet.mockResolvedValue(createMockCliente());
    const { rerender } = render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Sistemas')).toBeInTheDocument();
      expect(screen.getByText('Items Inventario')).toBeInTheDocument();
    });

    // Simulate URL change to sistemas
    mockSearchParams = new URLSearchParams('tab=sistemas');
    rerender(<ClientDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('BeeHive producción'),
      ).toBeInTheDocument();
    });
  });
});
