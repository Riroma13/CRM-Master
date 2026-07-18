import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboard } from './use-dashboard';
import { api } from '@/lib/api';
import type { TenantDashboardResponse } from '@/lib/api-types';

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

const mockDashboardResponse: TenantDashboardResponse = {
  totalClientes: 15,
  clientesActivos: 12,
  citasHoy: 3,
  citasPendientes: 8,
  citasSemana: 20,
  tareasPendientes: 7,
  sistemasActivos: 5,
  eventosRecientes: [
    { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1' },
  ],
  ultimosEventos: [
    { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1' },
  ],
  ultimaActualizacion: '2026-07-18T12:00:00Z',
  onboardingChecklist: {
    steps: [
      { id: 'cliente', label: 'Primer cliente', done: true },
      { id: 'tarea', label: 'Primera tarea', done: false },
    ],
  },
};

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('fetches dashboard with auth on mount', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDashboardResponse);

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/dashboard',
      undefined,
      { auth: true },
    );
    expect(result.current.data).toEqual(mockDashboardResponse);
  });

  it('enters error state on failed fetch and refetch recovers', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();

    vi.mocked(api.get).mockResolvedValueOnce(mockDashboardResponse);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockDashboardResponse);
  });

  it('exposes loading alias equal to isLoading', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDashboardResponse);

    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(result.current.isLoading);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loading).toBe(result.current.isLoading);
  });
});
