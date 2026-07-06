import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TabResumen } from '../TabResumen';
import { createMockCliente, createMockEventos } from '@/test/factories';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
  },
}));

describe('TabResumen', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('shows loading state for eventos initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // Never resolves
    const cliente = createMockCliente();
    render(<TabResumen cliente={cliente} />);
    expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
  });

  it('shows empty state when no eventos', async () => {
    mockGet.mockResolvedValue({ data: [] });
    const cliente = createMockCliente();
    render(<TabResumen cliente={cliente} />);

    await waitFor(() => {
      expect(screen.getByText('Sin eventos recientes.')).toBeInTheDocument();
    });
  });

  it('shows eventos when data is loaded', async () => {
    const eventos = createMockEventos();
    mockGet.mockResolvedValue(eventos);
    const cliente = createMockCliente();
    render(<TabResumen cliente={cliente} />);

    await waitFor(() => {
      expect(
        screen.getByText('Migrar a PostgreSQL 16'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Error en módulo de reportes'),
      ).toBeInTheDocument();
    });
  });

  it('shows indicadores cards with correct values', () => {
    mockGet.mockResolvedValue({ data: [] });
    const cliente = createMockCliente({
      sistemas: [
        {
          ...createMockCliente().sistemas[0],
          items: [
            { id: 'i1', categoria: 'Módulo', nombre: 'Item A', estado: 'Implementado', responsable: null },
            { id: 'i2', categoria: 'Módulo', nombre: 'Item B', estado: 'Parcial', responsable: null },
          ],
        },
      ],
    });
    render(<TabResumen cliente={cliente} />);

    expect(screen.getByText('Sistemas')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // sistemas count
    expect(screen.getByText('Items Inventario')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // items count
    expect(screen.getByText('Tareas Pendientes')).toBeInTheDocument();
  });

  it('shows notas generales section when cliente has notasGenerales', () => {
    mockGet.mockResolvedValue({ data: [] });
    const cliente = createMockCliente({
      notasGenerales: 'Nota de prueba del cliente',
    });
    render(<TabResumen cliente={cliente} />);

    expect(screen.getByText('Notas Generales')).toBeInTheDocument();
    expect(screen.getByText('Nota de prueba del cliente')).toBeInTheDocument();
  });

  it('hides notas generales section when empty', () => {
    mockGet.mockResolvedValue({ data: [] });
    const cliente = createMockCliente({ notasGenerales: null });
    render(<TabResumen cliente={cliente} />);

    expect(screen.queryByText('Notas Generales')).not.toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    const cliente = createMockCliente();
    render(<TabResumen cliente={cliente} />);

    await waitFor(() => {
      expect(screen.getByText('Sin eventos recientes.')).toBeInTheDocument();
    });
  });
});
