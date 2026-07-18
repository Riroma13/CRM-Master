import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { TenantDashboardResponse } from '@/lib/api-types';

interface UseDashboardReturn {
  data: TenantDashboardResponse | null;
  isLoading: boolean;
  loading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<TenantDashboardResponse>(
        '/api/v1/tenant/dashboard',
        undefined,
        { auth: true },
      );
      if (id === fetchIdRef.current) {
        setData(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const refetch = useCallback(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { data, isLoading, loading: isLoading, isError, error, refetch };
}
