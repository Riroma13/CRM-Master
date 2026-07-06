import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TabTareas } from '../TabTareas';
import { createMockTareas } from '@/test/factories';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
  },
}));

const mockClienteId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

describe('TabTareas', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<TabTareas clienteId={mockClienteId} />);
    expect(screen.getByText('Cargando tareas...')).toBeInTheDocument();
  });

  it('shows empty state when no tareas', async () => {
    mockGet.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay tareas con este filtro.'),
      ).toBeInTheDocument();
    });
  });

  it('renders tareas with titulo, prioridad, and estado', async () => {
    const tareas = createMockTareas();
    mockGet.mockResolvedValue(tareas);
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(screen.getByText('Revisar backup semanal')).toBeInTheDocument();
      expect(
        screen.getByText('Actualizar certificado SSL'),
      ).toBeInTheDocument();
    });

    // Prioridad badges
    expect(screen.getAllByText('Media').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Alta').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sistema name when present', async () => {
    const tareas = createMockTareas();
    mockGet.mockResolvedValue(tareas);
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });
  });

  it('renders fechaLimite when present', async () => {
    const tareas = createMockTareas();
    mockGet.mockResolvedValue(tareas);
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(screen.getByText(/Vence:/)).toBeInTheDocument();
    });
  });

  it('filters tareas by estado when dropdown changes', async () => {
    mockGet.mockResolvedValue(createMockTareas());
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(screen.getByText('Revisar backup semanal')).toBeInTheDocument();
    });

    const filter = screen.getByRole('combobox');
    fireEvent.change(filter, { target: { value: 'Pendiente' } });

    // API should be called with estado filter
    await waitFor(() => {
      // The mockGet was called with the path and params including estado
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toHaveProperty('estado', 'Pendiente');
    });
  });

  it('renders "Nuevo Evento" button', async () => {
    mockGet.mockResolvedValue(createMockTareas());
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /nuevo evento/i }),
      ).toBeInTheDocument();
    });
  });

  it('renderes Hecho tareas with line-through style', async () => {
    const tareas = createMockTareas();
    tareas.data[0].estado = 'Hecho';
    mockGet.mockResolvedValue(tareas);
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      const hechoItem = screen.getByText('Revisar backup semanal');
      expect(hechoItem.className).toContain('line-through');
    });
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    render(<TabTareas clienteId={mockClienteId} />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay tareas con este filtro.'),
      ).toBeInTheDocument();
    });
  });
});
