import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSlots } from './use-slots';
import { api } from '@/lib/api';
import type { Slot } from '@/lib/api-types';

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

const mockSlots: Slot[] = [
  { start: '2026-07-05T09:00:00Z', end: '2026-07-05T09:30:00Z', available: true },
  { start: '2026-07-05T09:30:00Z', end: '2026-07-05T10:00:00Z', available: true },
  { start: '2026-07-05T10:00:00Z', end: '2026-07-05T10:30:00Z', available: false },
];

describe('useSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with no data', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSlots(new Date('2026-07-05')));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.slots).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('transitions to data state on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSlots);

    const { result } = renderHook(() => useSlots(new Date('2026-07-05')));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.slots).toEqual(mockSlots);
  });

  it('calls the correct endpoint with YYYY-MM-DD date format', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSlots);

    renderHook(() => useSlots(new Date('2026-07-05')));

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        '/api/v1/tenant/calendario/slots',
        { fecha: '2026-07-05' },
      );
    });
  });

  it('transitions to error state on failed fetch', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSlots(new Date('2026-07-05')));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.slots).toEqual([]);
  });

  it('refetch reloads data', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSlots);

    const { result } = renderHook(() => useSlots(new Date('2026-07-05')));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual(mockSlots);

    const newSlots: Slot[] = [
      { start: '2026-07-05T11:00:00Z', end: '2026-07-05T11:30:00Z', available: true },
    ];
    vi.mocked(api.get).mockResolvedValue(newSlots);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual(newSlots);
  });

  it('refetches when date changes', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSlots);

    const { result, rerender } = renderHook(
      (d: Date) => useSlots(d),
      { initialProps: new Date('2026-07-05') },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/slots',
      { fecha: '2026-07-05' },
    );

    vi.mocked(api.get).mockResolvedValue([]);

    rerender(new Date('2026-07-06'));

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/calendario/slots',
      { fecha: '2026-07-06' },
    );
  });

  it('returns empty slots when date is null', () => {
    const { result } = renderHook(() => useSlots(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.slots).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });
});
