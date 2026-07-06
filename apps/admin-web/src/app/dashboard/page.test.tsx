import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import type { ClientFilters, ClienteListItem, PaginationMeta } from '@/lib/api-types';

vi.mock('@/hooks/use-dashboard-metrics', () => ({
  useDashboardMetrics: vi.fn(),
}));

vi.mock('@/hooks/use-clients', () => ({
  useClients: vi.fn(),
}));

import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { useClients } from '@/hooks/use-clients';

const mockMetricsData = {
  metrics: {
    totalClientes: 10,
    activos: 8,
    conIncidencias: 2,
    criticos: 1,
    tareasPendientesGlobales: 15,
    tenantsActivos: 3,
  },
  ultimaActualizacion: '2025-01-01T00:00:00Z',
};

const mockClients: ClienteListItem[] = [
  {
    id: '1',
    nombre: 'García Consulting',
    tenant: { id: 't1', slug: 'garcia', name: 'García LLC' },
    saludGeneral: '🟢',
    estadoRelacion: 'Activo',
    tags: ['fiscal'],
    sistemas: [{ id: 's1', nombreSistema: 'ERP', tipo: 'cloud', estadoTecnico: 'Ok' }],
    ultimaActividad: '2025-01-15T10:00:00Z',
    tareasPendientes: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    nombre: 'Apex Media',
    tenant: { id: 't2', slug: 'apex', name: 'Apex Inc' },
    saludGeneral: '🔴',
    estadoRelacion: 'Activo',
    tags: ['tech'],
    sistemas: [{ id: 's2', nombreSistema: 'CMS', tipo: 'cloud', estadoTecnico: 'Warning' }],
    ultimaActividad: '2025-01-14T10:00:00Z',
    tareasPendientes: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const mockPagination: PaginationMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };

describe('DashboardPage (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: mockMetricsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useClients).mockReturnValue({
      data: mockClients,
      pagination: mockPagination,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders full dashboard with metrics and client grid', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Mapa de Clientes')).toBeInTheDocument();

    // Metrics values (use getAllByText for values that may appear in both metrics and client cards)
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    // Client cards
    expect(screen.getByText('García Consulting')).toBeInTheDocument();
    expect(screen.getByText('Apex Media')).toBeInTheDocument();
  });

  it('shows loading skeletons when metrics are loading', () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DashboardPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('shows error banner when metrics fail', () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch: vi.fn(),
    });

    render(<DashboardPage />);
    expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
  });

  it('shows loading skeletons when clients are loading', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<DashboardPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('health filter chip changes filter', () => {
    // Track what filters the hook receives
    let lastFilters: ClientFilters = { page: 1, limit: 20 };
    vi.mocked(useClients).mockImplementation((filters: ClientFilters) => {
      lastFilters = filters;
      return {
        data: mockClients,
        pagination: mockPagination,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    });

    render(<DashboardPage />);
    fireEvent.click(screen.getByText('🔴 Crítica'));

    expect(lastFilters).toMatchObject({ salud: '🔴', page: 1 });
  });

  it('renders pagination when multiple pages', () => {
    const multiPagePagination: PaginationMeta = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    };

    vi.mocked(useClients).mockReturnValue({
      data: mockClients,
      pagination: multiPagePagination,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });
});
