import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TabBitacora } from '../TabBitacora';
import { createMockEventos } from '@/test/factories';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
  },
}));

const mockClienteId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

describe('TabBitacora', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<TabBitacora clienteId={mockClienteId} />);
    expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
  });

  it('shows empty state when no eventos', async () => {
    mockGet.mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay eventos registrados para este cliente.'),
      ).toBeInTheDocument();
    });
  });

  it('renders eventos with titulo, tipo, and fecha', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue(eventos);
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('Migrar a PostgreSQL 16'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Error en módulo de reportes'),
      ).toBeInTheDocument();
    });

    // Tipo badges
    expect(screen.getAllByText('Decisión').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Incidencia').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sistema name for each evento', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue(eventos);
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('BeeHive producción'),
      ).toBeInTheDocument();
    });
  });

  it('renders descripcion and siguienteAccion when present', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue(eventos);
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('Se acordó migrar la base de datos'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Programar ventana de mantenimiento'),
      ).toBeInTheDocument();
    });
  });

  it('shows load more button when there are more pages', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue({
      ...eventos,
      pagination: { ...eventos.pagination, totalPages: 3, total: 25 },
    });
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /cargar más/i }),
      ).toBeInTheDocument();
    });
  });

  it('does not show load more when on last page', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue({
      ...eventos,
      pagination: { ...eventos.pagination, totalPages: 1, total: 2 },
    });
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /cargar más/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('loads more eventos when clicking load more', async () => {
    const page1 = {
      data: [
        { id: 'e-1', fecha: '2026-06-30T10:00:00.000Z', tipo: 'Decisión', titulo: 'Evento 1', descripcion: null, siguienteAccion: null, sistema: { id: 'sys-1', nombreSistema: 'Sistema' } },
      ],
      pagination: { page: 1, limit: 10, total: 15, totalPages: 2 },
    };
    const page2 = {
      data: [
        { id: 'e-2', fecha: '2026-06-28T10:00:00.000Z', tipo: 'Revisión', titulo: 'Evento 2', descripcion: null, siguienteAccion: null, sistema: { id: 'sys-1', nombreSistema: 'Sistema' } },
      ],
      pagination: { page: 2, limit: 10, total: 15, totalPages: 2 },
    };

    mockGet.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(screen.getByText('Evento 1')).toBeInTheDocument();
    });

    const loadMore = screen.getByRole('button', { name: /cargar más/i });
    fireEvent.click(loadMore);

    await waitFor(() => {
      expect(screen.getByText('Evento 2')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cargar más/i })).not.toBeInTheDocument();
    });
  });

  it('handles fetch error silently', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    render(<TabBitacora clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay eventos registrados para este cliente.'),
      ).toBeInTheDocument();
    });
  });
});
