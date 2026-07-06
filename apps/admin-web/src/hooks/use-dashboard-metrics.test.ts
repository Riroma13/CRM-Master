import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardMetrics } from './use-dashboard-metrics';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  },
  NetworkError: class NetworkError extends Error {
    cause: unknown;
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'NetworkError';
      this.cause = cause;
    }
  },
}));

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

describe('useDashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with no data', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboardMetrics());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('transitions to data state on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValue(mockMetricsData);

    const { result } = renderHook(() => useDashboardMetrics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockMetricsData);
  });

  it('transitions to error state on failed fetch', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDashboardMetrics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('refetch reloads data', async () => {
    vi.mocked(api.get).mockResolvedValue(mockMetricsData);

    const { result } = renderHook(() => useDashboardMetrics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockMetricsData);

    // Setup new data for refetch
    vi.mocked(api.get).mockResolvedValue({
      ...mockMetricsData,
      metrics: { ...mockMetricsData.metrics, totalClientes: 20 },
    });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.metrics.totalClientes).toBe(20);
  });

  it('handles error on refetch', async () => {
    vi.mocked(api.get).mockResolvedValue(mockMetricsData);

    const { result } = renderHook(() => useDashboardMetrics());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockMetricsData);

    // Refetch fails
    vi.mocked(api.get).mockRejectedValue(new Error('Refetch error'));

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Refetch error');
    // Data should persist from previous successful fetch (no flash of empty state)
    expect(result.current.data).toEqual(mockMetricsData);
  });
});
