import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { DisponibilidadConfig } from '@/lib/api-types';

interface UseDisponibilidadReturn {
  config: DisponibilidadConfig | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  updateConfig: (data: DisponibilidadConfig) => Promise<void>;
}

export function useDisponibilidad(): UseDisponibilidadReturn {
  const [config, setConfig] = useState<DisponibilidadConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchConfig = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<DisponibilidadConfig>(
        '/api/v1/tenant/calendario/disponibilidad',
        undefined,
        { auth: true },
      );
      if (id === fetchIdRef.current) {
        setConfig(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setConfig(null);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const refetch = useCallback(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(
    async (data: DisponibilidadConfig) => {
      await api.put<DisponibilidadConfig>(
        '/api/v1/tenant/calendario/disponibilidad',
        data,
        { auth: true },
      );
      await fetchConfig();
    },
    [fetchConfig],
  );

  return { config, isLoading, isError, error, refetch, updateConfig };
}
