import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCitas } from './use-citas';
import { api } from '@/lib/api';
import type { Cita, CitaListResponse } from '@/lib/api-types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
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

const mockCitas: Cita[] = [
  {
    id: '1',
    tenantId: 't1',
    fecha: '2026-07-05T10:00:00Z',
    duracion: 30,
    estado: 'pendiente',
    titulo: 'Consulta',
    clienteNombre: 'Juan Pérez',
    clienteEmail: 'juan@email.com',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
  {
    id: '2',
    tenantId: 't1',
    fecha: '2026-07-06T11:00:00Z',
    duracion: 30,
    estado: 'confirmada',
    titulo: 'Revisión',
    clienteNombre: 'María López',
    clienteEmail: 'maria@email.com',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
];

const mockResponse: CitaListResponse = { citas: mockCitas, total: 2 };

describe('useCitas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCitas());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.citas).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('fetches citas with auth on mount', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCitas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/citas',
      undefined,
      { auth: true },
    );
    expect(result.current.citas).toEqual(mockCitas);
  });

  it('transitions to error state on failed fetch', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCitas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.citas).toEqual([]);
  });

  it('confirmCita patches and refetches', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse);
    vi.mocked(api.patch).mockResolvedValue({} as Cita);

    const { result } = renderHook(() => useCitas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.confirmCita('1');
    });

    expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/citas/1',
      { estado: 'confirmada' },
      { auth: true },
    );
    // Should refetch after confirm
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('cancelCita patches and refetches', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse);
    vi.mocked(api.patch).mockResolvedValue({} as Cita);

    const { result } = renderHook(() => useCitas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.cancelCita('2');
    });

    expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/citas/2',
      { estado: 'cancelada' },
      { auth: true },
    );
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('refetch reloads citas', async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCitas());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);

    vi.mocked(api.get).mockResolvedValue({ citas: [], total: 0 });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    expect(result.current.citas).toEqual([]);
  });
});
