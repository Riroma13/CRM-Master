import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClients } from './use-clients';
import { api } from '@/lib/api';
import type { ClientFilters, ClientListResponse } from '@/lib/api-types';

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

const mockClientListResponse: ClientListResponse = {
  data: [
    {
      id: '1',
      nombre: 'Test Client',
      tenant: { id: 't1', slug: 'test-tenant', name: 'Test Tenant' },
      saludGeneral: '🟢',
      estadoRelacion: 'Activo',
      tags: ['fiscal'],
      sistemas: [{ id: 's1', nombreSistema: 'ERP', tipo: 'cloud', estadoTecnico: 'Ok' }],
      ultimaActividad: '2025-01-15T10:00:00Z',
      tareasPendientes: 3,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('useClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with no data', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useClients({ page: 1, limit: 20 }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('transitions to data state on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValue(mockClientListResponse);

    const { result } = renderHook(() => useClients({ page: 1, limit: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockClientListResponse.data);
    expect(result.current.pagination).toEqual(mockClientListResponse.pagination);
  });

  it('transitions to error state on failed fetch', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Failed to load clients'));

    const { result } = renderHook(() => useClients({ page: 1, limit: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Failed to load clients');
    expect(result.current.data).toEqual([]);
  });

  it('re-fetches when filters change', async () => {
    vi.mocked(api.get).mockResolvedValue(mockClientListResponse);

    const { result, rerender } = renderHook(
      (filters: ClientFilters) => useClients(filters),
      { initialProps: { page: 1, limit: 20 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);

    // Change filter — should trigger refetch
    vi.mocked(api.get).mockResolvedValue({
      ...mockClientListResponse,
      pagination: { ...mockClientListResponse.pagination, page: 2 },
    });

    rerender({ page: 2, limit: 20, search: 'test' });

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    });

    // Verify the API was called with the new filters (page reset to 1)
    const secondCall = vi.mocked(api.get).mock.calls[1];
    expect(secondCall[0]).toBe('/api/v1/admin/clientes');
    expect(secondCall[1]).toMatchObject({ page: 1, search: 'test' });
  });

  it('resets page to 1 when non-page filter changes', async () => {
    vi.mocked(api.get).mockResolvedValue(mockClientListResponse);

    const { result, rerender } = renderHook(
      (filters: ClientFilters) => useClients(filters),
      { initialProps: { page: 3, limit: 20 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Change search filter while on page 3
    rerender({ page: 3, limit: 20, search: 'test' });

    await waitFor(() => {
      const lastCall = vi.mocked(api.get).mock.calls[
        vi.mocked(api.get).mock.calls.length - 1
      ];
      expect(lastCall[1]).toMatchObject({ page: 1, search: 'test' });
    });
  });

  it('refetch re-fetches with current filters', async () => {
    vi.mocked(api.get).mockResolvedValue(mockClientListResponse);

    const { result } = renderHook(() => useClients({ page: 1, limit: 20, search: 'test' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);

    vi.mocked(api.get).mockResolvedValue(mockClientListResponse);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    });

    const lastCall = vi.mocked(api.get).mock.calls[
      vi.mocked(api.get).mock.calls.length - 1
    ];
    expect(lastCall[1]).toMatchObject({ page: 1, search: 'test' });
  });
});
