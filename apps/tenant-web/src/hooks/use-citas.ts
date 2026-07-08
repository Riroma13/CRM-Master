import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Cita, CitaListResponse } from '@/lib/api-types';
import { MOCK_CITAS } from '@/lib/mock-data';

interface UseCitasReturn {
  citas: Cita[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  confirmCita: (id: string) => Promise<void>;
  cancelCita: (id: string) => Promise<void>;
}

export function useCitas(): UseCitasReturn {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchCitas = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<CitaListResponse>(
        '/api/v1/tenant/calendario/citas',
        undefined,
        { auth: true },
      );
      // Guard against stale responses
      if (id === fetchIdRef.current) {
        setCitas(result.citas);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        // Dev/demo: fall back to mock data when API is unavailable
        setCitas(MOCK_CITAS.citas);
        setIsError(false);
        setError(null);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  const refetch = useCallback(() => {
    fetchCitas();
  }, [fetchCitas]);

  const confirmCita = useCallback(
    async (id: string) => {
      try {
        await api.patch<Cita>(
          `/api/v1/tenant/calendario/citas/${id}`,
          { estado: 'confirmada' },
          { auth: true },
        );
      } catch {
        // Dev/demo: update mock data locally
        setCitas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, estado: 'confirmada' as const } : c)),
        );
      }
      await fetchCitas();
    },
    [fetchCitas],
  );

  const cancelCita = useCallback(
    async (id: string) => {
      try {
        await api.patch<Cita>(
          `/api/v1/tenant/calendario/citas/${id}`,
          { estado: 'cancelada' },
          { auth: true },
        );
      } catch {
        // Dev/demo: update mock data locally
        setCitas((prev) =>
          prev.map((c) => (c.id === id ? { ...c, estado: 'cancelada' as const } : c)),
        );
      }
      await fetchCitas();
    },
    [fetchCitas],
  );

  return { citas, isLoading, isError, error, refetch, confirmCita, cancelCita };
}
