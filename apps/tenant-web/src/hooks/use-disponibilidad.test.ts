import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDisponibilidad } from './use-disponibilidad';
import { api } from '@/lib/api';
import type { DisponibilidadConfig } from '@/lib/api-types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
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

const mockConfig: DisponibilidadConfig = {
  timezone: 'Europe/Madrid',
  slotDuration: 30,
  minNotice: 240,
  maxDays: 30,
  dailySchedule: [
    { day: 1, start: '09:00', end: '14:00' },
    { day: 1, start: '16:00', end: '19:00' },
  ],
  blockedDates: ['2026-08-15', '2026-12-25'],
};

describe('useDisponibilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDisponibilidad());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.config).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('fetches config with auth on mount', async () => {
    vi.mocked(api.get).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/disponibilidad',
      undefined,
      { auth: true },
    );
    expect(result.current.config).toEqual(mockConfig);
  });

  it('falls back to mock data on failed fetch', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Dev/demo: shows mock data instead of error
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.config).not.toBeNull();
  });

  it('updateConfig puts and refetches', async () => {
    vi.mocked(api.get).mockResolvedValue(mockConfig);
    vi.mocked(api.put).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatedConfig = { ...mockConfig, slotDuration: 60 };

    await act(async () => {
      await result.current.updateConfig(updatedConfig);
    });

    expect(vi.mocked(api.put)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/disponibilidad',
      updatedConfig,
      { auth: true },
    );
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('refetch reloads config', async () => {
    vi.mocked(api.get).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useDisponibilidad());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);

    vi.mocked(api.get).mockResolvedValue(null);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });
});
