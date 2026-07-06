import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsBar } from './metrics-bar';

vi.mock('@/hooks/use-dashboard-metrics', () => ({
  useDashboardMetrics: vi.fn(),
}));

import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';

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

describe('MetricsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons', () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<MetricsBar />);

    // Should render 4 skeleton placeholders
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4);
  });

  it('renders KPI cards with live data', () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: mockMetricsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MetricsBar />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const refetch = vi.fn();
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('API error'),
      refetch,
    });

    render(<MetricsBar />);

    expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Click retry
    screen.getByText('Retry').click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders zeroes for empty data', () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        metrics: {
          totalClientes: 0,
          activos: 0,
          conIncidencias: 0,
          criticos: 0,
          tareasPendientesGlobales: 0,
          tenantsActivos: 0,
        },
        ultimaActualizacion: '2025-01-01T00:00:00Z',
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<MetricsBar />);

    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBeGreaterThanOrEqual(4);
  });
});
